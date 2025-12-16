import { 
  brands, users, messages, socialPosts, conversations, socialAccounts, aiAgents, aiAgentAuditLog,
  type Brand, type InsertBrand, 
  type User, type InsertUser, 
  type Message, type InsertMessage, type UpdateMessage,
  type SocialPost, type InsertSocialPost,
  type Conversation, type InsertConversation, type UpdateConversation,
  type SocialAccount, type InsertSocialAccount, type UpdateSocialAccount,
  type AiAgent, type InsertAiAgent, type UpdateAiAgent,
  type AiAgentAuditLog, type InsertAiAgentAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getBrands(): Promise<Brand[]>;
  getActiveBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  getBrandByBlogId(blogId: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  archiveBrand(id: string): Promise<Brand | undefined>;
  unarchiveBrand(id: string): Promise<Brand | undefined>;
  
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getSocialPosts(brandId: string): Promise<SocialPost[]>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  getSocialPostByExternalId(brandId: string, platform: string, externalId: string): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  upsertSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  
  getConversations(brandId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByKey(brandId: string, platform: string, customerId: string, socialPostId?: string | null): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: UpdateConversation): Promise<Conversation | undefined>;
  upsertConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessagesAfterMessageId(conversationId: string, afterMessageId: string | null): Promise<Message[]>;
  countMessagesAfterMessageId(conversationId: string, afterMessageId: string | null): Promise<number>;
  updateConversationSummary(conversationId: string, summary: string, lastMessageId: string): Promise<Conversation | undefined>;
  
  getMessages(brandId?: string): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined>;
  getMessagesWithPendingTranscription(brandId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  upsertMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: UpdateMessage): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<void>;
  
  getSocialAccountsByBrand(brandId: string): Promise<SocialAccount[]>;
  getSocialAccount(brandId: string, provider: string): Promise<SocialAccount | undefined>;
  getActiveProviders(brandId: string): Promise<string[]>;
  upsertSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccountStatus(brandId: string, provider: string, isActive: boolean): Promise<SocialAccount | undefined>;
  updateSocialAccountSyncStatus(brandId: string, provider: string, status: string): Promise<SocialAccount | undefined>;
  deleteSocialAccountsByBrand(brandId: string): Promise<void>;
  
  getAiAgent(id: string): Promise<AiAgent | undefined>;
  getAiAgentByBrand(brandId: string): Promise<AiAgent | undefined>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, updates: UpdateAiAgent): Promise<AiAgent | undefined>;
  upsertAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  toggleAiAgentActive(id: string, isActive: boolean): Promise<AiAgent | undefined>;
  updateAiAgentLastAutoReply(id: string): Promise<AiAgent | undefined>;
  
  createAuditLog(log: InsertAiAgentAuditLog): Promise<AiAgentAuditLog>;
  getAuditLogsByAgent(agentId: string, limit?: number): Promise<AiAgentAuditLog[]>;
  getAuditLogsByConversation(conversationId: string): Promise<AiAgentAuditLog[]>;
  getAuditLogsAfterDate(agentId: string, since: Date): Promise<AiAgentAuditLog[]>;
  getAiMetricsStats(brandId: string, days?: number): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    totalTokens: number;
    byPlatform: Record<string, number>;
    byAction: Record<string, number>;
    dailyStats: Array<{ date: string; count: number; tokens: number }>;
  }>;
  
  getInboxStats(brandId: string, days?: number): Promise<{
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    uniqueContacts: number;
    avgResponseTimeMs: number | null;
    byPlatform: Record<string, { inbound: number; outbound: number }>;
    bySentiment: Record<string, number>;
    dailyStats: Array<{ date: string; inbound: number; outbound: number }>;
    recentActivity: Array<{
      id: string;
      type: 'message' | 'reply';
      author: string;
      content: string;
      platform: string;
      timestamp: Date;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(desc(brands.createdAt));
  }

  async getActiveBrands(): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .where(eq(brands.status, 'active'))
      .orderBy(desc(brands.createdAt));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand || undefined;
  }

  async getBrandByBlogId(blogId: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.metricoolBlogId, blogId));
    return brand || undefined;
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const [brand] = await db
      .insert(brands)
      .values(insertBrand)
      .returning();
    return brand;
  }

  async updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set(updates)
      .where(eq(brands.id, id))
      .returning();
    return brand || undefined;
  }

  async archiveBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set({ status: 'archived' })
      .where(eq(brands.id, id))
      .returning();
    return brand || undefined;
  }

  async unarchiveBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set({ status: 'active' })
      .where(eq(brands.id, id))
      .returning();
    return brand || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getSocialPosts(brandId: string): Promise<SocialPost[]> {
    return await db.select().from(socialPosts).where(eq(socialPosts.brandId, brandId)).orderBy(desc(socialPosts.createdAt));
  }

  async getSocialPost(id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post || undefined;
  }

  async getSocialPostByExternalId(brandId: string, platform: string, externalId: string): Promise<SocialPost | undefined> {
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.brandId, brandId),
          eq(socialPosts.platform, platform),
          eq(socialPosts.externalId, externalId)
        )
      );
    return post || undefined;
  }

  async createSocialPost(insertPost: InsertSocialPost): Promise<SocialPost> {
    const [post] = await db
      .insert(socialPosts)
      .values(insertPost)
      .returning();
    return post;
  }

  async upsertSocialPost(insertPost: InsertSocialPost): Promise<SocialPost> {
    const existing = await this.getSocialPostByExternalId(
      insertPost.brandId,
      insertPost.platform,
      insertPost.externalId
    );
    
    if (existing) {
      const [updated] = await db
        .update(socialPosts)
        .set({
          permalink: insertPost.permalink,
          thumbnailUrl: insertPost.thumbnailUrl,
          caption: insertPost.caption,
        })
        .where(eq(socialPosts.id, existing.id))
        .returning();
      return updated;
    }

    return this.createSocialPost(insertPost);
  }

  async getConversations(brandId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.brandId, brandId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByKey(
    brandId: string, 
    platform: string, 
    customerId: string, 
    socialPostId?: string | null,
    threadExternalId?: string | null
  ): Promise<Conversation | undefined> {
    if (socialPostId) {
      // For comments: User-Centric - each customer has their own conversation per post
      // This enables proper CRM tracking of individual customer interactions
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.brandId, brandId),
            eq(conversations.platform, platform),
            eq(conversations.socialPostId, socialPostId),
            eq(conversations.customerId, customerId)
          )
        );
      return conversation || undefined;
    } else if (threadExternalId) {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.brandId, brandId),
            eq(conversations.platform, platform),
            eq(conversations.threadExternalId, threadExternalId)
          )
        );
      return conversation || undefined;
    } else {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.brandId, brandId),
            eq(conversations.platform, platform),
            eq(conversations.customerId, customerId),
            isNull(conversations.socialPostId)
          )
        );
      return conversation || undefined;
    }
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(id: string, updates: UpdateConversation): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getMessagesAfterMessageId(conversationId: string, afterMessageId: string | null): Promise<Message[]> {
    if (!afterMessageId) {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.timestamp);
    }

    const referenceMessage = await this.getMessage(afterMessageId);
    if (!referenceMessage) {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.timestamp);
    }

    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.seq} > ${referenceMessage.seq}`
        )
      )
      .orderBy(messages.seq);
  }

  async countMessagesAfterMessageId(conversationId: string, afterMessageId: string | null): Promise<number> {
    if (!afterMessageId) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.direction, 'inbound')
          )
        );
      return result[0]?.count || 0;
    }

    const referenceMessage = await this.getMessage(afterMessageId);
    if (!referenceMessage) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.direction, 'inbound')
          )
        );
      return result[0]?.count || 0;
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.direction, 'inbound'),
          sql`${messages.seq} > ${referenceMessage.seq}`
        )
      );
    return result[0]?.count || 0;
  }

  async updateConversationSummary(conversationId: string, summary: string, lastMessageId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({
        conversationSummary: summary,
        summaryLastMessageId: lastMessageId,
        summaryUpdatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation || undefined;
  }

  async upsertConversation(insertConversation: InsertConversation, shouldIncrementUnread: boolean = false): Promise<Conversation> {
    const existing = await this.getConversationByKey(
      insertConversation.brandId,
      insertConversation.platform,
      insertConversation.customerId,
      insertConversation.socialPostId,
      insertConversation.threadExternalId
    );
    
    if (existing) {
      // Only update unreadCount if we should increment (new inbound message)
      const updates: any = {
        lastMessageAt: insertConversation.lastMessageAt,
        lastMessagePreview: insertConversation.lastMessagePreview,
        customerName: insertConversation.customerName || existing.customerName,
        customerAvatar: insertConversation.customerAvatar || existing.customerAvatar,
      };
      
      if (shouldIncrementUnread) {
        updates.unreadCount = (existing.unreadCount || 0) + 1;
      }
      // If shouldIncrementUnread is false, we DON'T touch unreadCount at all
      
      const updated = await this.updateConversation(existing.id, updates);
      return updated!;
    }

    // For new conversations, start with 1 unread if it's an inbound message
    return this.createConversation({
      ...insertConversation,
      unreadCount: shouldIncrementUnread ? 1 : 0,
    });
  }

  async getMessages(brandId?: string): Promise<Message[]> {
    if (brandId) {
      return await db.select().from(messages).where(eq(messages.brandId, brandId)).orderBy(desc(messages.timestamp));
    }
    return await db.select().from(messages).orderBy(desc(messages.timestamp));
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.metricoolId, metricoolId),
          eq(messages.brandId, brandId)
        )
      );
    return message || undefined;
  }

  async getMessagesWithPendingTranscription(brandId: string, limit: number = 10): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.brandId, brandId),
          eq(messages.mediaType, 'audio'),
          isNull(messages.mediaTranscription)
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async upsertMessage(insertMessage: InsertMessage): Promise<Message> {
    if (!insertMessage.metricoolId) {
      return this.createMessage(insertMessage);
    }

    // First, check if this metricoolId already exists (standard upsert)
    const existing = await this.getMessageByMetricoolId(insertMessage.metricoolId, insertMessage.brandId);
    
    if (existing) {
      // PROTECTION PRIORITY 1: If existing message has internalOrigin set, ALWAYS preserve it
      // This is the immutable "birth certificate" of the message
      const hasInternalOrigin = existing.internalOrigin !== null && existing.internalOrigin !== undefined;
      
      // PROTECTION PRIORITY 2: If existing message was sent from Repliyo, preserve source/direction
      const isReplyoSource = existing.source === 'repliyo' || existing.source === 'repliyo_auto';
      const isOutboundBeingOverwritten = existing.direction === 'outbound' && insertMessage.direction === 'inbound';
      
      if (isReplyoSource || isOutboundBeingOverwritten || hasInternalOrigin) {
        console.log(`[Storage] Protecting Repliyo message ${existing.id} - preserving source, direction, and internalOrigin (${existing.internalOrigin})`);
        // Only update rawData and avatar but keep direction, source, author, parentMessageId, and internalOrigin
        const updated = await this.updateMessage(existing.id, {
          rawData: insertMessage.rawData,
          authorAvatar: insertMessage.authorAvatar || existing.authorAvatar,
          // Keep direction, source, author, parentMessageId, and internalOrigin to preserve "Sent from Repliyo" indicator
        });
        return updated!;
      }
      
      const updated = await this.updateMessage(existing.id, insertMessage);
      return updated!;
    }

    // RECONCILIATION LOGIC for messages sent from Repliyo
    // When we send a reply from our app, we save it without a metricoolId.
    // Later, when Metricool syncs, the same message comes back with a metricoolId.
    // We need to detect this and update the existing message instead of creating a duplicate.
    //
    // CRITICAL: Metricool may sync the same message to MULTIPLE brands if they share
    // the same social account. We need to search GLOBALLY (all brands) to prevent this.
    const isFromMetricoolSync = insertMessage.source === 'metricool_sync';
    const isExplicitOutbound = insertMessage.direction === 'outbound';
    
    if (insertMessage.content && (isExplicitOutbound || isFromMetricoolSync)) {
      // First, try to find in the SAME brand (standard reconciliation)
      const pendingOutboundSameBrand = await this.findPendingOutboundMatchBrandWide(insertMessage);
      
      if (pendingOutboundSameBrand) {
        console.log(`[Storage] Reconciling message: updating local outbound ${pendingOutboundSameBrand.id} with metricoolId ${insertMessage.metricoolId} (preserving internalOrigin: ${pendingOutboundSameBrand.internalOrigin})`);
        // NOTE: Only updating specific fields - Drizzle does partial updates, so internalOrigin, source, 
        // direction, and author are automatically preserved (not overwritten with null)
        const updated = await this.updateMessage(pendingOutboundSameBrand.id, {
          metricoolId: insertMessage.metricoolId,
          rawData: insertMessage.rawData,
          authorAvatar: insertMessage.authorAvatar || pendingOutboundSameBrand.authorAvatar,
        });
        return updated!;
      }
      
      // GLOBAL CHECK: If not found in same brand, check ALL brands
      // This prevents duplicates when Metricool syncs the same DM to multiple brands
      const existingGlobal = await this.findExistingReplyoMessageGlobal(insertMessage);
      if (existingGlobal) {
        console.log(`[Storage] SKIPPING duplicate: message already exists in brand ${existingGlobal.brandId} as ${existingGlobal.id} (source: ${existingGlobal.source})`);
        // Return the existing message without creating a new one
        // We don't update the existing one because it belongs to a different brand
        return existingGlobal;
      }
    }

    return this.createMessage(insertMessage);
  }

  // Helper method to find a pending outbound message that matches an incoming synced message (BRAND-WIDE)
  // This searches across ALL conversations in the brand because Metricool may assign different conversation IDs
  private async findPendingOutboundMatchBrandWide(syncedMessage: InsertMessage): Promise<Message | undefined> {
    if (!syncedMessage.content || !syncedMessage.brandId) {
      return undefined;
    }

    // Find outbound messages without metricoolId across the ENTIRE brand
    // Filter by source='repliyo' or 'repliyo_auto' to only match messages sent from our app
    const pendingMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.brandId, syncedMessage.brandId),
          eq(messages.direction, 'outbound'),
          isNull(messages.metricoolId),
          or(
            eq(messages.source, 'repliyo'),
            eq(messages.source, 'repliyo_auto')
          )
        )
      );

    if (pendingMessages.length === 0) {
      return undefined;
    }

    // Normalize content for robust comparison (handles variations from different platforms)
    const normalizeContent = (text: string) => {
      return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')                                // Collapse all whitespace
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')          // Remove zero-width chars and nbsp
        .replace(/\uFE0F/g, '')                              // Remove emoji variation selectors
        .replace(/\uD83C[\uDFFB-\uDFFF]/g, '')               // Remove emoji skin tone modifiers (surrogate pairs)
        .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')  // Smart double quotes → "
        .replace(/[\u2018\u2019\u201A\u201B\u2039\u203A]/g, "'")  // Smart single quotes → '
        .replace(/\u2026/g, '...')                           // Ellipsis → ...
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<')        // Common HTML entities
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))  // Numeric HTML entities (supports emoji)
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))  // Hex HTML entities (supports emoji)
        .replace(/^@+[\w.-]+\s*/g, '')                       // Remove leading @mention(s)
        .replace(/^@+[\w.-]+\s*/g, '')                       // Run twice in case of double
        .substring(0, 100);                                   // Compare first 100 chars
    };

    const syncedNormalized = normalizeContent(syncedMessage.content);
    const syncedTime = syncedMessage.timestamp ? new Date(syncedMessage.timestamp).getTime() : Date.now();

    // Find a matching message by content similarity and timestamp proximity
    // Use tiered tolerance: short messages (< 20 chars) need closer timestamps to avoid false matches
    const isShortMessage = syncedNormalized.length < 20;
    const TIME_TOLERANCE_MS = isShortMessage 
      ? 10 * 60 * 1000   // 10 minutes for short messages ("ok", "gracias", etc.)
      : 2 * 60 * 60 * 1000; // 2 hours for longer messages
    
    // Sort by timestamp proximity to prefer the closest match first
    const sortedPending = [...pendingMessages].sort((a, b) => {
      const diffA = Math.abs(new Date(a.timestamp).getTime() - syncedTime);
      const diffB = Math.abs(new Date(b.timestamp).getTime() - syncedTime);
      return diffA - diffB;
    });
    
    for (const pending of sortedPending) {
      const pendingNormalized = normalizeContent(pending.content);
      const pendingTime = new Date(pending.timestamp).getTime();
      const timeDiff = Math.abs(syncedTime - pendingTime);
      
      // Content must be similar and within time tolerance
      if (pendingNormalized === syncedNormalized && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Found brand-wide match for reconciliation: pending ${pending.id} matches synced content (timeDiff: ${Math.round(timeDiff/1000)}s)`);
        return pending;
      }
      
      // Also check if content starts the same way (for longer messages that might be truncated)
      if (pendingNormalized.startsWith(syncedNormalized.substring(0, 50)) && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Found brand-wide match (prefix) for reconciliation: pending ${pending.id}`);
        return pending;
      }
      
      // Also check reverse (synced content starts with pending content) for truncation on either side
      if (syncedNormalized.startsWith(pendingNormalized.substring(0, 50)) && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Found brand-wide match (reverse prefix) for reconciliation: pending ${pending.id}`);
        return pending;
      }
    }

    return undefined;
  }

  // GLOBAL search: Find any existing Repliyo message with the same content across ALL brands
  // This prevents duplicates when Metricool syncs the same DM to multiple brands sharing a social account
  private async findExistingReplyoMessageGlobal(syncedMessage: InsertMessage): Promise<Message | undefined> {
    if (!syncedMessage.content) {
      return undefined;
    }

    // Find ALL messages from Repliyo (any brand) that match this content
    const replyoMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.source, 'repliyo'),
          eq(messages.source, 'repliyo_auto')
        )
      );

    if (replyoMessages.length === 0) {
      return undefined;
    }

    // Normalize content for comparison
    const normalizeContent = (text: string) => {
      return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        .substring(0, 100);
    };

    const syncedNormalized = normalizeContent(syncedMessage.content);
    const syncedTime = syncedMessage.timestamp ? new Date(syncedMessage.timestamp).getTime() : Date.now();
    const TIME_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2 hours

    for (const existing of replyoMessages) {
      const existingNormalized = normalizeContent(existing.content);
      const existingTime = new Date(existing.timestamp).getTime();
      const timeDiff = Math.abs(syncedTime - existingTime);

      if (existingNormalized === syncedNormalized && timeDiff < TIME_TOLERANCE_MS) {
        return existing;
      }
      
      // Also check partial content match (for long messages truncated differently)
      const syncedStart = syncedNormalized.substring(0, 50);
      const existingStart = existingNormalized.substring(0, 50);
      if (syncedStart === existingStart && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Global match (prefix): found existing ${existing.id} with similar content start`);
        return existing;
      }
    }

    return undefined;
  }

  async updateMessage(id: string, updates: UpdateMessage): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return message || undefined;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getSocialAccountsByBrand(brandId: string): Promise<SocialAccount[]> {
    return await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.brandId, brandId))
      .orderBy(socialAccounts.provider);
  }

  async getSocialAccount(brandId: string, provider: string): Promise<SocialAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.brandId, brandId),
          eq(socialAccounts.provider, provider)
        )
      );
    return account || undefined;
  }

  async getActiveProviders(brandId: string): Promise<string[]> {
    const accounts = await db
      .select({ provider: socialAccounts.provider })
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.brandId, brandId),
          eq(socialAccounts.isActive, true)
        )
      );
    return accounts.map(a => a.provider);
  }

  async upsertSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const existing = await this.getSocialAccount(account.brandId, account.provider);
    
    if (existing) {
      const [updated] = await db
        .update(socialAccounts)
        .set({
          accountName: account.accountName ?? existing.accountName,
          accountAvatar: account.accountAvatar ?? existing.accountAvatar,
        })
        .where(eq(socialAccounts.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(socialAccounts)
      .values(account)
      .returning();
    return created;
  }

  async updateSocialAccountStatus(brandId: string, provider: string, isActive: boolean): Promise<SocialAccount | undefined> {
    const [updated] = await db
      .update(socialAccounts)
      .set({ isActive })
      .where(
        and(
          eq(socialAccounts.brandId, brandId),
          eq(socialAccounts.provider, provider)
        )
      )
      .returning();
    return updated || undefined;
  }

  async updateSocialAccountSyncStatus(brandId: string, provider: string, status: string): Promise<SocialAccount | undefined> {
    const [updated] = await db
      .update(socialAccounts)
      .set({ 
        lastSyncAt: new Date(),
        lastSyncStatus: status 
      })
      .where(
        and(
          eq(socialAccounts.brandId, brandId),
          eq(socialAccounts.provider, provider)
        )
      )
      .returning();
    return updated || undefined;
  }

  async deleteSocialAccountsByBrand(brandId: string): Promise<void> {
    await db.delete(socialAccounts).where(eq(socialAccounts.brandId, brandId));
  }

  async getAiAgent(id: string): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
    return agent || undefined;
  }

  async getAiAgentByBrand(brandId: string): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.brandId, brandId));
    return agent || undefined;
  }

  async createAiAgent(insertAgent: InsertAiAgent): Promise<AiAgent> {
    const [agent] = await db
      .insert(aiAgents)
      .values(insertAgent)
      .returning();
    return agent;
  }

  async updateAiAgent(id: string, updates: UpdateAiAgent): Promise<AiAgent | undefined> {
    const [agent] = await db
      .update(aiAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return agent || undefined;
  }

  async upsertAiAgent(insertAgent: InsertAiAgent): Promise<AiAgent> {
    const existing = await this.getAiAgentByBrand(insertAgent.brandId);
    
    if (existing) {
      const updated = await this.updateAiAgent(existing.id, insertAgent);
      return updated!;
    }

    return this.createAiAgent(insertAgent);
  }

  async toggleAiAgentActive(id: string, isActive: boolean): Promise<AiAgent | undefined> {
    const [agent] = await db
      .update(aiAgents)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return agent || undefined;
  }

  async updateAiAgentLastAutoReply(id: string): Promise<AiAgent | undefined> {
    const [agent] = await db
      .update(aiAgents)
      .set({ lastAutoReplyAt: new Date(), updatedAt: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return agent || undefined;
  }

  async createAuditLog(insertLog: InsertAiAgentAuditLog): Promise<AiAgentAuditLog> {
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const shortCode = await this.generateAuditLogShortCode();
        const [log] = await db
          .insert(aiAgentAuditLog)
          .values({ ...insertLog, shortCode })
          .returning();
        return log;
      } catch (error: any) {
        if (error.code === '23505' && error.constraint?.includes('short_code')) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          continue;
        }
        throw error;
      }
    }
    
    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const fallbackCode = `X${Date.now().toString(36).slice(-5).toUpperCase()}${randomSuffix}`;
    try {
      const [log] = await db
        .insert(aiAgentAuditLog)
        .values({ ...insertLog, shortCode: fallbackCode })
        .returning();
      return log;
    } catch (error: any) {
      const [log] = await db
        .insert(aiAgentAuditLog)
        .values({ ...insertLog, shortCode: null })
        .returning();
      return log;
    }
  }

  private async generateAuditLogShortCode(): Promise<string> {
    const today = new Date();
    const datePrefix = `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const result = await db
      .select({ maxCode: sql<string>`MAX(short_code)` })
      .from(aiAgentAuditLog)
      .where(
        and(
          gte(aiAgentAuditLog.createdAt, startOfDay),
          lte(aiAgentAuditLog.createdAt, endOfDay),
          sql`short_code LIKE ${datePrefix + '-%'}`
        )
      );
    
    let nextNumber = 1;
    const maxCode = result[0]?.maxCode;
    if (maxCode && maxCode.includes('-')) {
      const numPart = parseInt(maxCode.split('-')[1], 10);
      if (!isNaN(numPart)) {
        nextNumber = numPart + 1;
      }
    }
    
    return `${datePrefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async getAuditLogsByAgent(agentId: string, limit: number = 100): Promise<AiAgentAuditLog[]> {
    return await db
      .select()
      .from(aiAgentAuditLog)
      .where(eq(aiAgentAuditLog.agentId, agentId))
      .orderBy(desc(aiAgentAuditLog.createdAt))
      .limit(limit);
  }

  async getAuditLogsByConversation(conversationId: string): Promise<AiAgentAuditLog[]> {
    return await db
      .select()
      .from(aiAgentAuditLog)
      .where(eq(aiAgentAuditLog.conversationId, conversationId))
      .orderBy(desc(aiAgentAuditLog.createdAt));
  }

  async getAuditLogsAfterDate(agentId: string, since: Date): Promise<AiAgentAuditLog[]> {
    return await db
      .select()
      .from(aiAgentAuditLog)
      .where(
        and(
          eq(aiAgentAuditLog.agentId, agentId),
          gte(aiAgentAuditLog.createdAt, since)
        )
      )
      .orderBy(desc(aiAgentAuditLog.createdAt));
  }

  async getAiMetricsStats(brandId: string, days: number = 30): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    totalTokens: number;
    byPlatform: Record<string, number>;
    byAction: Record<string, number>;
    dailyStats: Array<{ date: string; count: number; tokens: number }>;
  }> {
    const agent = await this.getAiAgentByBrand(brandId);
    if (!agent) {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalTokens: 0,
        byPlatform: {},
        byAction: {},
        dailyStats: [],
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await db
      .select()
      .from(aiAgentAuditLog)
      .where(
        and(
          eq(aiAgentAuditLog.agentId, agent.id),
          gte(aiAgentAuditLog.createdAt, since)
        )
      )
      .orderBy(desc(aiAgentAuditLog.createdAt));

    const byPlatform: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const dailyMap: Record<string, { count: number; tokens: number }> = {};

    let successCount = 0;
    let errorCount = 0;
    let totalTokens = 0;

    for (const log of logs) {
      if (log.status === 'success') successCount++;
      else if (log.status === 'error') errorCount++;

      totalTokens += (log.promptTokens || 0) + (log.completionTokens || 0);

      if (log.platform) {
        byPlatform[log.platform] = (byPlatform[log.platform] || 0) + 1;
      }

      if (log.action) {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      }

      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { count: 0, tokens: 0 };
      }
      dailyMap[dateStr].count++;
      dailyMap[dateStr].tokens += (log.promptTokens || 0) + (log.completionTokens || 0);
    }

    const dailyStats = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests: logs.length,
      successCount,
      errorCount,
      totalTokens,
      byPlatform,
      byAction,
      dailyStats,
    };
  }

  async getInboxStats(brandId: string, days: number = 7): Promise<{
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    uniqueContacts: number;
    avgResponseTimeMs: number | null;
    byPlatform: Record<string, { inbound: number; outbound: number }>;
    bySentiment: Record<string, number>;
    dailyStats: Array<{ date: string; inbound: number; outbound: number }>;
    recentActivity: Array<{
      id: string;
      type: 'message' | 'reply';
      author: string;
      content: string;
      platform: string;
      timestamp: Date;
    }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const allMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.brandId, brandId),
          gte(messages.timestamp, since)
        )
      )
      .orderBy(desc(messages.timestamp));

    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.brandId, brandId));

    const inboundMessages = allMessages.filter(m => m.direction === 'inbound');
    const outboundMessages = allMessages.filter(m => m.direction === 'outbound');

    const openConversations = allConversations.filter(c => c.status === 'open').length;
    const closedConversations = allConversations.filter(c => c.status === 'closed').length;

    const uniqueCustomerIds = new Set(allConversations.map(c => c.customerId));

    const byPlatform: Record<string, { inbound: number; outbound: number }> = {};
    const bySentiment: Record<string, number> = {};
    const dailyMap: Record<string, { inbound: number; outbound: number }> = {};

    for (const msg of allMessages) {
      const platform = msg.platform || 'unknown';
      if (!byPlatform[platform]) {
        byPlatform[platform] = { inbound: 0, outbound: 0 };
      }
      if (msg.direction === 'inbound') {
        byPlatform[platform].inbound++;
      } else {
        byPlatform[platform].outbound++;
      }

      if (msg.sentiment) {
        bySentiment[msg.sentiment] = (bySentiment[msg.sentiment] || 0) + 1;
      }

      const dateStr = msg.timestamp.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { inbound: 0, outbound: 0 };
      }
      if (msg.direction === 'inbound') {
        dailyMap[dateStr].inbound++;
      } else {
        dailyMap[dateStr].outbound++;
      }
    }

    const dailyStats = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const recentActivity = allMessages.slice(0, 10).map(msg => ({
      id: msg.id,
      type: (msg.direction === 'outbound' ? 'reply' : 'message') as 'message' | 'reply',
      author: msg.author,
      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
      platform: msg.platform,
      timestamp: msg.timestamp,
    }));

    return {
      totalMessages: allMessages.length,
      inboundMessages: inboundMessages.length,
      outboundMessages: outboundMessages.length,
      totalConversations: allConversations.length,
      openConversations,
      closedConversations,
      uniqueContacts: uniqueCustomerIds.size,
      avgResponseTimeMs: null,
      byPlatform,
      bySentiment,
      dailyStats,
      recentActivity,
    };
  }
}

export const storage = new DatabaseStorage();
