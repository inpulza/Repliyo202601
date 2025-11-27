import { storage } from "../storage";
import { MetricoolService } from "./metricool";
import { log } from "../app";

class SyncService {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 120 * 1000; // 2 minutes
  private readonly DELAY_BETWEEN_BRANDS_MS = 2000; // 2 seconds jitter
  private readonly COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown for 429
  private brandCooldowns: Map<string, Date> = new Map();
  private lastSyncTime: Date | null = null;
  private isSyncing = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      log("[SyncService] Already running, skipping start", "sync");
      return;
    }

    this.isRunning = true;
    log("[SyncService] Starting automatic sync service (interval: 2 minutes)", "sync");

    await this.syncAllBrands();

    this.syncInterval = setInterval(async () => {
      await this.syncAllBrands();
    }, this.SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    log("[SyncService] Stopped", "sync");
  }

  async syncAllBrands(): Promise<{ success: boolean; brandsSynced: number; errors: string[] }> {
    if (this.isSyncing) {
      log("[SyncService] Sync already in progress, skipping", "sync");
      return { success: false, brandsSynced: 0, errors: ["Sync already in progress"] };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let brandsSynced = 0;

    try {
      log("[SyncService] Starting sync cycle...", "sync");

      const brands = await storage.getBrands();
      
      if (brands.length === 0) {
        log("[SyncService] No brands found to sync", "sync");
        this.lastSyncTime = new Date();
        return { success: true, brandsSynced: 0, errors: [] };
      }

      log(`[SyncService] Found ${brands.length} brands to sync`, "sync");

      for (const brand of brands) {
        if (!brand.metricoolToken || !brand.metricoolBlogId) {
          log(`[SyncService] Brand ${brand.name} missing credentials, skipping`, "sync");
          continue;
        }

        if (this.isInCooldown(brand.id)) {
          log(`[SyncService] Brand ${brand.name} in cooldown, skipping`, "sync");
          continue;
        }

        try {
          await this.syncBrand(
            brand.id, 
            brand.name, 
            brand.metricoolToken, 
            brand.metricoolBlogId, 
            brand.metricoolUserId
          );
          brandsSynced++;
        } catch (error: any) {
          const errorMsg = `Brand ${brand.name}: ${error.message}`;
          errors.push(errorMsg);
          
          if (error.message?.includes("429") || error.status === 429) {
            this.setCooldown(brand.id);
            log(`[SyncService] Rate limited for ${brand.name}, setting 5 min cooldown`, "sync");
          }
        }

        await this.delay(this.DELAY_BETWEEN_BRANDS_MS);
      }

      this.lastSyncTime = new Date();
      log(`[SyncService] Sync cycle complete. Synced ${brandsSynced}/${brands.length} brands`, "sync");

      return { success: true, brandsSynced, errors };
    } catch (error: any) {
      log(`[SyncService] Fatal error during sync: ${error.message}`, "sync");
      return { success: false, brandsSynced, errors: [error.message] };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncBrand(
    brandId: string,
    brandName: string,
    token: string,
    blogId: string,
    userId: string
  ): Promise<number> {
    log(`[SyncService] Syncing brand: ${brandName}`, "sync");

    const metricoolService = new MetricoolService({
      userToken: token,
      userId: userId
    });
    
    const inboxData = await metricoolService.getAllInboxData(blogId);

    let savedCount = 0;

    for (const conversation of inboxData.conversations) {
      const rawConv = conversation as any;
      const lastMessage = rawConv.messages?.[0];
      if (!lastMessage) continue;

      let author = "Unknown";
      let avatar = "";
      const fromId = lastMessage.from;

      if (rawConv.participants) {
        const participant = rawConv.participants.find((p: any) => p.id === fromId);
        if (participant) {
          author = participant.name || "Unknown";
          avatar = participant.imageProfileUrl || "";
        }
      }

      const messageData = {
        brandId,
        platform: this.normalizePlatform(rawConv.provider || "unknown"),
        type: "conversation" as const,
        author,
        authorAvatar: avatar || null,
        content: lastMessage.text || "",
        timestamp: new Date(lastMessage.createdTime || rawConv.creationDate || Date.now()),
        status: "unread" as const,
        urgency: null,
        intent: null,
        sentiment: null,
        aiSummary: null,
        draftResponse: null,
        sourceUrl: null,
        contextType: null,
        crmData: null,
        metricoolId: rawConv.id || null,
        rawData: rawConv,
      };

      await storage.upsertMessage(messageData);
      savedCount++;
    }

    for (const comment of inboxData.comments) {
      const rawComment = comment as any;
      let author = "Unknown";
      let avatar = "";
      let content = "";
      let timestamp = new Date();
      let sourceUrl = "";

      if (rawComment.participants && rawComment.participants.length > 0) {
        const ownerId = rawComment.root?.owner;
        let participant = rawComment.participants[0];
        
        if (ownerId && rawComment.participants.length > 1) {
          const found = rawComment.participants.find((p: any) => p.id === ownerId);
          if (found) participant = found;
        }
        
        author = participant.name || "Unknown";
        avatar = participant.imageProfileUrl || "";
      }

      if (rawComment.root) {
        content = rawComment.root.text || "";
        timestamp = new Date(rawComment.root.creationDate || rawComment.creationDate || Date.now());
        sourceUrl = rawComment.root.element?.link || rawComment.root.properties?.permalink || "";
      }

      const messageData = {
        brandId,
        platform: this.normalizePlatform(rawComment.provider || "unknown"),
        type: "comment" as const,
        author,
        authorAvatar: avatar || null,
        content,
        timestamp,
        status: "unread" as const,
        urgency: null,
        intent: null,
        sentiment: null,
        aiSummary: null,
        draftResponse: null,
        sourceUrl: sourceUrl || null,
        contextType: null,
        crmData: null,
        metricoolId: rawComment.id || null,
        rawData: rawComment,
      };

      await storage.upsertMessage(messageData);
      savedCount++;
    }

    log(`[SyncService] Brand ${brandName}: saved ${savedCount} messages`, "sync");
    return savedCount;
  }

  private normalizePlatform(provider: string): string {
    const normalized = provider.toLowerCase();
    const platformMap: Record<string, string> = {
      'tiktokbusiness': 'tiktok',
      'gmb': 'google-business',
      'google_business': 'google-business',
    };
    return platformMap[normalized] || normalized;
  }

  private isInCooldown(brandId: string): boolean {
    const cooldownUntil = this.brandCooldowns.get(brandId);
    if (!cooldownUntil) return false;
    
    if (new Date() > cooldownUntil) {
      this.brandCooldowns.delete(brandId);
      return false;
    }
    
    return true;
  }

  private setCooldown(brandId: string): void {
    const cooldownUntil = new Date(Date.now() + this.COOLDOWN_DURATION_MS);
    this.brandCooldowns.set(brandId, cooldownUntil);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): {
    isRunning: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    cooldownBrands: { brandId: string; cooldownUntil: Date }[];
  } {
    const cooldownBrands: { brandId: string; cooldownUntil: Date }[] = [];
    this.brandCooldowns.forEach((cooldownUntil, brandId) => {
      if (new Date() < cooldownUntil) {
        cooldownBrands.push({ brandId, cooldownUntil });
      }
    });

    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      cooldownBrands,
    };
  }

  async triggerManualSync(): Promise<{ success: boolean; brandsSynced: number; errors: string[] }> {
    log("[SyncService] Manual sync triggered", "sync");
    return this.syncAllBrands();
  }
}

export const syncService = new SyncService();
