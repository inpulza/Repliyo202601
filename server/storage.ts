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
import { eq, desc, and, isNull, gte } from "drizzle-orm";

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
  
  getMessages(brandId?: string): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined>;
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
      // For comments: Group by POST only (all comments on a post = one conversation)
      // This matches how social media works: one post = one discussion thread
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.brandId, brandId),
            eq(conversations.platform, platform),
            eq(conversations.socialPostId, socialPostId)
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
      // PROTECTION: If existing message was sent from Repliyo, preserve that source
      // Metricool may send the same message with different direction, but we don't want to overwrite
      if (existing.source === 'repliyo' || (existing.direction === 'outbound' && insertMessage.direction === 'inbound')) {
        console.log(`[Storage] Protecting Repliyo message ${existing.id} - preserving source and direction`);
        // Only update rawData but keep direction, source, and parentMessageId
        const updated = await this.updateMessage(existing.id, {
          rawData: insertMessage.rawData,
          // Keep direction, source, and parentMessageId to preserve "Sent from Repliyo" indicator
        });
        return updated!;
      }
      const updated = await this.updateMessage(existing.id, insertMessage);
      return updated!;
    }

    // NEW: Reconciliation logic for messages sent from Repliyo
    // When we send a reply from our app, we save it without a metricoolId.
    // Later, when Metricool syncs, the same message comes back with a metricoolId.
    // We need to detect this and update the existing message instead of creating a duplicate.
    if (insertMessage.conversationId && insertMessage.direction === 'inbound') {
      // Look for an outbound message without metricoolId in the same conversation
      // that has matching content (the message we sent from Repliyo)
      const pendingOutbound = await this.findPendingOutboundMatch(insertMessage);
      
      if (pendingOutbound) {
        console.log(`[Storage] Reconciling message: updating local outbound with metricoolId ${insertMessage.metricoolId}`);
        // Update the existing outbound message with the metricoolId and rawData from Metricool
        // But keep direction, source, and parentMessageId to preserve "Sent from Repliyo" badge
        const updated = await this.updateMessage(pendingOutbound.id, {
          metricoolId: insertMessage.metricoolId,
          rawData: insertMessage.rawData,
          // Keep direction as outbound and source as 'repliyo' to preserve the badge
        });
        return updated!;
      }
    }

    return this.createMessage(insertMessage);
  }

  // Helper method to find a pending outbound message that matches an incoming synced message
  private async findPendingOutboundMatch(syncedMessage: InsertMessage): Promise<Message | undefined> {
    if (!syncedMessage.conversationId || !syncedMessage.content) {
      return undefined;
    }

    // Find outbound messages without metricoolId in the same conversation
    const pendingMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, syncedMessage.conversationId),
          eq(messages.direction, 'outbound'),
          isNull(messages.metricoolId),
          eq(messages.brandId, syncedMessage.brandId)
        )
      );

    if (pendingMessages.length === 0) {
      return undefined;
    }

    // Normalize content for comparison (trim, collapse whitespace, remove mentions)
    const normalizeContent = (text: string) => {
      return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/^@+[\w.-]+\s*/g, '') // Remove leading @mention(s) like @@username or @username
        .replace(/^@+[\w.-]+\s*/g, '') // Run twice in case of double mention @@user @user
        .substring(0, 100); // Compare first 100 chars
    };

    const syncedNormalized = normalizeContent(syncedMessage.content);
    const syncedTime = syncedMessage.timestamp ? new Date(syncedMessage.timestamp).getTime() : Date.now();

    // Find a matching message by content similarity and timestamp proximity (within 2 hours)
    // We use 2 hours because Metricool sync can have significant delays
    const TIME_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2 hours
    
    for (const pending of pendingMessages) {
      const pendingNormalized = normalizeContent(pending.content);
      const pendingTime = new Date(pending.timestamp).getTime();
      const timeDiff = Math.abs(syncedTime - pendingTime);
      
      // Content must be similar and within time tolerance
      if (pendingNormalized === syncedNormalized && timeDiff < TIME_TOLERANCE_MS) {
        return pending;
      }
      
      // Also check if content starts the same way (for longer messages that might be truncated)
      if (pendingNormalized.startsWith(syncedNormalized.substring(0, 50)) && timeDiff < TIME_TOLERANCE_MS) {
        return pending;
      }
      
      // Also check reverse (synced content starts with pending content) for truncation on either side
      if (syncedNormalized.startsWith(pendingNormalized.substring(0, 50)) && timeDiff < TIME_TOLERANCE_MS) {
        return pending;
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
    const [log] = await db
      .insert(aiAgentAuditLog)
      .values(insertLog)
      .returning();
    return log;
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
