import { storage } from "../storage";
import { MetricoolService, createMetricoolService } from "./metricool";
import { websocketService } from "./websocketService";
import { autoReplyService } from "./autoReplyService";
import { transcriptionService } from "./transcriptionService";
import { crmTrafficController } from "./crmTrafficController";
import { contactEnrichmentService } from "./contactEnrichmentService";
import { llmEnrichmentService } from "./llmEnrichmentService";
import { conversationLifecycleService } from "./conversationLifecycleService";
import { thankYouDetector } from "./thankYouDetector";
import { log } from "../app";

interface BrandSyncResult {
  newBrands: string[];
  disconnectedBrands: string[];
  totalAvailable: number;
}

class SyncService {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private brandSyncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 120 * 1000; // 2 minutes
  private readonly BRAND_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
  private readonly DELAY_BETWEEN_BRANDS_MS = 2000; // 2 seconds jitter
  private readonly COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown for 429
  private brandCooldowns: Map<string, Date> = new Map();
  private lastSyncTime: Date | null = null;
  private lastBrandSyncTime: Date | null = null;
  private isSyncing = false;
  private isSyncingBrands = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      log("[SyncService] Already running, skipping start", "sync");
      return;
    }

    this.isRunning = true;
    log("[SyncService] Starting automatic sync service (messages: 2 min, brands: 12 hours)", "sync");

    await this.syncAllBrands();
    await this.syncAvailableBrands();

    this.syncInterval = setInterval(async () => {
      await this.syncAllBrands();
    }, this.SYNC_INTERVAL_MS);

    this.brandSyncInterval = setInterval(async () => {
      await this.syncAvailableBrands();
    }, this.BRAND_SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.brandSyncInterval) {
      clearInterval(this.brandSyncInterval);
      this.brandSyncInterval = null;
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

      const brands = await storage.getActiveBrands();
      
      if (brands.length === 0) {
        log("[SyncService] No active brands found to sync", "sync");
        this.lastSyncTime = new Date();
        return { success: true, brandsSynced: 0, errors: [] };
      }

      log(`[SyncService] Found ${brands.length} active brands to sync`, "sync");

      for (const brand of brands) {
        if (!brand.metricoolToken || !brand.metricoolBlogId) {
          log(`[SyncService] Brand ${brand.name} missing credentials, skipping`, "sync");
          continue;
        }

        if (brand.syncPaused) {
          log(`[SyncService] Brand ${brand.name} sync paused, skipping`, "sync");
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

    const activeProviders = await storage.getActiveProviders(brandId);
    
    if (activeProviders.length === 0) {
      log(`[SyncService] Brand ${brandName} has no active providers, skipping sync`, "sync");
      return 0;
    }
    
    log(`[SyncService] Brand ${brandName}: active providers - ${activeProviders.join(', ')}`, "sync");
    
    // Load known brand account names for cross-brand detection (cache per platform)
    const knownBrandAccountsByPlatform: Map<string, Set<string>> = new Map();
    for (const provider of activeProviders) {
      const normalizedPlatform = this.normalizePlatform(provider);
      if (!knownBrandAccountsByPlatform.has(normalizedPlatform)) {
        const accounts = await storage.getKnownBrandAccountNames(normalizedPlatform);
        knownBrandAccountsByPlatform.set(normalizedPlatform, accounts);
      }
    }

    const metricoolService = new MetricoolService({
      userToken: token,
      userId: userId
    });
    
    const inboxData = await metricoolService.getAllInboxData(blogId, activeProviders);

    let savedCount = 0;
    let newInboundCount = 0; // Counter for truly NEW inbound messages (for notifications)
    let firstInboundAuthor: string | null = null;
    let lastConversationId: string | null = null;
    let lastPlatform: string | null = null;
    let lastMessageId: string | null = null; // Track last message ID for deep linking

    for (const conversation of inboxData.conversations) {
      const conv = conversation as any;
      if (!conv.messages || conv.messages.length === 0) continue;

      const participants = conv.participants || [];
      // Get brand's own account ID from various Metricool fields
      const selfParticipant = participants.find((p: any) => p.self === true);
      const brandAccountId = conv.rawData?.self || 
                             conv.rawData?.pageId || 
                             conv.rawData?.accountId ||
                             conv.self ||
                             selfParticipant?.id ||
                             null;
      
      // Extract and save brand's avatar if available
      const brandAvatarUrl = selfParticipant?.imageProfileUrl || selfParticipant?.picture || selfParticipant?.avatar || null;
      if (brandAvatarUrl && conv.provider) {
        try {
          await storage.updateSocialAccountAvatar(brandId, conv.provider, brandAvatarUrl);
        } catch (e) {
          // Silently ignore avatar update errors
        }
      }

      for (const msg of conv.messages) {
        try {
          let author = 'Unknown';
          let authorAvatar: string | null = null;
          let content = msg.message || msg.text || '';
          let customerId = '';
          let isFromBrand = false;
          
          let mediaType: string | null = null;
          let mediaUrl: string | null = null;
          
          if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
            const firstAttachment = msg.attachments[0];
            
            // Handle different attachment formats from Metricool
            if (typeof firstAttachment === 'string') {
              mediaUrl = firstAttachment;
            } else if (typeof firstAttachment === 'object' && firstAttachment !== null) {
              // Extract URL from object formats: {url: "..."}, {src: "..."}, {link: "..."}, etc.
              mediaUrl = firstAttachment.url || firstAttachment.src || firstAttachment.link || firstAttachment.href || null;
              
              // If still no URL, try to get it from nested properties
              if (!mediaUrl && firstAttachment.data) {
                mediaUrl = firstAttachment.data.url || firstAttachment.data.src || null;
              }
            }
            
            if (mediaUrl) {
              mediaType = this.detectMediaType(mediaUrl);
            }
            
            if (!content || content.trim() === '') {
              content = mediaType === 'audio' ? '[Mensaje de audio]' : 
                        mediaType === 'image' ? '[Imagen]' : 
                        mediaType === 'video' ? '[Video]' : '[Archivo adjunto]';
            }
          }
          
          let timestamp: string | number = Date.now();
          if (msg.publicationDateTime) {
            timestamp = msg.publicationDateTime;
          } else if (msg.created_time) {
            timestamp = msg.created_time;
          } else if (msg.timestamp) {
            timestamp = msg.timestamp;
          } else if (conv.rawData?.creationDate) {
            timestamp = conv.rawData.creationDate;
          }

          const platform = this.normalizePlatform(conv.provider || "unknown");

          if (conv.provider === 'INSTAGRAM' || conv.provider === 'LINKEDIN' || conv.provider === 'TIKTOKBUSINESS' || conv.provider === 'FACEBOOK') {
            const fromId = msg.from;
            const fromParticipant = participants.find((p: any) => p.id === fromId);
            
            author = fromParticipant?.name || msg.from?.name || `Unknown ${conv.provider} User`;
            authorAvatar = fromParticipant?.imageProfileUrl || null;
            
            // Check if message is from brand's own account
            isFromBrand = brandAccountId ? fromId === brandAccountId : false;
            // Also check if the fromParticipant is marked as self
            if (!isFromBrand && fromParticipant?.self === true) {
              isFromBrand = true;
            }
            
            // Find customer participant: look for participant that is NOT the brand
            // First try to find by self=false flag, then by excluding brandAccountId
            const customerParticipant = participants.find((p: any) => p.self === false) ||
              (brandAccountId ? participants.find((p: any) => p.id !== brandAccountId && p.id) : null) ||
              // If we still can't find, and message is inbound, use the sender
              (!isFromBrand ? fromParticipant : null) ||
              // Last resort: find any participant that is not marked as self
              participants.find((p: any) => p.self !== true);
            
            customerId = customerParticipant?.id || fromId || author;
            
            // Warn if customerId matches brandAccountId (potential bug)
            if (customerId === brandAccountId) {
              console.warn(`[SyncService] WARNING: customerId matches brandAccountId for conversation ${conv.id}. This may cause DM send failures. Brand: ${brandName}, participants:`, JSON.stringify(participants));
            }
          } else {
            author = msg.from?.name || msg.sender?.name || 'Unknown';
            authorAvatar = msg.from?.picture || msg.sender?.picture || null;
            const senderId = msg.from?.id || msg.sender?.id;
            isFromBrand = brandAccountId ? senderId === brandAccountId : false;
            customerId = msg.from?.id || msg.sender?.id || author;
          }

          const direction = isFromBrand ? 'outbound' : 'inbound';
          const isInbound = !isFromBrand;
          const metricoolId = `conv_${conv.id}_${msg.id || msg.timestamp}`;

          // Check if message already exists BEFORE updating conversation unread count
          const existingMessage = await storage.getMessageByMetricoolId(metricoolId, brandId);
          const isNewMessage = !existingMessage;
          
          // PROTECTION: Check if author is a known brand account (cross-brand detection)
          const authorLower = author.toLowerCase();
          const brandNameLower = brandName.toLowerCase();
          const knownBrandAccounts = knownBrandAccountsByPlatform.get(platform) || new Set<string>();
          
          // Message is suspicious if:
          // 1. Author matches current brand name (old check)
          // 2. Author is in the list of known brand accounts that send outbound messages
          const isAuthorKnownBrandAccount = knownBrandAccounts.has(authorLower);
          const isSuspiciousInbound = isInbound && (
            authorLower === brandNameLower ||
            authorLower.includes(brandNameLower) ||
            brandNameLower.includes(authorLower) ||
            isAuthorKnownBrandAccount
          );
          
          if (isSuspiciousInbound && isNewMessage) {
            const reason = isAuthorKnownBrandAccount 
              ? `author "${author}" is a known brand account` 
              : `author matches brand name "${brandName}"`;
            log(`[SyncService] BLOCKED: Inbound message from "${author}" for brand "${brandName}" - ${reason}. Not incrementing unread.`, "sync");
          }
          
          // Only increment if truly new, truly inbound, and NOT suspicious
          const shouldIncrementUnread = isInbound && isNewMessage && !isSuspiciousInbound;

          const conversationRecord = await storage.upsertConversation({
            brandId,
            socialPostId: null,
            platform,
            type: 'dm',
            customerId,
            customerName: author,
            customerAvatar: authorAvatar,
            threadExternalId: conv.id,
            lastMessageAt: new Date(timestamp),
            lastMessagePreview: content.substring(0, 100),
            status: 'open',
          }, shouldIncrementUnread); // Only increment unread if truly NEW inbound message and NOT suspicious

          const messageData = {
            brandId,
            conversationId: conversationRecord.id,
            platform,
            type: "conversation" as const,
            direction: direction as 'inbound' | 'outbound',
            source: 'metricool_sync' as const,
            author,
            authorAvatar,
            content,
            timestamp: new Date(timestamp),
            status: direction === 'outbound' ? 'read' as const : 'unread' as const,
            urgency: null,
            intent: null,
            sentiment: null,
            aiSummary: null,
            draftResponse: null,
            sourceUrl: null,
            contextType: null,
            crmData: null,
            metricoolId,
            rawData: { conversation: conv, message: msg },
            threadId: conv.id,
            parentMessageId: null,
            mediaType,
            mediaUrl,
            mediaTranscription: null,
          };

          const savedMessage = await storage.upsertMessage(messageData);
          savedCount++;
          
          // Check if this is truly a new message by verifying it belongs to THIS brand
          // (upsertMessage may return an existing message from another brand if it's a global duplicate)
          const isReallyNew = isNewMessage && savedMessage.brandId === brandId;
          
          // Log DM processing for debugging
          log(`[SyncService] DM ${metricoolId} from ${author}: isNew=${isNewMessage}, isReallyNew=${isReallyNew}, isFromBrand=${isFromBrand}, direction=${direction}`, "sync");
          
          // CRM Traffic Controller: Route DM to contact system
          if (isReallyNew && isInbound) {
            try {
              const crmResult = await crmTrafficController.routeIncomingMessage({
                brandId,
                platform,
                externalId: customerId,
                username: author,
                avatarUrl: authorAvatar,
                displayName: author,
                messageType: 'dm',
              });
              
              // Contact Enrichment: Extract phone/email from message content (independent of auto-reply)
              if (crmResult.contactId && content) {
                void contactEnrichmentService.processInboundMessage(
                  crmResult.contactId,
                  content,
                  savedMessage.id
                ).catch(err => log(`[SyncService] Enrichment error: ${err.message}`, "sync"));
                
                // LLM Enrichment: Extract service interest, intent, budget from message (async, fire-and-forget)
                void llmEnrichmentService.processInboundMessage(
                  crmResult.contactId,
                  content,
                  brandId
                ).catch(err => log(`[SyncService] LLM Enrichment error: ${err.message}`, "sync"));
              }
            } catch (crmError: any) {
              log(`[SyncService] CRM routing error for DM: ${crmError.message}`, "sync");
            }
          }
          
          if (isReallyNew && isInbound) {
            newInboundCount++; // Increment counter for truly new inbound messages
            
            // LIFECYCLE INTEGRATION: Record customer message and handle status transitions
            void conversationLifecycleService.recordCustomerMessage(conversationRecord.id)
              .catch(err => log(`[SyncService] Lifecycle recordCustomerMessage error: ${err.message}`, "sync"));
            
            // LIFECYCLE: Check if solved conversation should reopen or stay solved (thank-you detection)
            if (conversationRecord.status === 'solved') {
              const messageAnalysis = thankYouDetector.analyzeMessage(content);
              const shouldReopen = conversationLifecycleService.shouldReopenOnMessage(conversationRecord, messageAnalysis);
              
              if (shouldReopen) {
                log(`[SyncService] Reopening solved conversation ${conversationRecord.id} - new request detected`, "sync");
                void conversationLifecycleService.reopenConversation(conversationRecord.id, 'Customer sent new message')
                  .catch(err => log(`[SyncService] Lifecycle reopen error: ${err.message}`, "sync"));
              } else {
                log(`[SyncService] Keeping conversation ${conversationRecord.id} solved - thank you message detected (confidence: ${messageAnalysis.confidence})`, "sync");
              }
            }
            
            // DIAGNOSTIC: Log when we're about to trigger auto-reply for a NEW INBOUND DM
            log(`[SyncService] ⚡ NEW_INBOUND_DM - msgId: ${savedMessage.id}, author: ${author}, convId: ${conversationRecord.id}, will call triggerAutoReply`, "sync");
            
            // Track first inbound author for Smart Digest notifications
            if (!firstInboundAuthor) {
              firstInboundAuthor = author;
            }
            lastConversationId = conversationRecord.id;
            lastPlatform = platform;
            lastMessageId = savedMessage.id;

            websocketService.notifyNewMessage(brandId, {
              id: savedMessage.id,
              platform,
              author,
              content: content.substring(0, 100),
              type: 'dm',
              conversationId: conversationRecord.id,
            });

            this.triggerAutoReply(brandId, savedMessage, conversationRecord);
          }
        } catch (error: any) {
          console.error(`Error upserting conversation message:`, error.message);
        }
      }
    }

    for (const comment of inboxData.comments) {
      try {
        const platform = this.normalizePlatform(comment.provider);
        const postExternalId = comment.postId || comment.rawData?.root?.element?.id || null;
        const postPermalink = comment.postUrl || comment.rawData?.root?.element?.link || null;
        
        // Extract post caption: title + description for YouTube, or just text for other platforms
        const postTitle = comment.rawData?.root?.element?.text || null;
        const postDescription = comment.rawData?.root?.element?.properties?.description || null;
        const postCaption = postDescription 
          ? `${postTitle || ''}\n\n${postDescription}`.trim()
          : postTitle;
        
        // Extract thumbnail from mediaUrls array (first image) 
        const mediaUrls = comment.rawData?.root?.element?.mediaUrls;
        const postThumbnailUrl = Array.isArray(mediaUrls) && mediaUrls.length > 0 
          ? mediaUrls[0] 
          : null;

        let socialPostId: string | null = null;

        if (postExternalId) {
          const socialPost = await storage.upsertSocialPost({
            brandId,
            platform,
            externalId: postExternalId,
            permalink: postPermalink,
            thumbnailUrl: postThumbnailUrl,
            caption: postCaption ? postCaption.substring(0, 5000) : null,
          });
          socialPostId = socialPost.id;
        }

        const participants = comment.rawData?.participants || [];
        
        // Detect brand's account ID from participants (self: true) or rawData fields
        const brandAccountId = participants.find((p: any) => p.self === true)?.id ||
                               comment.rawData?.self ||
                               comment.rawData?.pageId ||
                               comment.rawData?.accountId ||
                               null;
        
        // Get comment author ID from rawData
        const commentOwnerId = comment.rawData?.root?.owner || 
                               comment.rawData?.owner ||
                               comment.rawData?.authorId ||
                               null;
        
        // Find author participant for name/avatar
        const authorParticipant = participants.find((p: any) => p.id === commentOwnerId) ||
                                  participants.find((p: any) => p.name === comment.author);
        
        // Detect if comment is from brand's own account
        let isCommentFromBrand = false;
        if (brandAccountId && commentOwnerId) {
          isCommentFromBrand = commentOwnerId === brandAccountId;
        }
        // Also check if the author participant is marked as self
        if (!isCommentFromBrand && authorParticipant?.self === true) {
          isCommentFromBrand = true;
        }
        
        let customerId = comment.author;
        let customerName = comment.author;
        let customerAvatar = comment.authorAvatar || null;

        if (authorParticipant) {
          customerId = authorParticipant.id || comment.author;
          customerName = authorParticipant.name || comment.author;
          customerAvatar = authorParticipant.imageProfileUrl || comment.authorAvatar || null;
        }
        
        // Normalize customerId: ensure it's never empty/null for CRM routing
        // Fallback chain: authorParticipant.id -> comment.author -> comment.id (platform-scoped)
        // Note: Metricool may return numeric IDs for Facebook/TikTok, so we coerce to string first
        const customerIdStr = typeof customerId === 'string' ? customerId : String(customerId ?? '');
        if (!customerIdStr || customerIdStr.trim() === '') {
          customerId = commentOwnerId?.toString() || comment.id || `${platform}_unknown_${Date.now()}`;
          log(`[SyncService] WARNING: Empty customerId for comment, using fallback: ${customerId}`, "sync");
        } else {
          customerId = customerIdStr;
        }

        // Check if comment already exists BEFORE updating conversation unread count
        const existingComment = await storage.getMessageByMetricoolId(comment.id, brandId);
        const isNewComment = !existingComment;
        
        // Determine direction based on whether it's from brand
        const commentDirection = isCommentFromBrand ? 'outbound' : 'inbound';

        const conversationRecord = await storage.upsertConversation({
          brandId,
          socialPostId,
          platform,
          type: 'comment',
          customerId,
          customerName,
          customerAvatar,
          lastMessageAt: new Date(comment.timestamp),
          lastMessagePreview: comment.content.substring(0, 100),
          status: 'open',
        }, isNewComment && !isCommentFromBrand); // Only increment unread if NEW inbound comment (not from brand)

        const savedComment = await storage.upsertMessage({
          brandId,
          conversationId: conversationRecord.id,
          metricoolId: comment.id,
          platform,
          type: "comment" as const,
          direction: commentDirection as 'inbound' | 'outbound',
          source: 'metricool_sync' as const,
          author: comment.author,
          authorAvatar: comment.authorAvatar || null,
          content: comment.content,
          timestamp: new Date(comment.timestamp),
          status: isCommentFromBrand ? "read" as const : "unread" as const,
          sourceUrl: comment.postUrl || null,
          rawData: comment.rawData || comment,
          threadId: postExternalId,
          parentMessageId: null,
          urgency: null,
          intent: null,
          sentiment: null,
          aiSummary: null,
          draftResponse: null,
          contextType: null,
          crmData: null,
        });
        savedCount++;
        
        // Check if this is truly a new message by verifying it belongs to THIS brand
        // (upsertMessage may return an existing message from another brand if it's a global duplicate)
        const isReallyNew = isNewComment && savedComment.brandId === brandId;
        
        log(`[SyncService] Comment ${comment.id} from ${comment.author}: isNew=${isNewComment}, isReallyNew=${isReallyNew}, isFromBrand=${isCommentFromBrand}`, "sync");
        
        // CRM Traffic Controller: Route comment to limbo or existing contact
        if (isReallyNew && !isCommentFromBrand) {
          try {
            await crmTrafficController.routeIncomingMessage({
              brandId,
              platform,
              externalId: customerId,
              username: customerName,
              avatarUrl: customerAvatar,
              displayName: customerName,
              messageType: 'comment',
            });
          } catch (crmError: any) {
            log(`[SyncService] CRM routing error for comment: ${crmError.message}`, "sync");
          }
        }
        
        // Only notify and trigger auto-reply for NEW INBOUND comments (not from brand)
        if (isReallyNew && !isCommentFromBrand) {
          newInboundCount++; // Increment counter for truly new inbound comments
          
          // Track first inbound author for Smart Digest notifications
          if (!firstInboundAuthor) {
            firstInboundAuthor = comment.author;
          }
          lastConversationId = conversationRecord.id;
          lastPlatform = platform;
          lastMessageId = savedComment.id;

          websocketService.notifyNewMessage(brandId, {
            id: savedComment.id,
            platform,
            author: comment.author,
            content: comment.content.substring(0, 100),
            type: 'comment',
            conversationId: conversationRecord.id,
          });

          this.triggerAutoReply(brandId, savedComment, conversationRecord);
        }

        const nestedReplies = (comment.replies && comment.replies.length > 0) ? comment.replies : (comment.rawData?.root?.comments || []);
        
        for (const reply of nestedReplies) {
          try {
            const replyOwnerId = reply.owner;
            const replyAuthorParticipant = participants.find((p: any) => p.id === replyOwnerId);
            
            const replyAuthor = replyAuthorParticipant?.name || `Unknown Reply Author`;
            const replyAvatar = replyAuthorParticipant?.imageProfileUrl || null;
            const replyContent = reply.text || '';
            const replyTimestamp = reply.creationDate || comment.timestamp;
            
            // Detect if reply is from brand's own account
            let isReplyFromBrand = false;
            if (brandAccountId && replyOwnerId) {
              isReplyFromBrand = replyOwnerId === brandAccountId;
            }
            // Also check if the author participant is marked as self
            if (!isReplyFromBrand && replyAuthorParticipant?.self === true) {
              isReplyFromBrand = true;
            }
            
            const replyDirection = isReplyFromBrand ? 'outbound' : 'inbound';

            // Check if reply already exists BEFORE incrementing
            const existingReply = await storage.getMessageByMetricoolId(reply.id, brandId);
            const isNewReply = !existingReply;
            
            // Update conversation unread count only if this is a NEW inbound reply
            if (isNewReply && !isReplyFromBrand) {
              newInboundCount++; // Increment counter for truly new inbound replies
              await storage.updateConversation(conversationRecord.id, {
                unreadCount: (conversationRecord.unreadCount || 0) + 1,
              });
            }

            await storage.upsertMessage({
              brandId,
              conversationId: conversationRecord.id,
              metricoolId: reply.id,
              platform,
              type: "comment" as const,
              direction: replyDirection as 'inbound' | 'outbound',
              source: 'metricool_sync' as const,
              author: replyAuthor,
              authorAvatar: replyAvatar,
              content: replyContent,
              timestamp: new Date(replyTimestamp),
              status: isReplyFromBrand ? "read" as const : "unread" as const,
              sourceUrl: reply.properties?.permalink || comment.postUrl || null,
              rawData: reply,
              threadId: postExternalId,
              parentMessageId: savedComment.id,
              urgency: null,
              intent: null,
              sentiment: null,
              aiSummary: null,
              draftResponse: null,
              contextType: null,
              crmData: null,
            });
            savedCount++;
            
            // CRM Traffic Controller: Route nested reply to limbo or existing contact
            if (isNewReply && !isReplyFromBrand) {
              try {
                // Normalize replyOwnerId: ensure it's never empty for CRM routing
                let replyExternalId = replyOwnerId || reply.id || `${platform}_reply_${Date.now()}`;
                if (!replyExternalId || (typeof replyExternalId === 'string' && replyExternalId.trim() === '')) {
                  replyExternalId = `${platform}_reply_${reply.id || Date.now()}`;
                  log(`[SyncService] WARNING: Empty replyOwnerId, using fallback: ${replyExternalId}`, "sync");
                }
                
                await crmTrafficController.routeIncomingMessage({
                  brandId,
                  platform,
                  externalId: replyExternalId,
                  username: replyAuthor,
                  avatarUrl: replyAvatar,
                  displayName: replyAuthor,
                  messageType: 'comment',
                });
              } catch (crmError: any) {
                log(`[SyncService] CRM routing error for reply: ${crmError.message}`, "sync");
              }
            }
          } catch (replyError: any) {
            console.error(`Error upserting reply:`, replyError.message);
          }
        }
      } catch (error: any) {
        console.error(`Error upserting comment:`, error.message);
      }
    }

    log(`[SyncService] Brand ${brandName}: saved ${savedCount} messages (${newInboundCount} new inbound)`, "sync");
    
    this.triggerPendingTranscriptions(brandId, brandName);
    
    // Create aggregated notification ONLY for truly NEW inbound messages
    // This prevents duplicate notifications when switching brands and re-syncing
    if (newInboundCount > 0) {
      this.createSyncNotification(brandId, 'new_messages', newInboundCount, lastPlatform, {
        firstAuthor: firstInboundAuthor,
        conversationId: lastConversationId,
        messageId: lastMessageId,
      });
    }
    
    return savedCount;
  }

  private triggerPendingTranscriptions(brandId: string, brandName: string): void {
    transcriptionService.transcribePendingAudios(brandId, 3)
      .then(count => {
        if (count > 0) {
          log(`[SyncService] Brand ${brandName}: transcribed ${count} audio messages`, "sync");
        }
      })
      .catch(error => {
        log(`[SyncService] Brand ${brandName}: transcription error - ${error.message}`, "sync");
      });
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

  private triggerAutoReply(brandId: string, message: any, conversation: any): void {
    // DIAGNOSTIC: Log every call to triggerAutoReply
    log(`[SyncService] 🔷 triggerAutoReply CALLED - messageId: ${message.id}, messageType: ${message.type}, author: ${message.author}`, "sync");
    
    storage.getBrand(brandId).then(async brand => {
      if (!brand) {
        log(`[SyncService] Brand ${brandId} not found for auto-reply`, "sync");
        return;
      }
      
      log(`[SyncService] 🔷 Brand found: ${brand.name}, proceeding with auto-reply`, "sync");

      let messageToProcess = message;

      // If it's an audio message, transcribe it first before auto-reply
      if (message.mediaType === 'audio' && message.mediaUrl && !message.mediaTranscription) {
        log(`[SyncService] Audio message detected - transcribing before auto-reply`, "sync");
        
        try {
          const transcription = await transcriptionService.transcribeAudio(message.id, brandId);
          
          if (transcription) {
            log(`[SyncService] Audio transcribed successfully: "${transcription.substring(0, 50)}..."`, "sync");
            // Fetch the updated message with transcription
            const updatedMessage = await storage.getMessage(message.id);
            if (updatedMessage) {
              messageToProcess = updatedMessage;
            }
          } else {
            log(`[SyncService] Audio transcription failed - skipping auto-reply for audio message`, "sync");
            return; // Don't auto-reply if we couldn't transcribe
          }
        } catch (error: any) {
          log(`[SyncService] Error transcribing audio for auto-reply: ${error.message}`, "sync");
          return; // Don't auto-reply if transcription failed
        }
      }

      autoReplyService.processNewMessageWithBuffering(messageToProcess, conversation, brand)
        .then(result => {
          if (result.success && result.skippedReason === 'buffered') {
            log(`[SyncService] DM message ${message.id} buffered for batch processing`, "sync");
          } else if (result.success) {
            log(`[SyncService] Auto-reply sent for message ${message.id}`, "sync");
          } else if (result.skippedReason) {
            log(`[SyncService] Auto-reply skipped: ${result.skippedReason}`, "sync");
          } else if (result.error) {
            log(`[SyncService] Auto-reply failed: ${result.error}`, "sync");
          }
        })
        .catch(error => {
          log(`[SyncService] Auto-reply error: ${error.message}`, "sync");
        });
    }).catch(error => {
      log(`[SyncService] Error fetching brand for auto-reply: ${error.message}`, "sync");
    });
  }

  getStatus(): {
    isRunning: boolean;
    isSyncing: boolean;
    isSyncingBrands: boolean;
    lastSyncTime: Date | null;
    lastBrandSyncTime: Date | null;
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
      isSyncingBrands: this.isSyncingBrands,
      lastSyncTime: this.lastSyncTime,
      lastBrandSyncTime: this.lastBrandSyncTime,
      cooldownBrands,
    };
  }

  async triggerManualSync(): Promise<{ success: boolean; brandsSynced: number; errors: string[] }> {
    log("[SyncService] Manual sync triggered", "sync");
    return this.syncAllBrands();
  }

  async syncAvailableBrands(): Promise<BrandSyncResult> {
    if (this.isSyncingBrands) {
      log("[SyncService] Brand sync already in progress, skipping", "sync");
      return { newBrands: [], disconnectedBrands: [], totalAvailable: 0 };
    }

    this.isSyncingBrands = true;
    const newBrands: string[] = [];
    const disconnectedBrands: string[] = [];

    try {
      log("[SyncService] Starting brand availability check...", "sync");

      const metricoolService = createMetricoolService();
      const availableBrands = await metricoolService.getBrands();
      
      log(`[SyncService] Found ${availableBrands.length} brands available in Metricool`, "sync");

      const connectedBrands = await storage.getBrands();
      const connectedBlogIds = new Set(connectedBrands.map(b => b.metricoolBlogId));
      const availableBlogIds = new Set(availableBrands.map(b => b.blogId));

      for (const brand of availableBrands) {
        if (!connectedBlogIds.has(brand.blogId)) {
          newBrands.push(brand.name);
          log(`[SyncService] New brand detected: ${brand.name} (blogId: ${brand.blogId})`, "sync");
        }
      }

      for (const brand of connectedBrands) {
        if (brand.metricoolBlogId && !availableBlogIds.has(brand.metricoolBlogId)) {
          disconnectedBrands.push(brand.name);
          log(`[SyncService] Disconnected brand detected: ${brand.name} (blogId: ${brand.metricoolBlogId})`, "sync");
        }
      }

      this.lastBrandSyncTime = new Date();

      if (newBrands.length > 0 || disconnectedBrands.length > 0) {
        log(`[SyncService] Brand sync complete. New: ${newBrands.length}, Disconnected: ${disconnectedBrands.length}`, "sync");
      } else {
        log(`[SyncService] Brand sync complete. No changes detected.`, "sync");
      }

      return {
        newBrands,
        disconnectedBrands,
        totalAvailable: availableBrands.length,
      };
    } catch (error: any) {
      log(`[SyncService] Error during brand sync: ${error.message}`, "sync");
      return { newBrands: [], disconnectedBrands: [], totalAvailable: 0 };
    } finally {
      this.isSyncingBrands = false;
    }
  }

  async triggerManualBrandSync(): Promise<BrandSyncResult> {
    log("[SyncService] Manual brand sync triggered", "sync");
    return this.syncAvailableBrands();
  }

  private detectMediaType(url: string): 'audio' | 'image' | 'video' | null {
    if (!url) return null;
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('ig_messaging_cdn') || lowerUrl.includes('fbsbx.com')) {
      if (lowerUrl.includes('audio') || lowerUrl.includes('.mp3') || lowerUrl.includes('.m4a') || lowerUrl.includes('.aac') || lowerUrl.includes('.ogg')) {
        return 'audio';
      }
      if (lowerUrl.includes('video') || lowerUrl.includes('.mp4') || lowerUrl.includes('.mov')) {
        return 'video';
      }
      return 'audio';
    }
    
    const audioExtensions = ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.opus'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    
    if (audioExtensions.some(ext => lowerUrl.includes(ext))) return 'audio';
    if (imageExtensions.some(ext => lowerUrl.includes(ext))) return 'image';
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) return 'video';
    
    return null;
  }

  private createSyncNotification(
    brandId: string, 
    type: 'new_messages' | 'sync_error' | 'sync_success', 
    count: number, 
    platform: string | null,
    extra?: { firstAuthor?: string | null; conversationId?: string | null; messageId?: string | null }
  ): void {
    // Smart Digest: Show author name like Instagram does
    let title: string;
    let description: string;
    
    if (type === 'new_messages') {
      const author = extra?.firstAuthor;
      const othersCount = count - 1;
      
      if (author && othersCount > 0) {
        // "Juan y 4 más enviaron mensajes"
        title = `${author} y ${othersCount} más`;
        description = `te enviaron ${count} mensaje${count > 1 ? 's' : ''}`;
      } else if (author) {
        // "Juan te envió un mensaje"
        title = author;
        description = `te envió ${count} mensaje${count > 1 ? 's' : ''}`;
      } else {
        title = 'Nuevos mensajes';
        description = `${count} mensaje${count > 1 ? 's' : ''} nuevo${count > 1 ? 's' : ''}`;
      }
    } else if (type === 'sync_error') {
      title = 'Error de sincronización';
      description = 'Hubo un problema al sincronizar con Metricool';
    } else {
      title = 'Sincronización completada';
      description = 'La sincronización se completó exitosamente';
    }

    // Deep Link: Include conversationId and messageId for direct navigation
    const conversationId = extra?.conversationId;
    const messageId = extra?.messageId;
    let clickUrl = '/inbox';
    if (conversationId) {
      clickUrl = `/inbox?conversation=${conversationId}&highlight=true`;
      if (messageId) {
        clickUrl += `&messageId=${messageId}`;
      }
    }

    storage.createOrUpdateNotification({
      brandId,
      type,
      title,
      description,
      platform,
      count,
      clickUrl,
      metadata: extra ? { 
        firstAuthor: extra.firstAuthor, 
        conversationId: extra.conversationId,
        messageId: extra.messageId 
      } : null,
    }).catch(err => {
      log(`[SyncService] Error creating notification: ${err.message}`, "sync");
    });
  }
}

export const syncService = new SyncService();
