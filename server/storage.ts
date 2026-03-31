import { 
  brands, users, messages, socialPosts, conversations, socialAccounts, aiAgents, aiAgentAuditLog, conversationUserSummaries, aiModelPricing, notifications, playgroundTemplates,
  crmContacts, crmContactChannels, crmContactLimbo,
  conversationStatusHistory, brandLifecycleSettings,
  reminderRules, reminderEvents, verificationCodes,
  type Brand, type InsertBrand, 
  type User, type InsertUser, 
  type Message, type InsertMessage, type UpdateMessage,
  type SocialPost, type InsertSocialPost,
  type Conversation, type InsertConversation, type UpdateConversation,
  type SocialAccount, type InsertSocialAccount, type UpdateSocialAccount,
  type AiAgent, type InsertAiAgent, type UpdateAiAgent,
  type AiAgentAuditLog, type InsertAiAgentAuditLog,
  type ConversationUserSummary, type InsertConversationUserSummary, type UpdateConversationUserSummary,
  type AiModelPricing, type InsertAiModelPricing, type UpdateAiModelPricing,
  type Notification, type InsertNotification, type UpdateNotification,
  type PlaygroundTemplate, type InsertPlaygroundTemplate, type UpdatePlaygroundTemplate,
  type CrmContact, type InsertCrmContact, type UpdateCrmContact,
  type CrmContactChannel, type InsertCrmContactChannel, type UpdateCrmContactChannel,
  type CrmContactLimbo, type InsertCrmContactLimbo, type UpdateCrmContactLimbo,
  type ConversationStatusHistory, type InsertConversationStatusHistory,
  type BrandLifecycleSettings, type InsertBrandLifecycleSettings, type UpdateBrandLifecycleSettings,
  type ConversationStatus, type ClosedBy,
  type ReminderRules, type InsertReminderRules, type UpdateReminderRules,
  type ReminderEvent, type InsertReminderEvent, type ReminderStatus,
  type ConversationTimeline, type TimelineEvent,
  leads, type Lead, type InsertLead,
  metaPageConnections, type MetaPageConnection, type InsertMetaPageConnection, type UpdateMetaPageConnection,
  publicAccessTokens, type PublicAccessToken, type InsertPublicAccessToken
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, isNotNull, gte, lte, sql, inArray, notInArray } from "drizzle-orm";

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformRowToCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    result[snakeToCamel(key)] = row[key];
  }
  return result as T;
}

export interface CrmContactFilterOptions {
  status?: string;
  lifecycleStage?: string;
  limit?: number;
  offset?: number;
  firstInteractionFrom?: string;
  firstInteractionTo?: string;
  lastInteractionFrom?: string;
  lastInteractionTo?: string;
  platform?: string;
  hasPhone?: boolean;
  search?: string;
}

export interface IStorage {
  getBrands(): Promise<Brand[]>;
  getActiveBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  getBrandByBlogId(blogId: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  archiveBrand(id: string): Promise<Brand | undefined>;
  unarchiveBrand(id: string): Promise<Brand | undefined>;
  getSyncPausedStatus(brandId: string): Promise<boolean>;
  updateSyncPaused(brandId: string, paused: boolean): Promise<Brand | undefined>;
  
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  activateUser(id: string): Promise<User | undefined>;
  
  createVerificationCode(userId: string, codeHash: string, expiresAt: Date): Promise<{ id: string }>;
  getActiveVerificationCode(userId: string): Promise<{ id: string; codeHash: string; expiresAt: Date; attempts: number; lastSentAt: Date; resendCount: number } | undefined>;
  incrementVerificationAttempts(id: string): Promise<number>;
  consumeVerificationCode(id: string): Promise<void>;
  canResendCode(userId: string): Promise<{ canResend: boolean; reason?: string }>;
  updateCodeResent(id: string): Promise<void>;
  
  getSocialPosts(brandId: string): Promise<SocialPost[]>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  getSocialPostByExternalId(brandId: string, platform: string, externalId: string): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  upsertSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  
  getConversations(brandId: string): Promise<Conversation[]>;
  getConversationsBySocialPost(brandId: string, socialPostId: string): Promise<Conversation[]>;
  getConversationsByCustomer(brandId: string, platform: string, customerId: string): Promise<Conversation[]>;
  getInboxThreads(brandId: string): Promise<Array<Conversation & { messageCount: number; aggregatedUnreadCount: number; representativeConversationIds: string[] }>>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByKey(brandId: string, platform: string, customerId: string, socialPostId?: string | null): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: UpdateConversation): Promise<Conversation | undefined>;
  upsertConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationLastAiReply(id: string): Promise<Conversation | undefined>;
  incrementConversationUnread(id: string): Promise<Conversation | undefined>;
  
  getMessages(brandId?: string): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  hasPrivateReplyForComment(brandId: string, parentMessageId: string): Promise<boolean>;
  getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined>;
  messageExistsGlobally(metricoolId: string): Promise<boolean>;
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
  updateSocialAccountAvatar(brandId: string, provider: string, avatar: string): Promise<SocialAccount | undefined>;
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
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
    totalPromptCostUsd: number;
    totalCompletionCostUsd: number;
    byPlatform: Record<string, number>;
    byAction: Record<string, number>;
    byModel: Record<string, { count: number; tokens: number; costUsd: number }>;
    dailyStats: Array<{ date: string; count: number; tokens: number; costUsd: number }>;
  }>;
  
  // Métodos para precios de modelos de IA
  getModelPricing(provider: string, model: string): Promise<AiModelPricing | undefined>;
  getAllModelPricing(): Promise<AiModelPricing[]>;
  getActiveModelPricing(): Promise<AiModelPricing[]>;
  upsertModelPricing(pricing: InsertAiModelPricing): Promise<AiModelPricing>;
  updateModelPricing(id: string, updates: UpdateAiModelPricing): Promise<AiModelPricing | undefined>;
  calculateTokenCost(provider: string, model: string, promptTokens: number, completionTokens: number): Promise<{ promptCost: number; completionCost: number; totalCost: number } | null>;
  
  // Conversation User Summaries (memoria persistente para resúmenes por usuario)
  getConversationUserSummary(conversationId: string, author: string): Promise<ConversationUserSummary | undefined>;
  upsertConversationUserSummary(summary: InsertConversationUserSummary): Promise<ConversationUserSummary>;
  updateConversationUserSummary(id: string, updates: UpdateConversationUserSummary): Promise<ConversationUserSummary | undefined>;
  
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
  
  getPendingCommentsForBatchProcessing(brandId: string, platform: string, limit: number): Promise<Message[]>;
  getPendingCommentsCount(brandId: string, platform: string): Promise<number>;
  getMessagesWithPendingSuggestions(brandId: string, platform: string, limit: number): Promise<Message[]>;
  
  getMessagesNeedingDrafts(brandId: string, limit?: number): Promise<Message[]>;
  getMessagesNeedingDraftsCount(brandId: string): Promise<number>;
  getConversationsWithDrafts(brandId: string): Promise<string[]>;
  
  // Notifications
  getNotifications(brandId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(brandId: string): Promise<number>;
  createOrUpdateNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(brandId: string): Promise<number>;
  cleanupOldNotifications(): Promise<number>;
  
  // Draft pending notifications
  getNotificationByMessageId(messageId: string): Promise<Notification | undefined>;
  deleteNotificationByMessageId(messageId: string): Promise<boolean>;
  createDraftNotification(brandId: string, messageId: string, conversationId: string, platform: string, author: string, draftPreview: string): Promise<Notification>;
  getMessagesWithPendingDrafts(brandId: string): Promise<Array<{ messageId: string; conversationId: string; platform: string; author: string; draftPreview: string }>>;
  
  // Playground Templates
  getPlaygroundTemplates(brandId: string): Promise<PlaygroundTemplate[]>;
  getPlaygroundTemplatesByCategory(brandId: string, category: string): Promise<PlaygroundTemplate[]>;
  getPlaygroundTemplate(id: string): Promise<PlaygroundTemplate | undefined>;
  createPlaygroundTemplate(template: InsertPlaygroundTemplate): Promise<PlaygroundTemplate>;
  updatePlaygroundTemplate(id: string, updates: UpdatePlaygroundTemplate): Promise<PlaygroundTemplate | undefined>;
  deletePlaygroundTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<PlaygroundTemplate | undefined>;
  
  // CRM Module - Contacts
  getCrmContacts(brandId: string, options?: CrmContactFilterOptions): Promise<CrmContact[]>;
  getCrmContact(id: string): Promise<CrmContact | undefined>;
  getCrmContactByEmail(brandId: string, email: string): Promise<CrmContact | undefined>;
  getCrmContactByPhone(brandId: string, phone: string): Promise<CrmContact | undefined>;
  findPotentialDuplicates(brandId: string, contactId: string): Promise<Array<{ contact: CrmContact; matchType: 'email' | 'phone'; matchValue: string }>>;
  findAllDuplicatePairs(brandId: string): Promise<Array<{ contact1: CrmContact; contact2: CrmContact; matchType: 'email' | 'phone'; matchValue: string }>>;
  mergeContacts(primaryId: string, secondaryId: string, fieldResolutions?: Record<string, 'primary' | 'secondary'>): Promise<{ primary: CrmContact; mergedChannels: number; mergedConversations: number }>;
  undoMerge(archivedContactId: string): Promise<{ restored: CrmContact; restoredChannels: number; restoredConversations: number } | null>;
  createCrmContact(contact: InsertCrmContact): Promise<CrmContact>;
  createCrmContactWithChannel(
    contact: InsertCrmContact,
    channel: { platform: string; externalId: string; username?: string; avatarUrl?: string }
  ): Promise<{ contact: CrmContact; channel: CrmContactChannel; linkedConversations: number; existingContact?: CrmContact; existingChannel?: CrmContactChannel }>;
  updateCrmContact(id: string, updates: UpdateCrmContact): Promise<CrmContact | undefined>;
  updateCrmContactCustomField(id: string, field: string, value: any): Promise<CrmContact | undefined>;
  incrementCrmContactMetrics(id: string, conversations?: number, messages?: number): Promise<CrmContact | undefined>;
  deleteCrmContact(id: string): Promise<boolean>;
  
  // CRM Module - Contact Channels (Identity Merge)
  getCrmContactChannels(contactId: string): Promise<CrmContactChannel[]>;
  getCrmContactChannel(id: string): Promise<CrmContactChannel | undefined>;
  findCrmContactChannelByExternal(brandId: string, platform: string, externalId: string): Promise<CrmContactChannel | undefined>;
  createCrmContactChannel(channel: InsertCrmContactChannel): Promise<CrmContactChannel>;
  updateCrmContactChannel(id: string, updates: UpdateCrmContactChannel): Promise<CrmContactChannel | undefined>;
  incrementCrmChannelMessageCount(id: string): Promise<CrmContactChannel | undefined>;
  
  // CRM Module - Contact Timeline (Unified History)
  getCrmContactTimeline(contactId: string, options?: { limit?: number }): Promise<Array<Message & { conversationPlatform: string; conversationType: string }>>;
  getCrmContactConversations(contactId: string): Promise<Conversation[]>;
  
  // CRM Module - Contact Limbo (Lazy Creation)
  getCrmContactLimbo(brandId: string, options?: { notPromoted?: boolean; limit?: number }): Promise<CrmContactLimbo[]>;
  getCrmLimboById(id: string): Promise<CrmContactLimbo | undefined>;
  findCrmLimboEntry(brandId: string, platform: string, externalId: string): Promise<CrmContactLimbo | undefined>;
  upsertCrmLimboEntry(entry: InsertCrmContactLimbo): Promise<CrmContactLimbo>;
  promoteCrmLimboToContact(limboId: string, contactId: string): Promise<CrmContactLimbo | undefined>;
  updateCrmLimboCustomFields(id: string, customFields: Record<string, any>): Promise<CrmContactLimbo | undefined>;
  
  // CRM Module - Custom Fields Batch Update
  updateCrmContactCustomFields(id: string, customFields: Record<string, any>): Promise<CrmContact | undefined>;
  
  // Conversation Lifecycle Module (PRD-LIFECYCLE)
  // Status History
  createConversationStatusHistory(entry: InsertConversationStatusHistory): Promise<ConversationStatusHistory>;
  getConversationStatusHistory(conversationId: string): Promise<ConversationStatusHistory[]>;
  
  // Brand Lifecycle Settings
  getBrandLifecycleSettings(brandId: string): Promise<BrandLifecycleSettings | undefined>;
  upsertBrandLifecycleSettings(settings: InsertBrandLifecycleSettings): Promise<BrandLifecycleSettings>;
  updateBrandLifecycleSettings(brandId: string, updates: UpdateBrandLifecycleSettings): Promise<BrandLifecycleSettings | undefined>;
  
  // Lifecycle Queries
  getConversationsByStatus(brandId: string, status: ConversationStatus): Promise<Conversation[]>;
  getSolvedConversationsReadyForClose(brandId: string, hoursInSolved: number): Promise<Conversation[]>;
  getInactiveConversationsForAutoClose(brandId: string, inactivityHours: number): Promise<Conversation[]>;
  updateConversationStatus(
    conversationId: string, 
    status: ConversationStatus, 
    closedBy?: ClosedBy,
    closedByUserId?: string
  ): Promise<Conversation | undefined>;
  updateConversationAiActive(conversationId: string, aiActive: boolean): Promise<Conversation | undefined>;
  updateConversationAssignment(conversationId: string, userId: string | null): Promise<Conversation | undefined>;
  setFirstResponseAt(conversationId: string): Promise<Conversation | undefined>;
  updateLastCustomerMessageAt(conversationId: string): Promise<Conversation | undefined>;
  incrementReopenCount(conversationId: string): Promise<Conversation | undefined>;
  updateClosingSummary(
    conversationId: string,
    summary: string,
    sentiment: string,
    intent: string,
    resolution: string
  ): Promise<Conversation | undefined>;
  
  // Lifecycle Metrics
  getLifecycleMetrics(brandId: string, days?: number): Promise<{
    totalConversations: number;
    byStatus: Record<string, number>;
    avgResolutionTimeMinutes: number;
    avgFirstResponseTimeMinutes: number;
    reopenRate: number;
    botResolutions: number;
    agentResolutions: number;
    autoResolutions: number;
  }>;
  
  // Smart Customer Follow-up System
  // Reminder Rules (per-brand configuration)
  getReminderRules(brandId: string): Promise<ReminderRules | undefined>;
  upsertReminderRules(rules: InsertReminderRules): Promise<ReminderRules>;
  updateReminderRules(brandId: string, updates: UpdateReminderRules): Promise<ReminderRules | undefined>;
  
  // Reminder Events (audit/history)
  createReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent>;
  getReminderEventsByConversation(conversationId: string): Promise<ReminderEvent[]>;
  getReminderEventsByContact(contactId: string): Promise<ReminderEvent[]>;
  getReminderEventsByBrand(brandId: string, options?: { status?: string; limit?: number }): Promise<ReminderEvent[]>;
  updateReminderEventStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<ReminderEvent | undefined>;
  updateReminderEventContent(id: string, content: string): Promise<ReminderEvent | undefined>;
  getScheduledRemindersReady(brandId: string): Promise<ReminderEvent[]>;
  countRemindersSentToday(brandId: string): Promise<number>;
  countRemindersScheduledAndSentToday(brandId: string): Promise<number>;
  checkConversationEligibleForReminder(conversationId: string, maxReminders: number): Promise<{
    eligible: boolean;
    reason?: 'not_found' | 'already_scheduled' | 'opted_out' | 'max_reached' | 'closed' | 'not_replied';
    currentReminderCount?: number;
  }>;
  
  scheduleReminderAtomic(conversationId: string, event: InsertReminderEvent, newReminderStatus: ReminderStatus, maxReminders: number): Promise<{
    status: 'scheduled' | 'max_reached' | 'already_scheduled' | 'opted_out' | 'not_found' | 'duplicate';
    event?: ReminderEvent;
  }>;
  
  // Conversation Reminder Updates
  updateConversationReminderStatus(conversationId: string, status: ReminderStatus, reminderCount?: number): Promise<Conversation | undefined>;
  getConversationsEligibleForReminder(brandId: string, delayHours: number, maxReminders: number, types: string[]): Promise<Conversation[]>;
  
  // Contact Reminder Updates
  updateContactReminderCount(contactId: string): Promise<CrmContact | undefined>;
  updateContactOptOutReminders(contactId: string, optOut: boolean): Promise<CrmContact | undefined>;
  
  // Reminder Analytics
  getReminderStats(brandId: string, timeRange: 'today' | '7d' | '30d'): Promise<{
    totalSent: number;
    totalScheduled: number;
    totalFailed: number;
    totalCancelled: number;
    totalOptedOut: number;
    conversionCount: number;
    conversionRate: number;
    avgResponseMinutes: number | null;
    dailyCapUsage: number;
    dailyCapLimit: number;
  }>;
  getReminderTimeline(brandId: string, timeRange: 'today' | '7d' | '30d'): Promise<Array<{
    date: string;
    sent: number;
    conversions: number;
    failed: number;
  }>>;
  getReminderFailureReasons(brandId: string, timeRange: 'today' | '7d' | '30d', limit?: number): Promise<Array<{
    reason: string;
    count: number;
  }>>;
  
  // Customer Journey Timeline
  getConversationTimeline(conversationId: string): Promise<import("@shared/schema").ConversationTimeline | null>;
  getContactTimeline(contactId: string): Promise<import("@shared/schema").ConversationTimeline | null>;
  
  // Cross-Brand Account Detection (for preventing false inbound detection)
  getKnownBrandAccountNames(platform: string): Promise<Set<string>>;

  // Leads
  createLead(lead: InsertLead): Promise<Lead>;

  // Meta Page Connections (Private Replies)
  getMetaPageConnections(brandId: string): Promise<MetaPageConnection[]>;
  getMetaPageConnectionByPageId(brandId: string, pageId: string): Promise<MetaPageConnection | undefined>;
  upsertMetaPageConnection(data: InsertMetaPageConnection): Promise<MetaPageConnection>;
  updateMetaPageConnection(id: string, data: UpdateMetaPageConnection): Promise<MetaPageConnection | undefined>;
  deleteMetaPageConnection(id: string): Promise<void>;

  // Public Access Tokens (Sales rep links)
  createPublicAccessToken(data: InsertPublicAccessToken): Promise<PublicAccessToken>;
  getActivePublicAccessToken(brandId: string): Promise<PublicAccessToken | undefined>;
  getPublicAccessTokenById(id: string): Promise<PublicAccessToken | undefined>;
  getPublicAccessTokenByToken(token: string): Promise<PublicAccessToken | undefined>;
  revokePublicAccessToken(id: string): Promise<PublicAccessToken | undefined>;
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

  async getSyncPausedStatus(brandId: string): Promise<boolean> {
    const brand = await this.getBrand(brandId);
    return brand?.syncPaused ?? false;
  }

  async updateSyncPaused(brandId: string, paused: boolean): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set({ syncPaused: paused })
      .where(eq(brands.id, brandId))
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

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id));
  }

  async activateUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status: 'active', emailVerifiedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createVerificationCode(userId: string, codeHash: string, expiresAt: Date): Promise<{ id: string }> {
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, userId));
    
    const [code] = await db
      .insert(verificationCodes)
      .values({
        userId,
        codeHash,
        expiresAt,
        purpose: 'email_verification'
      })
      .returning({ id: verificationCodes.id });
    return code;
  }

  async getActiveVerificationCode(userId: string): Promise<{ id: string; codeHash: string; expiresAt: Date; attempts: number; lastSentAt: Date; resendCount: number } | undefined> {
    const [code] = await db
      .select({
        id: verificationCodes.id,
        codeHash: verificationCodes.codeHash,
        expiresAt: verificationCodes.expiresAt,
        attempts: verificationCodes.attempts,
        lastSentAt: verificationCodes.lastSentAt,
        resendCount: verificationCodes.resendCount
      })
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          isNull(verificationCodes.consumedAt),
          gte(verificationCodes.expiresAt, new Date())
        )
      );
    return code || undefined;
  }

  async incrementVerificationAttempts(id: string): Promise<number> {
    const [updated] = await db
      .update(verificationCodes)
      .set({ attempts: sql`${verificationCodes.attempts} + 1` })
      .where(eq(verificationCodes.id, id))
      .returning({ attempts: verificationCodes.attempts });
    return updated?.attempts || 0;
  }

  async consumeVerificationCode(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ consumedAt: new Date() })
      .where(eq(verificationCodes.id, id));
  }

  async canResendCode(userId: string): Promise<{ canResend: boolean; reason?: string }> {
    const code = await this.getActiveVerificationCode(userId);
    if (!code) {
      return { canResend: true };
    }
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (code.lastSentAt > oneMinuteAgo) {
      return { canResend: false, reason: 'Espera 1 minuto antes de reenviar' };
    }
    
    if (code.resendCount >= 5) {
      return { canResend: false, reason: 'Límite diario de reenvíos alcanzado' };
    }
    
    return { canResend: true };
  }

  async updateCodeResent(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ 
        lastSentAt: new Date(),
        resendCount: sql`${verificationCodes.resendCount} + 1`
      })
      .where(eq(verificationCodes.id, id));
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

  async getConversationsBySocialPost(brandId: string, socialPostId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.brandId, brandId),
          eq(conversations.socialPostId, socialPostId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversationsByCustomer(brandId: string, platform: string, customerId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.brandId, brandId),
          eq(conversations.platform, platform),
          eq(conversations.customerId, customerId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getInboxThreads(brandId: string): Promise<Array<Conversation & { messageCount: number; aggregatedUnreadCount: number; representativeConversationIds: string[] }>> {
    // Step 1: Get all conversations for this brand
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.brandId, brandId));
    
    // Step 2: Get message counts per conversation
    const messageCounts = await db
      .select({
        conversationId: messages.conversationId,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(messages)
      .where(eq(messages.brandId, brandId))
      .groupBy(messages.conversationId);
    
    const messageCountMap = new Map(
      messageCounts.map(mc => [mc.conversationId, mc.count])
    );
    
    // Step 3: Separate DMs (no socialPostId) from comments (have socialPostId)
    const dms: Array<Conversation & { messageCount: number; aggregatedUnreadCount: number; representativeConversationIds: string[] }> = [];
    const commentsByPost = new Map<string, Conversation[]>();
    
    for (const conv of allConversations) {
      const msgCount = messageCountMap.get(conv.id) || 0;
      
      if (!conv.socialPostId) {
        // DM: include if has messages, keep as individual conversation
        if (msgCount > 0) {
          dms.push({
            ...conv,
            messageCount: msgCount,
            aggregatedUnreadCount: conv.unreadCount || 0,
            representativeConversationIds: [conv.id],
          });
        }
      } else {
        // Comment: group by socialPostId
        if (!commentsByPost.has(conv.socialPostId)) {
          commentsByPost.set(conv.socialPostId, []);
        }
        commentsByPost.get(conv.socialPostId)!.push(conv);
      }
    }
    
    // Step 4: For each socialPostId group, create ONE representative thread
    const commentThreads: Array<Conversation & { messageCount: number; aggregatedUnreadCount: number; representativeConversationIds: string[] }> = [];
    
    for (const [socialPostId, convGroup] of Array.from(commentsByPost.entries())) {
      // Calculate aggregated stats across all conversations for this post
      let totalMessages = 0;
      let totalUnread = 0;
      let latestMessageAt = new Date(0);
      let latestPreview = '';
      let representativeConv: Conversation | null = null;
      const allConvIds: string[] = [];
      
      for (const conv of convGroup) {
        const msgCount = messageCountMap.get(conv.id) || 0;
        totalMessages += msgCount;
        totalUnread += conv.unreadCount || 0;
        allConvIds.push(conv.id);
        
        // Track the conversation with the most recent message
        const convLastMessageAt = new Date(conv.lastMessageAt);
        if (convLastMessageAt > latestMessageAt) {
          latestMessageAt = convLastMessageAt;
          latestPreview = conv.lastMessagePreview || '';
          representativeConv = conv;
        }
      }
      
      // Only include if there are actual messages
      if (totalMessages > 0 && representativeConv) {
        commentThreads.push({
          ...representativeConv,
          lastMessageAt: latestMessageAt,
          lastMessagePreview: latestPreview,
          unreadCount: totalUnread,
          messageCount: totalMessages,
          aggregatedUnreadCount: totalUnread,
          representativeConversationIds: allConvIds,
        });
      }
    }
    
    // Step 5: Combine and sort by lastMessageAt descending
    const allThreads = [...dms, ...commentThreads];
    allThreads.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    
    return allThreads;
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
      const newTimestamp = insertConversation.lastMessageAt ? new Date(insertConversation.lastMessageAt) : null;
      const existingTimestamp = existing.lastMessageAt ? new Date(existing.lastMessageAt) : null;
      const isMoreRecent = newTimestamp && (!existingTimestamp || newTimestamp > existingTimestamp);

      const updates: any = {
        customerName: insertConversation.customerName || existing.customerName,
        customerAvatar: insertConversation.customerAvatar || existing.customerAvatar,
      };

      if (isMoreRecent) {
        updates.lastMessageAt = newTimestamp;
        updates.lastMessagePreview = insertConversation.lastMessagePreview;
      }

      if (shouldIncrementUnread) {
        updates.unreadCount = (existing.unreadCount || 0) + 1;
        console.log(`[Storage] INCREMENT unread for conv ${existing.id} (${existing.customerName}): ${existing.unreadCount || 0} -> ${updates.unreadCount}`);
        if (existing.status === 'closed') {
          updates.status = 'open';
          console.log(`[Storage] REOPEN conv ${existing.id} (${existing.customerName}): new inbound message arrived`);
        }
      }
      
      const updated = await this.updateConversation(existing.id, updates);
      return updated!;
    }

    // For new conversations, start with 1 unread if it's an inbound message
    return this.createConversation({
      ...insertConversation,
      unreadCount: shouldIncrementUnread ? 1 : 0,
    });
  }

  async updateConversationLastAiReply(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ lastAiReplyAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async incrementConversationUnread(id: string): Promise<Conversation | undefined> {
    const existing = await this.getConversation(id);
    if (!existing) return undefined;
    
    const newCount = (existing.unreadCount || 0) + 1;
    console.log(`[Storage] POST-UPSERT INCREMENT unread for conv ${id} (${existing.customerName}): ${existing.unreadCount || 0} -> ${newCount}`);
    
    const [conversation] = await db
      .update(conversations)
      .set({ unreadCount: newCount })
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
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

  async hasPrivateReplyForComment(brandId: string, parentMessageId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.brandId, brandId),
          eq(messages.parentMessageId, parentMessageId),
          eq(messages.internalOrigin, 'meta_private_reply')
        )
      );
    return (result?.count || 0) > 0;
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

  async messageExistsGlobally(metricoolId: string): Promise<boolean> {
    const [message] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.metricoolId, metricoolId))
      .limit(1);
    return !!message;
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
      // ONLY protect messages that originated from Repliyo, NOT all outbound messages
      const isReplyoSource = existing.source === 'repliyo' || existing.source === 'repliyo_auto';
      
      // Only protect if message is from Repliyo OR has internalOrigin set
      // Do NOT protect metricool_sync messages that were incorrectly marked as outbound
      if (isReplyoSource || hasInternalOrigin) {
        console.log(`[Storage] Protecting Repliyo message ${existing.id} - preserving source, direction, and internalOrigin (${existing.internalOrigin})`);
        // Only update rawData and avatar but keep direction, source, author, parentMessageId, and internalOrigin
        const updated = await this.updateMessage(existing.id, {
          rawData: insertMessage.rawData,
          authorAvatar: insertMessage.authorAvatar || existing.authorAvatar,
          // Keep direction, source, author, parentMessageId, and internalOrigin to preserve "Sent from Repliyo" indicator
        });
        return updated!;
      }
      
      // PROTECTION PRIORITY 3: Always preserve message status for existing messages
      // The sync should NEVER change a message from 'read' back to 'unread'
      // Status is a user-managed field, not a sync-managed field
      const preservedStatus = existing.status;
      
      const updated = await this.updateMessage(existing.id, {
        ...insertMessage,
        status: preservedStatus, // Always keep the existing status
      });
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
    // Filter by source='repliyo', 'repliyo_auto', or 'reminder_service' to only match messages sent from our app
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
            eq(messages.source, 'repliyo_auto'),
            eq(messages.source, 'reminder_service')
          )
        )
      );

    if (pendingMessages.length === 0) {
      return undefined;
    }

    // Normalize content for robust comparison (handles variations from different platforms)
    const normalizeContent = (text: string) => {
      let normalized = text
        .trim()
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
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));  // Hex HTML entities (supports emoji)
      
      // FACEBOOK FIX: Remove leading @mentions with full names (including spaces)
      // Facebook format: "@Nombre Apellido Mensaje real..." or "@username Mensaje real..."
      // Strategy: Remove "@" followed by words until we hit a capital letter starting a new sentence
      // This handles: "@Alejandra Monterroso Totalmente..." → "Totalmente..."
      normalized = normalized.replace(/^@[A-Za-zÀ-ÿ\s]+?\s+(?=[A-ZÀ-Ý])/g, '');
      
      // Also handle simple @username mentions (no spaces in name)
      normalized = normalized.replace(/^@[\w.-]+\s*/g, '');
      normalized = normalized.replace(/^@[\w.-]+\s*/g, ''); // Run twice for double mentions
      
      return normalized.toLowerCase().substring(0, 100);     // Compare first 100 chars
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
      
      // FACEBOOK FIX: Check if synced message CONTAINS the pending message content
      // This handles "@Nombre Apellido ContenidoReal..." where ContenidoReal matches pending
      // Use raw lowercase content (without @mention removal) to do substring check
      const syncedRaw = syncedMessage.content.trim().toLowerCase().replace(/\s+/g, ' ');
      const pendingRaw = pending.content.trim().toLowerCase().replace(/\s+/g, ' ');
      const pendingFirst50 = pendingRaw.substring(0, 50);
      
      if (pendingFirst50.length >= 20 && syncedRaw.includes(pendingFirst50) && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Found Facebook-style match: synced message contains pending content (timeDiff: ${Math.round(timeDiff/1000)}s)`);
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
          eq(messages.source, 'repliyo_auto'),
          eq(messages.source, 'reminder_service')
        )
      );

    if (replyoMessages.length === 0) {
      return undefined;
    }

    // Normalize content for comparison (must match the function in findPendingOutboundMatchBrandWide)
    const normalizeContent = (text: string) => {
      let normalized = text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
      
      // FACEBOOK FIX: Remove leading @mentions with full names (including spaces)
      normalized = normalized.replace(/^@[A-Za-zÀ-ÿ\s]+?\s+(?=[A-ZÀ-Ý])/g, '');
      normalized = normalized.replace(/^@[\w.-]+\s*/g, '');
      normalized = normalized.replace(/^@[\w.-]+\s*/g, '');
      
      return normalized.toLowerCase().substring(0, 100);
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
      
      // FACEBOOK FIX: Check if synced message CONTAINS the existing message content
      const syncedRaw = syncedMessage.content.trim().toLowerCase().replace(/\s+/g, ' ');
      const existingRaw = existing.content.trim().toLowerCase().replace(/\s+/g, ' ');
      const existingFirst50 = existingRaw.substring(0, 50);
      
      if (existingFirst50.length >= 20 && syncedRaw.includes(existingFirst50) && timeDiff < TIME_TOLERANCE_MS) {
        console.log(`[Storage] Global match (Facebook-style contains): found existing ${existing.id}`);
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

  async updateSocialAccountAvatar(brandId: string, provider: string, avatar: string): Promise<SocialAccount | undefined> {
    const existing = await this.getSocialAccount(brandId, provider);
    if (!existing || existing.accountAvatar) {
      return existing;
    }
    
    const [updated] = await db
      .update(socialAccounts)
      .set({ accountAvatar: avatar })
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
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
    totalPromptCostUsd: number;
    totalCompletionCostUsd: number;
    byPlatform: Record<string, number>;
    byAction: Record<string, number>;
    byModel: Record<string, { count: number; tokens: number; costUsd: number }>;
    dailyStats: Array<{ date: string; count: number; tokens: number; costUsd: number }>;
  }> {
    const agent = await this.getAiAgentByBrand(brandId);
    if (!agent) {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCostUsd: 0,
        totalPromptCostUsd: 0,
        totalCompletionCostUsd: 0,
        byPlatform: {},
        byAction: {},
        byModel: {},
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

    // Cargar precios para cálculo de costos históricos
    const pricingCache = new Map<string, AiModelPricing>();
    const allPricing = await this.getActiveModelPricing();
    for (const p of allPricing) {
      pricingCache.set(`${p.provider}:${p.model}`, p);
    }

    const byPlatform: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byModel: Record<string, { count: number; tokens: number; costUsd: number }> = {};
    const dailyMap: Record<string, { count: number; tokens: number; costUsd: number }> = {};

    let successCount = 0;
    let errorCount = 0;
    let totalTokens = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCostUsd = 0;
    let totalPromptCostUsd = 0;
    let totalCompletionCostUsd = 0;

    for (const log of logs) {
      if (log.status === 'success') successCount++;
      else if (log.status === 'error') errorCount++;

      const promptTokens = log.promptTokens || 0;
      const completionTokens = log.completionTokens || 0;
      totalPromptTokens += promptTokens;
      totalCompletionTokens += completionTokens;
      totalTokens += promptTokens + completionTokens;

      // Calcular costos: usar costos guardados o calcular desde precios
      let logPromptCost = log.promptCostUsd || 0;
      let logCompletionCost = log.completionCostUsd || 0;
      let logTotalCost = log.totalCostUsd || 0;

      // Si no hay costos guardados, calcular desde la tabla de precios
      if (logTotalCost === 0 && (promptTokens > 0 || completionTokens > 0)) {
        const provider = log.provider || agent.provider || 'openai';
        const model = log.model || agent.model || 'gpt-4o-mini';
        const pricing = pricingCache.get(`${provider}:${model}`);
        
        if (pricing) {
          logPromptCost = (promptTokens / 1_000_000) * pricing.inputPricePerMillion;
          logCompletionCost = (completionTokens / 1_000_000) * pricing.outputPricePerMillion;
          logTotalCost = logPromptCost + logCompletionCost;
        }
      }

      totalPromptCostUsd += logPromptCost;
      totalCompletionCostUsd += logCompletionCost;
      totalCostUsd += logTotalCost;

      if (log.platform) {
        byPlatform[log.platform] = (byPlatform[log.platform] || 0) + 1;
      }

      if (log.action) {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      }

      // Agregar métricas por modelo
      const modelKey = log.model || agent.model || 'unknown';
      if (!byModel[modelKey]) {
        byModel[modelKey] = { count: 0, tokens: 0, costUsd: 0 };
      }
      byModel[modelKey].count++;
      byModel[modelKey].tokens += promptTokens + completionTokens;
      byModel[modelKey].costUsd += logTotalCost;

      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { count: 0, tokens: 0, costUsd: 0 };
      }
      dailyMap[dateStr].count++;
      dailyMap[dateStr].tokens += promptTokens + completionTokens;
      dailyMap[dateStr].costUsd += logTotalCost;
    }

    const dailyStats = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests: logs.length,
      successCount,
      errorCount,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000, // Redondear a 4 decimales
      totalPromptCostUsd: Math.round(totalPromptCostUsd * 10000) / 10000,
      totalCompletionCostUsd: Math.round(totalCompletionCostUsd * 10000) / 10000,
      byPlatform,
      byAction,
      byModel,
      dailyStats: dailyStats.map(s => ({
        ...s,
        costUsd: Math.round(s.costUsd * 10000) / 10000
      })),
    };
  }

  // ========== MÉTODOS PARA PRECIOS DE MODELOS DE IA ==========
  
  async getModelPricing(provider: string, model: string): Promise<AiModelPricing | undefined> {
    const [pricing] = await db
      .select()
      .from(aiModelPricing)
      .where(
        and(
          eq(aiModelPricing.provider, provider),
          eq(aiModelPricing.model, model)
        )
      );
    return pricing || undefined;
  }

  async getAllModelPricing(): Promise<AiModelPricing[]> {
    return await db
      .select()
      .from(aiModelPricing)
      .orderBy(aiModelPricing.provider, aiModelPricing.model);
  }

  async getActiveModelPricing(): Promise<AiModelPricing[]> {
    return await db
      .select()
      .from(aiModelPricing)
      .where(eq(aiModelPricing.isActive, true))
      .orderBy(aiModelPricing.provider, aiModelPricing.model);
  }

  async upsertModelPricing(pricing: InsertAiModelPricing): Promise<AiModelPricing> {
    const existing = await this.getModelPricing(pricing.provider, pricing.model);
    
    if (existing) {
      const [updated] = await db
        .update(aiModelPricing)
        .set({
          displayName: pricing.displayName,
          inputPricePerMillion: pricing.inputPricePerMillion,
          outputPricePerMillion: pricing.outputPricePerMillion,
          isActive: pricing.isActive,
          effectiveFrom: pricing.effectiveFrom || new Date(),
          sourceUrl: pricing.sourceUrl,
          lastVerifiedAt: new Date(),
          notes: pricing.notes,
        })
        .where(eq(aiModelPricing.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(aiModelPricing)
      .values(pricing)
      .returning();
    return created;
  }

  async updateModelPricing(id: string, updates: UpdateAiModelPricing): Promise<AiModelPricing | undefined> {
    const [updated] = await db
      .update(aiModelPricing)
      .set({
        ...updates,
        lastVerifiedAt: new Date(),
      })
      .where(eq(aiModelPricing.id, id))
      .returning();
    return updated || undefined;
  }

  async calculateTokenCost(
    provider: string, 
    model: string, 
    promptTokens: number, 
    completionTokens: number
  ): Promise<{ promptCost: number; completionCost: number; totalCost: number } | null> {
    const pricing = await this.getModelPricing(provider, model);
    if (!pricing) {
      return null;
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.inputPricePerMillion;
    const completionCost = (completionTokens / 1_000_000) * pricing.outputPricePerMillion;
    
    return {
      promptCost: Math.round(promptCost * 1_000_000) / 1_000_000, // 6 decimales
      completionCost: Math.round(completionCost * 1_000_000) / 1_000_000,
      totalCost: Math.round((promptCost + completionCost) * 1_000_000) / 1_000_000,
    };
  }

  // ========== CONVERSATION USER SUMMARIES (Memoria Persistente) ==========
  
  async getConversationUserSummary(conversationId: string, author: string): Promise<ConversationUserSummary | undefined> {
    const [summary] = await db
      .select()
      .from(conversationUserSummaries)
      .where(
        and(
          eq(conversationUserSummaries.conversationId, conversationId),
          eq(conversationUserSummaries.author, author)
        )
      );
    return summary || undefined;
  }

  async upsertConversationUserSummary(insertSummary: InsertConversationUserSummary): Promise<ConversationUserSummary> {
    const existing = await this.getConversationUserSummary(
      insertSummary.conversationId,
      insertSummary.author
    );
    
    if (existing) {
      const [updated] = await db
        .update(conversationUserSummaries)
        .set({
          summary: insertSummary.summary,
          lastMessageId: insertSummary.lastMessageId,
          messageCount: insertSummary.messageCount,
          updatedAt: new Date(),
        })
        .where(eq(conversationUserSummaries.id, existing.id))
        .returning();
      return updated;
    }

    const [summary] = await db
      .insert(conversationUserSummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async updateConversationUserSummary(id: string, updates: UpdateConversationUserSummary): Promise<ConversationUserSummary | undefined> {
    const [summary] = await db
      .update(conversationUserSummaries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(conversationUserSummaries.id, id))
      .returning();
    return summary || undefined;
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

  async getPendingCommentsForBatchProcessing(brandId: string, platform: string, limit: number): Promise<Message[]> {
    const result = await db.execute(sql`
      SELECT m.*
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.direction = 'inbound'
        AND m.platform = ${platform}
        AND m.ai_suggested_reply IS NULL
        AND m.content IS NOT NULL
        AND TRIM(m.content) != ''
        AND m.author NOT IN ('bo_trust_service', 'bettys_trustservices', 'botrustservices')
        AND NOT EXISTS (
          SELECT 1 FROM messages m2 
          WHERE m2.conversation_id = m.conversation_id 
          AND m2.direction = 'outbound' 
          AND m2.source = 'ai_agent'
        )
      ORDER BY m.timestamp DESC
      LIMIT ${limit}
    `);
    
    return result.rows as Message[];
  }

  async getPendingCommentsCount(brandId: string, platform: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.direction = 'inbound'
        AND m.platform = ${platform}
        AND m.ai_suggested_reply IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM messages m2 
          WHERE m2.conversation_id = m.conversation_id 
          AND m2.direction = 'outbound' 
          AND m2.source = 'ai_agent'
        )
    `);
    
    return parseInt((result.rows[0] as any)?.count || '0', 10);
  }

  async getMessagesWithPendingSuggestions(brandId: string, platform: string, limit: number): Promise<Message[]> {
    const result = await db.execute(sql`
      SELECT m.*
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.direction = 'inbound'
        AND m.platform = ${platform}
        AND m.ai_suggested_reply IS NOT NULL
        AND (m.ai_reply_status IS NULL OR m.ai_reply_status = 'suggested')
        AND m.content IS NOT NULL
        AND TRIM(m.content) != ''
      ORDER BY m.timestamp DESC
      LIMIT ${limit}
    `);
    
    return result.rows as Message[];
  }

  async getMessagesNeedingDrafts(brandId: string, limit: number = 50): Promise<Message[]> {
    const result = await db.execute(sql`
      SELECT m.*
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.direction = 'inbound'
        AND m.content IS NOT NULL
        AND TRIM(m.content) != ''
        AND (m.ai_reply_status IS NULL OR m.ai_reply_status = 'none')
        AND m.ai_suggested_reply IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM messages m2 
          WHERE m2.parent_message_id = m.id 
          AND m2.direction = 'outbound'
        )
      ORDER BY m.timestamp DESC
      LIMIT ${limit}
    `);
    
    return result.rows as Message[];
  }

  async getMessagesNeedingDraftsCount(brandId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.direction = 'inbound'
        AND m.content IS NOT NULL
        AND TRIM(m.content) != ''
        AND (m.ai_reply_status IS NULL OR m.ai_reply_status = 'none')
        AND m.ai_suggested_reply IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM messages m2 
          WHERE m2.parent_message_id = m.id 
          AND m2.direction = 'outbound'
        )
    `);
    
    return parseInt((result.rows[0] as any)?.count || '0', 10);
  }

  async getConversationsWithDrafts(brandId: string): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT m.conversation_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.ai_suggested_reply IS NOT NULL
        AND m.ai_reply_status IN ('drafted', 'suggested')
    `);
    
    return (result.rows as any[]).map(row => row.conversation_id);
  }
  // BACKFILL DISABLED: Direction detection is now handled in syncService.ts
  // The syncService correctly identifies brand-authored messages using:
  // - brandAccountId from participants.self or rawData.self
  // - commentOwnerId from rawData.root.owner or rawData.owner
  // This approach is more reliable than post-hoc SQL updates that can cause cross-brand issues
  async backfillBrandMessageDirections(): Promise<number> {
    console.log(`[Storage] Backfill disabled - direction detection handled in syncService.ts`);
    return 0;
  }

  // ==========================================
  // NOTIFICATIONS - Sistema Central
  // ==========================================
  
  async getNotifications(brandId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.brandId, brandId))
      .orderBy(desc(notifications.updatedAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(brandId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.brandId, brandId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async createOrUpdateNotification(notification: InsertNotification): Promise<Notification> {
    // GROUPING LOGIC: For "new_messages" type, check if an unread notification
    // of the same type, brand, and platform exists within the last 6 hours
    const groupableTypes = ['new_messages', 'sync_success'];
    
    if (groupableTypes.includes(notification.type)) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      // Find existing unread notification of same type/brand/platform
      const existing = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.brandId, notification.brandId),
            eq(notifications.type, notification.type),
            eq(notifications.isRead, false),
            notification.platform 
              ? eq(notifications.platform, notification.platform) 
              : isNull(notifications.platform),
            gte(notifications.updatedAt, sixHoursAgo)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing notification: increment count and update timestamp
        const [updated] = await db
          .update(notifications)
          .set({
            count: existing[0].count + (notification.count || 1),
            description: notification.description,
            updatedAt: new Date(),
          })
          .where(eq(notifications.id, existing[0].id))
          .returning();
        return updated;
      }
    }
    
    // Create new notification
    const [created] = await db
      .insert(notifications)
      .values({
        ...notification,
        count: notification.count || 1,
      })
      .returning();
    
    // Trigger cleanup on insert (probabilistic - 5% chance)
    if (Math.random() < 0.05) {
      this.cleanupOldNotifications().catch(err => 
        console.error('[Notifications] Cleanup error:', err)
      );
    }
    
    return created;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsAsRead(brandId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.brandId, brandId),
          eq(notifications.isRead, false)
        )
      );
    return result.rowCount || 0;
  }

  async cleanupOldNotifications(): Promise<number> {
    // RETENTION POLICY:
    // - Delete read notifications older than 7 days
    // - Delete unread notifications older than 30 days
    // - NEVER delete draft_pending notifications (they persist until draft is sent/discarded)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await db.execute(sql`
      DELETE FROM notifications
      WHERE type != 'draft_pending'
        AND ((is_read = true AND created_at < ${sevenDaysAgo})
         OR (is_read = false AND created_at < ${thirtyDaysAgo}))
    `);
    
    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[Notifications] Cleanup: deleted ${deleted} old notifications`);
    }
    return deleted;
  }

  async getNotificationByMessageId(messageId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'draft_pending'),
          sql`metadata->>'messageId' = ${messageId}`
        )
      )
      .limit(1);
    return notification || undefined;
  }

  async deleteNotificationByMessageId(messageId: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM notifications
      WHERE type = 'draft_pending'
        AND metadata->>'messageId' = ${messageId}
    `);
    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[Notifications] Deleted draft notification for message ${messageId}`);
    }
    return deleted > 0;
  }

  async createDraftNotification(
    brandId: string, 
    messageId: string, 
    conversationId: string, 
    platform: string, 
    author: string, 
    draftPreview: string
  ): Promise<Notification> {
    // Check if notification already exists for this message
    const existing = await this.getNotificationByMessageId(messageId);
    if (existing) {
      // Update the existing notification with new draft preview
      const [updated] = await db
        .update(notifications)
        .set({
          description: draftPreview.substring(0, 100) + (draftPreview.length > 100 ? '...' : ''),
          updatedAt: new Date(),
          isRead: false,
        })
        .where(eq(notifications.id, existing.id))
        .returning();
      return updated;
    }

    // Create new draft notification
    const clickUrl = `/inbox?conversation=${conversationId}&messageId=${messageId}&highlight=true`;
    const [created] = await db
      .insert(notifications)
      .values({
        brandId,
        type: 'draft_pending',
        title: `Borrador sin enviar de @${author}`,
        description: draftPreview.substring(0, 100) + (draftPreview.length > 100 ? '...' : ''),
        platform,
        clickUrl,
        isRead: false,
        count: 1,
        metadata: {
          messageId,
          conversationId,
          author,
          platform,
        },
      })
      .returning();
    
    console.log(`[Notifications] Created draft notification for message ${messageId}`);
    return created;
  }

  async getMessagesWithPendingDrafts(brandId: string): Promise<Array<{ messageId: string; conversationId: string; platform: string; author: string; draftPreview: string }>> {
    const result = await db.execute(sql`
      SELECT 
        m.id as message_id,
        m.conversation_id,
        m.platform,
        m.author,
        COALESCE(SUBSTRING(m.ai_suggested_reply, 1, 100), '') as draft_preview
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND m.ai_suggested_reply IS NOT NULL
        AND m.ai_reply_status IN ('drafted', 'suggested')
    `);
    
    return (result.rows as any[]).map(row => ({
      messageId: row.message_id,
      conversationId: row.conversation_id,
      platform: row.platform || 'unknown',
      author: row.author || 'Usuario',
      draftPreview: row.draft_preview || '',
    }));
  }

  // Playground Templates
  async getPlaygroundTemplates(brandId: string): Promise<PlaygroundTemplate[]> {
    return await db
      .select()
      .from(playgroundTemplates)
      .where(eq(playgroundTemplates.brandId, brandId))
      .orderBy(desc(playgroundTemplates.usageCount), desc(playgroundTemplates.createdAt));
  }

  async getPlaygroundTemplatesByCategory(brandId: string, category: string): Promise<PlaygroundTemplate[]> {
    return await db
      .select()
      .from(playgroundTemplates)
      .where(and(
        eq(playgroundTemplates.brandId, brandId),
        eq(playgroundTemplates.category, category)
      ))
      .orderBy(desc(playgroundTemplates.usageCount), desc(playgroundTemplates.createdAt));
  }

  async getPlaygroundTemplate(id: string): Promise<PlaygroundTemplate | undefined> {
    const [template] = await db
      .select()
      .from(playgroundTemplates)
      .where(eq(playgroundTemplates.id, id));
    return template || undefined;
  }

  async createPlaygroundTemplate(template: InsertPlaygroundTemplate): Promise<PlaygroundTemplate> {
    const [created] = await db
      .insert(playgroundTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updatePlaygroundTemplate(id: string, updates: UpdatePlaygroundTemplate): Promise<PlaygroundTemplate | undefined> {
    const [updated] = await db
      .update(playgroundTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(playgroundTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePlaygroundTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(playgroundTemplates)
      .where(eq(playgroundTemplates.id, id));
    return true;
  }

  async incrementTemplateUsage(id: string): Promise<PlaygroundTemplate | undefined> {
    const [updated] = await db
      .update(playgroundTemplates)
      .set({ 
        usageCount: sql`${playgroundTemplates.usageCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(playgroundTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  // ============================================
  // CRM MODULE - Contacts
  // ============================================

  async getCrmContacts(brandId: string, options?: CrmContactFilterOptions): Promise<CrmContact[]> {
    const conditions = [eq(crmContacts.brandId, brandId)];
    
    if (options?.status) {
      conditions.push(eq(crmContacts.status, options.status));
    }
    
    if (options?.lifecycleStage) {
      conditions.push(eq(crmContacts.lifecycleStage, options.lifecycleStage));
    }
    
    if (options?.firstInteractionFrom) {
      conditions.push(gte(crmContacts.firstInteractionAt, new Date(options.firstInteractionFrom)));
    }
    if (options?.firstInteractionTo) {
      const endOfDay = new Date(options.firstInteractionTo);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(crmContacts.firstInteractionAt, endOfDay));
    }
    if (options?.lastInteractionFrom) {
      conditions.push(gte(crmContacts.lastInteractionAt, new Date(options.lastInteractionFrom)));
    }
    if (options?.lastInteractionTo) {
      const endOfDay = new Date(options.lastInteractionTo);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(crmContacts.lastInteractionAt, endOfDay));
    }
    
    if (options?.hasPhone === true) {
      conditions.push(isNotNull(crmContacts.phone));
      conditions.push(sql`${crmContacts.phone} != ''`);
    } else if (options?.hasPhone === false) {
      conditions.push(or(isNull(crmContacts.phone), sql`${crmContacts.phone} = ''`)!);
    }
    
    if (options?.platform) {
      conditions.push(
        sql`${crmContacts.id} IN (
          SELECT contact_id FROM crm_contact_channels 
          WHERE platform = ${options.platform}
        )`
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${crmContacts.displayName}) LIKE ${searchTerm} OR
          LOWER(${crmContacts.firstName}) LIKE ${searchTerm} OR
          LOWER(${crmContacts.lastName}) LIKE ${searchTerm} OR
          LOWER(${crmContacts.email}) LIKE ${searchTerm} OR
          ${crmContacts.phone} LIKE ${searchTerm}
        )`
      );
    }
    
    return await db
      .select()
      .from(crmContacts)
      .where(and(...conditions))
      .orderBy(desc(crmContacts.lastInteractionAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  async getCrmContact(id: string): Promise<CrmContact | undefined> {
    const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
    return contact || undefined;
  }

  async getCrmContactByEmail(brandId: string, email: string): Promise<CrmContact | undefined> {
    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.brandId, brandId), eq(crmContacts.email, email)));
    return contact || undefined;
  }

  async getCrmContactByPhone(brandId: string, phone: string): Promise<CrmContact | undefined> {
    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.brandId, brandId), eq(crmContacts.phone, phone)));
    return contact || undefined;
  }

  async findPotentialDuplicates(brandId: string, contactId: string): Promise<Array<{ contact: CrmContact; matchType: 'email' | 'phone'; matchValue: string }>> {
    const sourceContact = await this.getCrmContact(contactId);
    if (!sourceContact) return [];
    
    const duplicates: Array<{ contact: CrmContact; matchType: 'email' | 'phone'; matchValue: string }> = [];
    
    if (sourceContact.email) {
      const emailMatches = await db
        .select()
        .from(crmContacts)
        .where(and(
          eq(crmContacts.brandId, brandId),
          eq(crmContacts.email, sourceContact.email),
          sql`${crmContacts.id} != ${contactId}`,
          sql`${crmContacts.status} != 'archived'`
        ));
      
      for (const match of emailMatches) {
        duplicates.push({ contact: match, matchType: 'email', matchValue: sourceContact.email });
      }
    }
    
    if (sourceContact.phone) {
      const phoneMatches = await db
        .select()
        .from(crmContacts)
        .where(and(
          eq(crmContacts.brandId, brandId),
          eq(crmContacts.phone, sourceContact.phone),
          sql`${crmContacts.id} != ${contactId}`,
          sql`${crmContacts.status} != 'archived'`
        ));
      
      for (const match of phoneMatches) {
        if (!duplicates.find(d => d.contact.id === match.id)) {
          duplicates.push({ contact: match, matchType: 'phone', matchValue: sourceContact.phone });
        }
      }
    }
    
    return duplicates;
  }

  async findAllDuplicatePairs(brandId: string): Promise<Array<{ contact1: CrmContact; contact2: CrmContact; matchType: 'email' | 'phone'; matchValue: string }>> {
    const pairs: Array<{ contact1: CrmContact; contact2: CrmContact; matchType: 'email' | 'phone'; matchValue: string }> = [];
    const seenPairs = new Set<string>();
    
    const emailDuplicates = await db
      .select()
      .from(crmContacts)
      .where(and(
        eq(crmContacts.brandId, brandId),
        sql`${crmContacts.email} IS NOT NULL`,
        sql`${crmContacts.status} != 'archived'`
      ))
      .orderBy(crmContacts.email);
    
    const emailGroups = new Map<string, CrmContact[]>();
    for (const contact of emailDuplicates) {
      if (contact.email) {
        const group = emailGroups.get(contact.email) || [];
        group.push(contact);
        emailGroups.set(contact.email, group);
      }
    }
    
    for (const [email, contacts] of emailGroups) {
      if (contacts.length > 1) {
        for (let i = 0; i < contacts.length; i++) {
          for (let j = i + 1; j < contacts.length; j++) {
            const pairKey = [contacts[i].id, contacts[j].id].sort().join('-');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              pairs.push({ contact1: contacts[i], contact2: contacts[j], matchType: 'email', matchValue: email });
            }
          }
        }
      }
    }
    
    const phoneDuplicates = await db
      .select()
      .from(crmContacts)
      .where(and(
        eq(crmContacts.brandId, brandId),
        sql`${crmContacts.phone} IS NOT NULL`,
        sql`${crmContacts.status} != 'archived'`
      ))
      .orderBy(crmContacts.phone);
    
    const phoneGroups = new Map<string, CrmContact[]>();
    for (const contact of phoneDuplicates) {
      if (contact.phone) {
        const group = phoneGroups.get(contact.phone) || [];
        group.push(contact);
        phoneGroups.set(contact.phone, group);
      }
    }
    
    for (const [phone, contacts] of phoneGroups) {
      if (contacts.length > 1) {
        for (let i = 0; i < contacts.length; i++) {
          for (let j = i + 1; j < contacts.length; j++) {
            const pairKey = [contacts[i].id, contacts[j].id].sort().join('-');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              pairs.push({ contact1: contacts[i], contact2: contacts[j], matchType: 'phone', matchValue: phone });
            }
          }
        }
      }
    }
    
    return pairs;
  }

  async mergeContacts(
    primaryId: string, 
    secondaryId: string, 
    fieldResolutions?: Record<string, 'primary' | 'secondary'>
  ): Promise<{ primary: CrmContact; mergedChannels: number; mergedConversations: number }> {
    return await db.transaction(async (tx) => {
      const [primary] = await tx.select().from(crmContacts).where(eq(crmContacts.id, primaryId));
      const [secondary] = await tx.select().from(crmContacts).where(eq(crmContacts.id, secondaryId));
      
      if (!primary || !secondary) {
        throw new Error('CONTACT_NOT_FOUND');
      }
      
      if (primary.brandId !== secondary.brandId) {
        throw new Error('DIFFERENT_BRANDS');
      }
      
      if (secondary.status === 'archived') {
        throw new Error('CONTACT_ALREADY_ARCHIVED');
      }
      
      const channelUpdateResult = await tx
        .update(crmContactChannels)
        .set({ contactId: primaryId, updatedAt: new Date() })
        .where(eq(crmContactChannels.contactId, secondaryId))
        .returning({ id: crmContactChannels.id });
      
      const conversationUpdateResult = await tx
        .update(conversations)
        .set({ contactId: primaryId })
        .where(eq(conversations.contactId, secondaryId))
        .returning({ id: conversations.id });
      
      const resolvedFields: Partial<CrmContact> = {};
      const fieldsToResolve = ['displayName', 'firstName', 'lastName', 'email', 'phone', 'city', 'country'] as const;
      
      for (const field of fieldsToResolve) {
        const resolution = fieldResolutions?.[field];
        if (resolution === 'secondary' && secondary[field]) {
          (resolvedFields as any)[field] = secondary[field];
        } else if (!primary[field] && secondary[field]) {
          (resolvedFields as any)[field] = secondary[field];
        }
      }
      
      const mergedCustomFields = {
        ...(secondary.customFields as Record<string, any> || {}),
        ...(primary.customFields as Record<string, any> || {}),
      };
      
      const [updatedPrimary] = await tx
        .update(crmContacts)
        .set({
          ...resolvedFields,
          customFields: mergedCustomFields,
          conversationCount: (primary.conversationCount || 0) + (secondary.conversationCount || 0),
          totalMessages: (primary.totalMessages || 0) + (secondary.totalMessages || 0),
          firstInteractionAt: primary.firstInteractionAt && secondary.firstInteractionAt
            ? (primary.firstInteractionAt < secondary.firstInteractionAt ? primary.firstInteractionAt : secondary.firstInteractionAt)
            : primary.firstInteractionAt || secondary.firstInteractionAt,
          updatedAt: new Date(),
        })
        .where(eq(crmContacts.id, primaryId))
        .returning();
      
      const mergeMetadata = {
        _mergeInfo: {
          mergedFromId: secondaryId,
          mergedAt: new Date().toISOString(),
          primaryId: primaryId,
          channelIds: channelUpdateResult.map(c => c.id),
          conversationIds: conversationUpdateResult.map(c => c.id),
          originalSecondary: {
            displayName: secondary.displayName,
            email: secondary.email,
            phone: secondary.phone,
            status: secondary.status,
            customFields: secondary.customFields,
          },
          originalPrimary: {
            displayName: primary.displayName,
            firstName: primary.firstName,
            lastName: primary.lastName,
            email: primary.email,
            phone: primary.phone,
            city: primary.city,
            country: primary.country,
            customFields: primary.customFields,
            conversationCount: primary.conversationCount,
            totalMessages: primary.totalMessages,
            firstInteractionAt: primary.firstInteractionAt?.toISOString(),
          }
        }
      };
      
      await tx
        .update(crmContacts)
        .set({
          status: 'archived',
          customFields: mergeMetadata,
          updatedAt: new Date(),
        })
        .where(eq(crmContacts.id, secondaryId));
      
      return {
        primary: updatedPrimary,
        mergedChannels: channelUpdateResult.length,
        mergedConversations: conversationUpdateResult.length,
      };
    });
  }

  async undoMerge(archivedContactId: string): Promise<{ restored: CrmContact; restoredChannels: number; restoredConversations: number } | null> {
    return await db.transaction(async (tx) => {
      const [archived] = await tx.select().from(crmContacts).where(eq(crmContacts.id, archivedContactId));
      
      if (!archived || archived.status !== 'archived') {
        return null;
      }
      
      const mergeInfo = (archived.customFields as any)?._mergeInfo;
      if (!mergeInfo || !mergeInfo.primaryId || !mergeInfo.mergedAt) {
        return null;
      }
      
      const mergedAt = new Date(mergeInfo.mergedAt);
      const gracePeriodMs = 15 * 60 * 1000;
      if (Date.now() - mergedAt.getTime() > gracePeriodMs) {
        throw new Error('GRACE_PERIOD_EXPIRED');
      }
      
      const channelUpdateResult = await tx
        .update(crmContactChannels)
        .set({ contactId: archivedContactId, updatedAt: new Date() })
        .where(sql`${crmContactChannels.id} = ANY(${mergeInfo.channelIds || []})`)
        .returning({ id: crmContactChannels.id });
      
      const conversationUpdateResult = await tx
        .update(conversations)
        .set({ contactId: archivedContactId })
        .where(sql`${conversations.id} = ANY(${mergeInfo.conversationIds || []})`)
        .returning({ id: conversations.id });
      
      const originalSecondary = mergeInfo.originalSecondary || {};
      const [restored] = await tx
        .update(crmContacts)
        .set({
          status: originalSecondary.status || 'lead',
          displayName: originalSecondary.displayName,
          email: originalSecondary.email,
          phone: originalSecondary.phone,
          customFields: originalSecondary.customFields || {},
          updatedAt: new Date(),
        })
        .where(eq(crmContacts.id, archivedContactId))
        .returning();
      
      const originalPrimary = mergeInfo.originalPrimary;
      if (originalPrimary) {
        await tx
          .update(crmContacts)
          .set({
            displayName: originalPrimary.displayName,
            firstName: originalPrimary.firstName,
            lastName: originalPrimary.lastName,
            email: originalPrimary.email,
            phone: originalPrimary.phone,
            city: originalPrimary.city,
            country: originalPrimary.country,
            customFields: originalPrimary.customFields || {},
            conversationCount: originalPrimary.conversationCount || 0,
            totalMessages: originalPrimary.totalMessages || 0,
            firstInteractionAt: originalPrimary.firstInteractionAt ? new Date(originalPrimary.firstInteractionAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(crmContacts.id, mergeInfo.primaryId));
      }
      
      return {
        restored,
        restoredChannels: channelUpdateResult.length,
        restoredConversations: conversationUpdateResult.length,
      };
    });
  }

  async createCrmContact(contact: InsertCrmContact): Promise<CrmContact> {
    const now = new Date();
    const [created] = await db
      .insert(crmContacts)
      .values({
        ...contact,
        firstInteractionAt: contact.firstInteractionAt || now,
        lastInteractionAt: contact.lastInteractionAt || now,
      })
      .returning();
    return created;
  }

  async createCrmContactWithChannel(
    contact: InsertCrmContact,
    channelData: { platform: string; externalId: string; username?: string; avatarUrl?: string }
  ): Promise<{ contact: CrmContact; channel: CrmContactChannel; linkedConversations: number; existingContact?: CrmContact; existingChannel?: CrmContactChannel }> {
    return await db.transaction(async (tx) => {
      const now = new Date();
      
      const existingResult = await tx
        .select({ 
          channel: crmContactChannels,
          contact: crmContacts 
        })
        .from(crmContactChannels)
        .innerJoin(crmContacts, eq(crmContactChannels.contactId, crmContacts.id))
        .where(and(
          eq(crmContacts.brandId, contact.brandId),
          eq(crmContactChannels.platform, channelData.platform),
          eq(crmContactChannels.externalId, channelData.externalId)
        ))
        .limit(1);
      
      if (existingResult.length > 0) {
        const err = new Error('CONTACT_ALREADY_EXISTS') as Error & { existingContact?: CrmContact; existingChannel?: CrmContactChannel };
        err.existingContact = existingResult[0].contact;
        err.existingChannel = existingResult[0].channel;
        throw err;
      }
      
      const [createdContact] = await tx
        .insert(crmContacts)
        .values({
          ...contact,
          firstInteractionAt: contact.firstInteractionAt || now,
          lastInteractionAt: contact.lastInteractionAt || now,
        })
        .returning();
      
      const [createdChannel] = await tx
        .insert(crmContactChannels)
        .values({
          contactId: createdContact.id,
          platform: channelData.platform,
          externalId: channelData.externalId,
          username: channelData.username || createdContact.displayName || null,
          avatarUrl: channelData.avatarUrl || null,
          isActive: true,
          messageCount: 0,
          firstMessageAt: now,
          lastMessageAt: now,
        })
        .returning();
      
      const updateResult = await tx
        .update(conversations)
        .set({ contactId: createdContact.id })
        .where(and(
          eq(conversations.brandId, contact.brandId),
          eq(conversations.platform, channelData.platform),
          eq(conversations.customerId, channelData.externalId),
          isNull(conversations.contactId)
        ))
        .returning({ id: conversations.id });
      
      return {
        contact: createdContact,
        channel: createdChannel,
        linkedConversations: updateResult.length,
      };
    });
  }

  async updateCrmContact(id: string, updates: UpdateCrmContact): Promise<CrmContact | undefined> {
    const [updated] = await db
      .update(crmContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async updateCrmContactCustomField(id: string, field: string, value: any): Promise<CrmContact | undefined> {
    const [updated] = await db
      .update(crmContacts)
      .set({
        customFields: sql`jsonb_set(COALESCE(${crmContacts.customFields}, '{}'), ${`{${field}}`}, ${JSON.stringify(value)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async incrementCrmContactMetrics(id: string, conversations?: number, messages?: number): Promise<CrmContact | undefined> {
    const updates: any = {
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (conversations) {
      updates.conversationCount = sql`COALESCE(${crmContacts.conversationCount}, 0) + ${conversations}`;
    }
    if (messages) {
      updates.totalMessages = sql`COALESCE(${crmContacts.totalMessages}, 0) + ${messages}`;
    }
    
    const [updated] = await db
      .update(crmContacts)
      .set(updates)
      .where(eq(crmContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCrmContact(id: string): Promise<boolean> {
    await db.delete(crmContactChannels).where(eq(crmContactChannels.contactId, id));
    await db.update(conversations).set({ contactId: null }).where(eq(conversations.contactId, id));
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
    return true;
  }

  // ============================================
  // CRM MODULE - Contact Channels (Identity Merge)
  // ============================================

  async getCrmContactChannels(contactId: string): Promise<CrmContactChannel[]> {
    return await db
      .select()
      .from(crmContactChannels)
      .where(eq(crmContactChannels.contactId, contactId))
      .orderBy(desc(crmContactChannels.lastMessageAt));
  }

  async getCrmContactChannel(id: string): Promise<CrmContactChannel | undefined> {
    const [channel] = await db.select().from(crmContactChannels).where(eq(crmContactChannels.id, id));
    return channel || undefined;
  }

  async findCrmContactChannelByExternal(brandId: string, platform: string, externalId: string): Promise<CrmContactChannel | undefined> {
    const [channel] = await db
      .select({ channel: crmContactChannels })
      .from(crmContactChannels)
      .innerJoin(crmContacts, eq(crmContactChannels.contactId, crmContacts.id))
      .where(and(
        eq(crmContacts.brandId, brandId),
        eq(crmContactChannels.platform, platform),
        eq(crmContactChannels.externalId, externalId)
      ));
    return channel?.channel || undefined;
  }

  async createCrmContactChannel(channel: InsertCrmContactChannel): Promise<CrmContactChannel> {
    const [created] = await db
      .insert(crmContactChannels)
      .values(channel)
      .returning();
    return created;
  }

  async updateCrmContactChannel(id: string, updates: UpdateCrmContactChannel): Promise<CrmContactChannel | undefined> {
    const [updated] = await db
      .update(crmContactChannels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmContactChannels.id, id))
      .returning();
    return updated || undefined;
  }

  async incrementCrmChannelMessageCount(id: string): Promise<CrmContactChannel | undefined> {
    const [updated] = await db
      .update(crmContactChannels)
      .set({
        messageCount: sql`COALESCE(${crmContactChannels.messageCount}, 0) + 1`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(crmContactChannels.id, id))
      .returning();
    return updated || undefined;
  }

  // ============================================
  // CRM MODULE - Contact Timeline (Unified History)
  // ============================================

  async getCrmContactTimeline(contactId: string, options?: { limit?: number }): Promise<Array<Message & { conversationPlatform: string; conversationType: string }>> {
    const channels = await this.getCrmContactChannels(contactId);
    
    if (channels.length === 0) {
      return [];
    }
    
    const orConditions = channels.map(ch => 
      and(
        eq(conversations.customerId, ch.externalId),
        eq(conversations.platform, ch.platform)
      )
    );
    
    const contactConversations = await db
      .select()
      .from(conversations)
      .where(or(...orConditions));
    
    if (contactConversations.length === 0) {
      return [];
    }
    
    const conversationIds = contactConversations.map(c => c.id);
    const conversationMap = new Map(contactConversations.map(c => [c.id, c]));
    
    const allMessages = await db
      .select()
      .from(messages)
      .where(sql`${messages.conversationId} IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(messages.timestamp))
      .limit(options?.limit || 100);
    
    return allMessages.map(msg => {
      const conv = conversationMap.get(msg.conversationId!);
      return {
        ...msg,
        conversationPlatform: conv?.platform || msg.platform,
        conversationType: conv?.type || msg.type,
      };
    });
  }

  async getCrmContactConversations(contactId: string): Promise<Conversation[]> {
    const channels = await this.getCrmContactChannels(contactId);
    
    if (channels.length === 0) {
      return [];
    }
    
    const orConditions = channels.map(ch => 
      and(
        eq(conversations.customerId, ch.externalId),
        eq(conversations.platform, ch.platform)
      )
    );
    
    return await db
      .select()
      .from(conversations)
      .where(or(...orConditions))
      .orderBy(desc(conversations.lastMessageAt));
  }

  // ============================================
  // CRM MODULE - Contact Limbo (Lazy Creation)
  // ============================================

  async getCrmContactLimbo(brandId: string, options?: { notPromoted?: boolean; limit?: number }): Promise<CrmContactLimbo[]> {
    let conditions = [eq(crmContactLimbo.brandId, brandId)];
    
    if (options?.notPromoted) {
      conditions.push(isNull(crmContactLimbo.promotedToContactId));
    }
    
    return await db
      .select()
      .from(crmContactLimbo)
      .where(and(...conditions))
      .orderBy(desc(crmContactLimbo.lastInteractionAt))
      .limit(options?.limit || 100);
  }

  async findCrmLimboEntry(brandId: string, platform: string, externalId: string): Promise<CrmContactLimbo | undefined> {
    const [entry] = await db
      .select()
      .from(crmContactLimbo)
      .where(and(
        eq(crmContactLimbo.brandId, brandId),
        eq(crmContactLimbo.platform, platform),
        eq(crmContactLimbo.externalId, externalId)
      ));
    return entry || undefined;
  }

  async getCrmLimboById(id: string): Promise<CrmContactLimbo | undefined> {
    const [entry] = await db
      .select()
      .from(crmContactLimbo)
      .where(eq(crmContactLimbo.id, id));
    return entry || undefined;
  }

  async upsertCrmLimboEntry(entry: InsertCrmContactLimbo): Promise<CrmContactLimbo> {
    const existing = await this.findCrmLimboEntry(entry.brandId, entry.platform, entry.externalId);
    
    if (existing) {
      const [updated] = await db
        .update(crmContactLimbo)
        .set({
          interactionCount: sql`COALESCE(${crmContactLimbo.interactionCount}, 0) + 1`,
          lastInteractionAt: entry.lastInteractionAt || new Date(),
          username: entry.username || existing.username,
          avatarUrl: entry.avatarUrl || existing.avatarUrl,
        })
        .where(eq(crmContactLimbo.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(crmContactLimbo)
      .values(entry)
      .returning();
    return created;
  }

  async promoteCrmLimboToContact(limboId: string, contactId: string): Promise<CrmContactLimbo | undefined> {
    const [updated] = await db
      .update(crmContactLimbo)
      .set({
        promotedToContactId: contactId,
        promotedAt: new Date(),
      })
      .where(eq(crmContactLimbo.id, limboId))
      .returning();
    return updated || undefined;
  }

  async updateCrmLimboCustomFields(id: string, customFields: Record<string, any>): Promise<CrmContactLimbo | undefined> {
    const existing = await this.getCrmLimboById(id);
    if (!existing) return undefined;
    
    const mergedFields = { ...(existing.customFields || {}), ...customFields };
    
    const [updated] = await db
      .update(crmContactLimbo)
      .set({ customFields: mergedFields })
      .where(eq(crmContactLimbo.id, id))
      .returning();
    return updated || undefined;
  }

  async updateCrmContactCustomFields(id: string, customFields: Record<string, any>): Promise<CrmContact | undefined> {
    const existing = await this.getCrmContact(id);
    if (!existing) return undefined;
    
    const mergedFields = { ...(existing.customFields || {}), ...customFields };
    
    const [updated] = await db
      .update(crmContacts)
      .set({ 
        customFields: mergedFields,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, id))
      .returning();
    return updated || undefined;
  }

  // ============================================
  // Conversation Lifecycle Module (PRD-LIFECYCLE)
  // ============================================

  async createConversationStatusHistory(entry: InsertConversationStatusHistory): Promise<ConversationStatusHistory> {
    const [created] = await db
      .insert(conversationStatusHistory)
      .values(entry)
      .returning();
    return created;
  }

  async getConversationStatusHistory(conversationId: string): Promise<ConversationStatusHistory[]> {
    return await db
      .select()
      .from(conversationStatusHistory)
      .where(eq(conversationStatusHistory.conversationId, conversationId))
      .orderBy(desc(conversationStatusHistory.createdAt));
  }

  async getBrandLifecycleSettings(brandId: string): Promise<BrandLifecycleSettings | undefined> {
    const [settings] = await db
      .select()
      .from(brandLifecycleSettings)
      .where(eq(brandLifecycleSettings.brandId, brandId));
    return settings || undefined;
  }

  async upsertBrandLifecycleSettings(settings: InsertBrandLifecycleSettings): Promise<BrandLifecycleSettings> {
    const existing = await this.getBrandLifecycleSettings(settings.brandId);
    
    if (existing) {
      const [updated] = await db
        .update(brandLifecycleSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(brandLifecycleSettings.brandId, settings.brandId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(brandLifecycleSettings)
      .values(settings)
      .returning();
    return created;
  }

  async updateBrandLifecycleSettings(brandId: string, updates: UpdateBrandLifecycleSettings): Promise<BrandLifecycleSettings | undefined> {
    const [updated] = await db
      .update(brandLifecycleSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(brandLifecycleSettings.brandId, brandId))
      .returning();
    return updated || undefined;
  }

  async getConversationsByStatus(brandId: string, status: ConversationStatus): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        eq(conversations.status, status)
      ))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getSolvedConversationsReadyForClose(brandId: string, hoursInSolved: number): Promise<Conversation[]> {
    const cutoffTime = new Date(Date.now() - hoursInSolved * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        eq(conversations.status, 'solved'),
        eq(conversations.type, 'dm'),
        lte(conversations.lastMessageAt, cutoffTime)
      ))
      .orderBy(conversations.lastMessageAt);
  }

  async getInactiveConversationsForAutoClose(brandId: string, inactivityHours: number): Promise<Conversation[]> {
    const cutoffTime = new Date(Date.now() - inactivityHours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        eq(conversations.type, 'dm'),
        or(
          eq(conversations.status, 'open'),
          eq(conversations.status, 'pending')
        ),
        lte(conversations.lastMessageAt, cutoffTime)
      ))
      .orderBy(conversations.lastMessageAt);
  }

  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus,
    closedBy?: ClosedBy,
    closedByUserId?: string
  ): Promise<Conversation | undefined> {
    const updateData: Record<string, any> = { status };
    
    if (status === 'closed' || status === 'solved') {
      updateData.closedAt = new Date();
      if (closedBy) updateData.closedBy = closedBy;
      if (closedByUserId) updateData.closedByUserId = closedByUserId;
    }
    
    // Calculate resolution time if closing
    if (status === 'closed' || status === 'solved') {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        const resolutionTimeMs = Date.now() - new Date(conversation.createdAt).getTime();
        updateData.resolutionTimeMinutes = Math.round(resolutionTimeMs / (1000 * 60));
      }
    }
    
    const [updated] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async updateConversationAiActive(conversationId: string, aiActive: boolean): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ aiActive })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async updateConversationAssignment(conversationId: string, userId: string | null): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({
        assignedToUserId: userId,
        assignedAt: userId ? new Date() : null,
        aiActive: !userId, // Disable AI when assigning to human
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async setFirstResponseAt(conversationId: string): Promise<Conversation | undefined> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation || conversation.firstResponseAt) return conversation;
    
    const [updated] = await db
      .update(conversations)
      .set({ firstResponseAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async updateLastCustomerMessageAt(conversationId: string): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ lastCustomerMessageAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async incrementReopenCount(conversationId: string): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({
        reopenCount: sql`COALESCE(${conversations.reopenCount}, 0) + 1`,
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async updateClosingSummary(
    conversationId: string,
    summary: string,
    sentiment: string,
    intent: string,
    resolution: string
  ): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({
        closingSummary: summary,
        closingSentiment: sentiment,
        closingIntent: intent,
        closingResolution: resolution,
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async getLifecycleMetrics(brandId: string, days: number = 30): Promise<{
    totalConversations: number;
    byStatus: Record<string, number>;
    avgResolutionTimeMinutes: number;
    avgFirstResponseTimeMinutes: number;
    reopenRate: number;
    botResolutions: number;
    agentResolutions: number;
    autoResolutions: number;
  }> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const allConversations = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        gte(conversations.createdAt, cutoffDate)
      ));
    
    const byStatus: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    let totalFirstResponseTime = 0;
    let firstResponseCount = 0;
    let reopenedCount = 0;
    let botResolutions = 0;
    let agentResolutions = 0;
    let autoResolutions = 0;
    
    for (const conv of allConversations) {
      byStatus[conv.status] = (byStatus[conv.status] || 0) + 1;
      
      if (conv.resolutionTimeMinutes) {
        totalResolutionTime += conv.resolutionTimeMinutes;
        resolutionCount++;
      }
      
      if (conv.firstResponseAt) {
        const firstResponseTime = new Date(conv.firstResponseAt).getTime() - new Date(conv.createdAt).getTime();
        totalFirstResponseTime += firstResponseTime / (1000 * 60);
        firstResponseCount++;
      }
      
      if ((conv.reopenCount || 0) > 0) {
        reopenedCount++;
      }
      
      if (conv.closedBy === 'bot') botResolutions++;
      else if (conv.closedBy === 'agent') agentResolutions++;
      else if (conv.closedBy === 'auto') autoResolutions++;
    }
    
    return {
      totalConversations: allConversations.length,
      byStatus,
      avgResolutionTimeMinutes: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      avgFirstResponseTimeMinutes: firstResponseCount > 0 ? totalFirstResponseTime / firstResponseCount : 0,
      reopenRate: allConversations.length > 0 ? (reopenedCount / allConversations.length) * 100 : 0,
      botResolutions,
      agentResolutions,
      autoResolutions,
    };
  }

  // ============================================
  // SMART CUSTOMER FOLLOW-UP SYSTEM
  // ============================================

  // Reminder Rules
  async getReminderRules(brandId: string): Promise<ReminderRules | undefined> {
    const [rules] = await db
      .select()
      .from(reminderRules)
      .where(eq(reminderRules.brandId, brandId));
    return rules || undefined;
  }

  async upsertReminderRules(rules: InsertReminderRules): Promise<ReminderRules> {
    const existing = await this.getReminderRules(rules.brandId);
    
    if (existing) {
      const [updated] = await db
        .update(reminderRules)
        .set({
          ...rules,
          updatedAt: new Date(),
        })
        .where(eq(reminderRules.brandId, rules.brandId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(reminderRules)
      .values(rules)
      .returning();
    return created;
  }

  async updateReminderRules(brandId: string, updates: UpdateReminderRules): Promise<ReminderRules | undefined> {
    const [updated] = await db
      .update(reminderRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(reminderRules.brandId, brandId))
      .returning();
    return updated || undefined;
  }

  // Reminder Events
  async createReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent> {
    const [created] = await db
      .insert(reminderEvents)
      .values(event)
      .returning();
    return created;
  }

  async getReminderEventsByConversation(conversationId: string): Promise<ReminderEvent[]> {
    return await db
      .select()
      .from(reminderEvents)
      .where(eq(reminderEvents.conversationId, conversationId))
      .orderBy(desc(reminderEvents.createdAt));
  }

  async getReminderEventsByContact(contactId: string): Promise<ReminderEvent[]> {
    return await db
      .select()
      .from(reminderEvents)
      .where(eq(reminderEvents.contactId, contactId))
      .orderBy(desc(reminderEvents.createdAt));
  }

  async getReminderEventsByBrand(brandId: string, options?: { status?: string; limit?: number }): Promise<ReminderEvent[]> {
    let query = db
      .select()
      .from(reminderEvents)
      .where(
        options?.status 
          ? and(eq(reminderEvents.brandId, brandId), eq(reminderEvents.status, options.status))
          : eq(reminderEvents.brandId, brandId)
      )
      .orderBy(desc(reminderEvents.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    
    return await query;
  }

  async getReminderEventsWithConversationByBrand(brandId: string, options?: { status?: string; limit?: number }): Promise<Array<{
    id: string;
    brandId: string;
    conversationId: string;
    contactId: string | null;
    reminderNumber: number;
    status: string;
    content: string | null;
    contentSource: string | null;
    contextSnapshot: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
    conversationType: string | null;
    conversationPlatform: string | null;
    customerName: string | null;
    socialPostId: string | null;
  }>> {
    const conditions = options?.status 
      ? and(eq(reminderEvents.brandId, brandId), eq(reminderEvents.status, options.status))
      : eq(reminderEvents.brandId, brandId);
    
    const results = await db
      .select({
        id: reminderEvents.id,
        brandId: reminderEvents.brandId,
        conversationId: reminderEvents.conversationId,
        contactId: reminderEvents.contactId,
        reminderNumber: reminderEvents.reminderNumber,
        status: reminderEvents.status,
        content: reminderEvents.content,
        contentSource: reminderEvents.contentSource,
        contextSnapshot: reminderEvents.contextSnapshot,
        scheduledAt: reminderEvents.scheduledAt,
        sentAt: reminderEvents.sentAt,
        errorMessage: reminderEvents.errorMessage,
        createdAt: reminderEvents.createdAt,
        conversationType: conversations.type,
        conversationPlatform: conversations.platform,
        customerName: conversations.customerName,
        socialPostId: conversations.socialPostId,
      })
      .from(reminderEvents)
      .leftJoin(conversations, eq(reminderEvents.conversationId, conversations.id))
      .where(conditions)
      .orderBy(desc(reminderEvents.createdAt))
      .limit(options?.limit || 50);
    
    return results;
  }

  async updateReminderEventStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<ReminderEvent | undefined> {
    const updateData: Record<string, any> = { status };
    if (sentAt) updateData.sentAt = sentAt;
    if (errorMessage) updateData.errorMessage = errorMessage;
    
    const [updated] = await db
      .update(reminderEvents)
      .set(updateData)
      .where(eq(reminderEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async updateReminderEventContent(id: string, content: string): Promise<ReminderEvent | undefined> {
    const [updated] = await db
      .update(reminderEvents)
      .set({ content })
      .where(eq(reminderEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async getScheduledRemindersReady(brandId: string): Promise<ReminderEvent[]> {
    const now = new Date();
    return await db
      .select()
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'scheduled'),
        lte(reminderEvents.scheduledAt, now)
      ))
      .orderBy(reminderEvents.scheduledAt);
  }

  async countRemindersSentToday(brandId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'sent'),
        gte(reminderEvents.sentAt, startOfDay)
      ));
    
    return result[0]?.count || 0;
  }

  async countRemindersScheduledAndSentToday(brandId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const sentTodayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'sent'),
        gte(reminderEvents.sentAt, startOfDay)
      ));
    
    const scheduledTodayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'scheduled'),
        gte(reminderEvents.scheduledAt, startOfDay),
        sql`${reminderEvents.scheduledAt} < ${endOfDay}`
      ));
    
    const sentToday = sentTodayResult[0]?.count || 0;
    const scheduledToday = scheduledTodayResult[0]?.count || 0;
    
    return sentToday + scheduledToday;
  }

  async checkConversationEligibleForReminder(conversationId: string, maxReminders: number): Promise<{
    eligible: boolean;
    reason?: 'not_found' | 'already_scheduled' | 'opted_out' | 'max_reached' | 'closed' | 'not_replied';
    currentReminderCount?: number;
  }> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      return { eligible: false, reason: 'not_found' };
    }
    
    if (conversation.status === 'closed') {
      return { eligible: false, reason: 'closed', currentReminderCount: conversation.reminderCount || 0 };
    }
    
    if (conversation.reminderStatus === 'scheduled') {
      return { eligible: false, reason: 'already_scheduled', currentReminderCount: conversation.reminderCount || 0 };
    }
    
    if (conversation.reminderStatus === 'opted_out') {
      return { eligible: false, reason: 'opted_out', currentReminderCount: conversation.reminderCount || 0 };
    }
    
    if (conversation.reminderStatus === 'max_reached') {
      return { eligible: false, reason: 'max_reached', currentReminderCount: conversation.reminderCount || 0 };
    }
    
    const currentReminderCount = conversation.reminderCount || 0;
    if (currentReminderCount >= maxReminders) {
      return { eligible: false, reason: 'max_reached', currentReminderCount };
    }
    
    const timestampResult = await db.execute(sql`
      SELECT 
        MAX(CASE WHEN direction = 'inbound' THEN timestamp END) as last_inbound_at,
        MAX(CASE WHEN direction = 'outbound' THEN timestamp END) as last_outbound_at
      FROM messages
      WHERE conversation_id = ${conversationId}
    `);
    
    const timestamps = timestampResult.rows[0] as any;
    const lastInboundAt = timestamps?.last_inbound_at;
    const lastOutboundAt = timestamps?.last_outbound_at;
    
    if (!lastOutboundAt || !lastInboundAt || new Date(lastOutboundAt) <= new Date(lastInboundAt)) {
      return { eligible: false, reason: 'not_replied', currentReminderCount };
    }
    
    const pendingReminders = await db
      .select({ id: reminderEvents.id })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.conversationId, conversationId),
        eq(reminderEvents.status, 'scheduled')
      ))
      .limit(1);
    
    if (pendingReminders.length > 0) {
      return { eligible: false, reason: 'already_scheduled', currentReminderCount };
    }
    
    return { eligible: true, currentReminderCount };
  }

  async scheduleReminderAtomic(
    conversationId: string,
    event: InsertReminderEvent,
    newReminderStatus: ReminderStatus,
    maxReminders: number
  ): Promise<{
    status: 'scheduled' | 'max_reached' | 'already_scheduled' | 'opted_out' | 'not_found' | 'duplicate';
    event?: ReminderEvent;
  }> {
    try {
      return await db.transaction(async (tx) => {
        const [conversation] = await tx
          .select()
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .for('update');
        
        if (!conversation) {
          return { status: 'not_found' };
        }
        
        if (conversation.reminderStatus === 'scheduled') {
          return { status: 'already_scheduled' };
        }
        
        if (conversation.reminderStatus === 'opted_out') {
          return { status: 'opted_out' };
        }
        
        if (conversation.reminderStatus === 'max_reached') {
          return { status: 'max_reached' };
        }
        
        const pendingReminders = await tx
          .select({ id: reminderEvents.id })
          .from(reminderEvents)
          .where(and(
            eq(reminderEvents.conversationId, conversationId),
            eq(reminderEvents.status, 'scheduled')
          ))
          .limit(1);
        
        if (pendingReminders.length > 0) {
          return { status: 'already_scheduled' };
        }
        
        const currentReminderCount = conversation.reminderCount || 0;
        
        if (currentReminderCount >= maxReminders) {
          await tx
            .update(conversations)
            .set({ reminderStatus: 'max_reached' })
            .where(eq(conversations.id, conversationId));
          return { status: 'max_reached' };
        }
        
        const eventWithCorrectNumber = {
          ...event,
          reminderNumber: currentReminderCount + 1,
        };
        
        console.log(`[Storage] Inserting reminder event with contextSnapshot:`, 
          JSON.stringify(eventWithCorrectNumber.contextSnapshot));
        
        const [createdEvent] = await tx
          .insert(reminderEvents)
          .values(eventWithCorrectNumber)
          .returning();
        
        console.log(`[Storage] Created reminder event ${createdEvent.id}, contextSnapshot saved:`, 
          createdEvent.contextSnapshot !== null && createdEvent.contextSnapshot !== undefined);
        
        await tx
          .update(conversations)
          .set({
            reminderStatus: newReminderStatus,
            lastReminderAt: new Date(),
            reminderCount: currentReminderCount + 1,
          })
          .where(eq(conversations.id, conversationId));
        
        return { status: 'scheduled', event: createdEvent };
      });
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
        console.log(`[Storage] Reminder already scheduled for conversation ${conversationId}, skipping`);
        return { status: 'duplicate' };
      }
      throw error;
    }
  }

  // Conversation Reminder Updates
  async updateConversationReminderStatus(conversationId: string, status: ReminderStatus, reminderCount?: number): Promise<Conversation | undefined> {
    const updateData: Record<string, any> = { 
      reminderStatus: status,
      lastReminderAt: new Date()
    };
    if (reminderCount !== undefined) {
      updateData.reminderCount = reminderCount;
    }
    
    const [updated] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async getConversationsEligibleForReminder(brandId: string, delayHours: number, maxReminders: number, types: string[], forReminderNumber?: number): Promise<Conversation[]> {
    const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000);
    
    if (types.length === 0) {
      return [];
    }
    
    const typesCondition = sql`c.type IN (${sql.join(types.map(t => sql`${t}`), sql`, `)})`;
    
    const result = await db.execute(sql`
      WITH message_timestamps AS (
        SELECT 
          m.conversation_id,
          MAX(CASE WHEN m.direction = 'inbound' THEN m.timestamp END) as last_inbound_at,
          MAX(CASE WHEN m.direction = 'outbound' THEN m.timestamp END) as last_outbound_at
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.brand_id = ${brandId}
          AND ${typesCondition}
        GROUP BY m.conversation_id
      )
      SELECT c.*
      FROM conversations c
      JOIN message_timestamps mt ON mt.conversation_id = c.id
      WHERE c.brand_id = ${brandId}
        AND c.status NOT IN ('closed')
        AND ${typesCondition}
        AND COALESCE(c.reminder_status, 'none') NOT IN ('scheduled', 'max_reached', 'opted_out')
        AND COALESCE(c.reminder_count, 0) < ${maxReminders}
        ${forReminderNumber !== undefined 
          ? sql`AND COALESCE(c.reminder_count, 0) = ${forReminderNumber - 1}` 
          : sql``}
        -- CRITICAL: Must have responded (outbound) AFTER customer's last message (inbound)
        AND mt.last_outbound_at IS NOT NULL
        AND mt.last_inbound_at IS NOT NULL
        AND mt.last_outbound_at > mt.last_inbound_at
        -- Customer has not replied since our response
        AND mt.last_inbound_at <= ${cutoffTime}
        ${forReminderNumber !== undefined && forReminderNumber > 1
          ? sql`
            -- For subsequent reminders, also check time since last reminder
            AND c.last_reminder_at IS NOT NULL
            AND c.last_reminder_at <= ${cutoffTime}
            -- Customer has not replied since last reminder
            AND mt.last_inbound_at <= c.last_reminder_at
          `
          : sql``}
      ORDER BY mt.last_inbound_at ASC
    `);
    
    return result.rows.map(row => transformRowToCamelCase<Conversation>(row as Record<string, unknown>));
  }

  // Contact Reminder Updates
  async updateContactReminderCount(contactId: string): Promise<CrmContact | undefined> {
    const [updated] = await db
      .update(crmContacts)
      .set({
        reminderCount: sql`COALESCE(${crmContacts.reminderCount}, 0) + 1`,
        lastReminderAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, contactId))
      .returning();
    return updated || undefined;
  }

  async updateContactOptOutReminders(contactId: string, optOut: boolean): Promise<CrmContact | undefined> {
    const [updated] = await db
      .update(crmContacts)
      .set({
        optOutReminders: optOut,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, contactId))
      .returning();
    return updated || undefined;
  }

  // Reminder Analytics
  private getTimeRangeStart(timeRange: 'today' | '7d' | '30d'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      case '7d':
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        week.setHours(0, 0, 0, 0);
        return week;
      case '30d':
        const month = new Date(now);
        month.setDate(month.getDate() - 30);
        month.setHours(0, 0, 0, 0);
        return month;
    }
  }

  async getReminderStats(brandId: string, timeRange: 'today' | '7d' | '30d'): Promise<{
    totalSent: number;
    totalScheduled: number;
    totalFailed: number;
    totalCancelled: number;
    totalOptedOut: number;
    conversionCount: number;
    conversionRate: number;
    avgResponseMinutes: number | null;
    dailyCapUsage: number;
    dailyCapLimit: number;
  }> {
    const startDate = this.getTimeRangeStart(timeRange);
    
    // Get status counts
    const statusCounts = await db
      .select({
        status: reminderEvents.status,
        count: sql<number>`count(*)::int`
      })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        gte(reminderEvents.createdAt, startDate)
      ))
      .groupBy(reminderEvents.status);
    
    const countsByStatus: Record<string, number> = {};
    statusCounts.forEach(row => {
      countsByStatus[row.status] = row.count;
    });
    
    const totalSent = countsByStatus['sent'] || 0;
    const totalScheduled = countsByStatus['scheduled'] || 0;
    const totalFailed = countsByStatus['failed'] || 0;
    const totalCancelled = countsByStatus['cancelled'] || 0;
    
    // Count opted out conversations
    const optedOutResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        eq(conversations.reminderStatus, 'opted_out')
      ));
    const totalOptedOut = optedOutResult[0]?.count || 0;
    
    // Count conversions (customer replied after reminder was sent)
    // A conversion = reminder sent, then customer sent a message after the reminder
    const conversionResult = await db
      .select({ count: sql<number>`count(DISTINCT ${reminderEvents.conversationId})::int` })
      .from(reminderEvents)
      .innerJoin(conversations, eq(reminderEvents.conversationId, conversations.id))
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'sent'),
        gte(reminderEvents.createdAt, startDate),
        isNotNull(conversations.lastCustomerMessageAt),
        sql`${conversations.lastCustomerMessageAt} > ${reminderEvents.sentAt}`
      ));
    const conversionCount = conversionResult[0]?.count || 0;
    
    // Calculate conversion rate
    const conversionRate = totalSent > 0 ? (conversionCount / totalSent) * 100 : 0;
    
    // Calculate average response time for conversions
    const avgResponseResult = await db
      .select({
        avgMinutes: sql<number>`AVG(EXTRACT(EPOCH FROM (${conversations.lastCustomerMessageAt} - ${reminderEvents.sentAt})) / 60)::float`
      })
      .from(reminderEvents)
      .innerJoin(conversations, eq(reminderEvents.conversationId, conversations.id))
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'sent'),
        gte(reminderEvents.createdAt, startDate),
        isNotNull(conversations.lastCustomerMessageAt),
        sql`${conversations.lastCustomerMessageAt} > ${reminderEvents.sentAt}`
      ));
    const avgResponseMinutes = avgResponseResult[0]?.avgMinutes || null;
    
    // Daily cap usage (today only)
    const dailyCapUsage = await this.countRemindersScheduledAndSentToday(brandId);
    
    // Get daily cap limit from rules
    const rules = await this.getReminderRules(brandId);
    const dailyCapLimit = rules?.dailyBrandCap || 50;
    
    return {
      totalSent,
      totalScheduled,
      totalFailed,
      totalCancelled,
      totalOptedOut,
      conversionCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgResponseMinutes: avgResponseMinutes ? Math.round(avgResponseMinutes) : null,
      dailyCapUsage,
      dailyCapLimit,
    };
  }

  async getReminderTimeline(brandId: string, timeRange: 'today' | '7d' | '30d'): Promise<Array<{
    date: string;
    sent: number;
    conversions: number;
    failed: number;
  }>> {
    const startDate = this.getTimeRangeStart(timeRange);
    
    // Get daily sent/failed counts
    const dailyEvents = await db
      .select({
        date: sql<string>`date_trunc('day', ${reminderEvents.createdAt})::date::text`,
        status: reminderEvents.status,
        count: sql<number>`count(*)::int`
      })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        gte(reminderEvents.createdAt, startDate),
        or(
          eq(reminderEvents.status, 'sent'),
          eq(reminderEvents.status, 'failed')
        )
      ))
      .groupBy(sql`date_trunc('day', ${reminderEvents.createdAt})`, reminderEvents.status)
      .orderBy(sql`date_trunc('day', ${reminderEvents.createdAt})`);
    
    // Get daily conversions
    const dailyConversions = await db
      .select({
        date: sql<string>`date_trunc('day', ${conversations.lastCustomerMessageAt})::date::text`,
        count: sql<number>`count(DISTINCT ${reminderEvents.conversationId})::int`
      })
      .from(reminderEvents)
      .innerJoin(conversations, eq(reminderEvents.conversationId, conversations.id))
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'sent'),
        gte(reminderEvents.createdAt, startDate),
        isNotNull(conversations.lastCustomerMessageAt),
        sql`${conversations.lastCustomerMessageAt} > ${reminderEvents.sentAt}`
      ))
      .groupBy(sql`date_trunc('day', ${conversations.lastCustomerMessageAt})`)
      .orderBy(sql`date_trunc('day', ${conversations.lastCustomerMessageAt})`);
    
    // Merge into timeline
    const timelineMap: Record<string, { sent: number; conversions: number; failed: number }> = {};
    
    dailyEvents.forEach(row => {
      if (!timelineMap[row.date]) {
        timelineMap[row.date] = { sent: 0, conversions: 0, failed: 0 };
      }
      if (row.status === 'sent') {
        timelineMap[row.date].sent = row.count;
      } else if (row.status === 'failed') {
        timelineMap[row.date].failed = row.count;
      }
    });
    
    dailyConversions.forEach(row => {
      if (!timelineMap[row.date]) {
        timelineMap[row.date] = { sent: 0, conversions: 0, failed: 0 };
      }
      timelineMap[row.date].conversions = row.count;
    });
    
    // Convert to sorted array
    return Object.entries(timelineMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getReminderFailureReasons(brandId: string, timeRange: 'today' | '7d' | '30d', limit: number = 10): Promise<Array<{
    reason: string;
    count: number;
  }>> {
    const startDate = this.getTimeRangeStart(timeRange);
    
    const failureReasons = await db
      .select({
        reason: sql<string>`COALESCE(${reminderEvents.errorMessage}, 'Unknown error')`,
        count: sql<number>`count(*)::int`
      })
      .from(reminderEvents)
      .where(and(
        eq(reminderEvents.brandId, brandId),
        eq(reminderEvents.status, 'failed'),
        gte(reminderEvents.createdAt, startDate)
      ))
      .groupBy(reminderEvents.errorMessage)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);
    
    return failureReasons;
  }

  async getConversationTimeline(conversationId: string): Promise<ConversationTimeline | null> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    const events: TimelineEvent[] = [];

    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    const summaries = await db
      .select()
      .from(conversationUserSummaries)
      .where(eq(conversationUserSummaries.conversationId, conversationId))
      .orderBy(conversationUserSummaries.updatedAt);

    const reminders = await db
      .select()
      .from(reminderEvents)
      .where(eq(reminderEvents.conversationId, conversationId))
      .orderBy(reminderEvents.createdAt);

    const statusHistory = await db
      .select()
      .from(conversationStatusHistory)
      .where(eq(conversationStatusHistory.conversationId, conversationId))
      .orderBy(conversationStatusHistory.createdAt);

    const toISOString = (date: Date | string | null | undefined): Date => {
      if (!date) return new Date();
      return date instanceof Date ? date : new Date(date);
    };

    let firstContactAdded = false;
    for (const msg of allMessages) {
      const isInbound = msg.direction === 'inbound';
      const isAiReply = msg.source === 'repliyo' && msg.internalOrigin === 'ai';
      
      if (isInbound && !firstContactAdded) {
        events.push({
          id: `first_contact_${msg.id}`,
          type: 'first_contact',
          timestamp: toISOString(msg.timestamp),
          title: 'Primer contacto',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            platform: msg.platform,
            author: msg.author,
            content: msg.content || undefined,
          }
        });
        firstContactAdded = true;
      } else if (isAiReply) {
        events.push({
          id: `ai_reply_${msg.id}`,
          type: 'ai_reply',
          timestamp: toISOString(msg.timestamp),
          title: 'Respuesta automática de IA',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            direction: 'outbound',
            content: msg.content || undefined,
          }
        });
      } else if (isInbound) {
        events.push({
          id: `msg_in_${msg.id}`,
          type: 'message_inbound',
          timestamp: toISOString(msg.timestamp),
          title: `Mensaje de ${msg.author}`,
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            author: msg.author,
            content: msg.content || undefined,
          }
        });
      } else {
        events.push({
          id: `msg_out_${msg.id}`,
          type: 'message_outbound',
          timestamp: toISOString(msg.timestamp),
          title: 'Respuesta de la marca',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            direction: 'outbound',
            content: msg.content || undefined,
          }
        });
      }
    }

    for (const summary of summaries) {
      events.push({
        id: `summary_${summary.id}`,
        type: 'summary_generated',
        timestamp: toISOString(summary.updatedAt),
        title: 'Resumen de conversación generado',
        description: summary.summary?.substring(0, 200) || undefined,
        metadata: {
          summaryId: summary.id,
          author: summary.author,
        }
      });
    }

    for (const reminder of reminders) {
      if (reminder.status === 'scheduled') {
        events.push({
          id: `reminder_scheduled_${reminder.id}`,
          type: 'reminder_scheduled',
          timestamp: toISOString(reminder.scheduledAt),
          title: `Recordatorio #${reminder.reminderNumber} programado`,
          metadata: {
            reminderEventId: reminder.id,
            reminderNumber: reminder.reminderNumber,
          }
        });
      } else if (reminder.status === 'sent') {
        events.push({
          id: `reminder_sent_${reminder.id}`,
          type: 'reminder_sent',
          timestamp: toISOString(reminder.sentAt || reminder.createdAt),
          title: `Recordatorio #${reminder.reminderNumber} enviado`,
          description: reminder.content?.substring(0, 150) || undefined,
          metadata: {
            reminderEventId: reminder.id,
            reminderNumber: reminder.reminderNumber,
            content: reminder.content || undefined,
          }
        });
      }
    }

    for (const status of statusHistory) {
      events.push({
        id: `status_${status.id}`,
        type: 'status_change',
        timestamp: toISOString(status.createdAt),
        title: `Estado cambiado a ${status.newStatus}`,
        description: status.reason || undefined,
        metadata: {
          statusHistoryId: status.id,
          previousStatus: status.previousStatus || undefined,
          newStatus: status.newStatus,
        }
      });
    }

    if (conversation.reminderStatus === 'opted_out') {
      events.push({
        id: `opt_out_${conversationId}`,
        type: 'opt_out',
        timestamp: toISOString(conversation.lastMessageAt),
        title: 'Cliente optó por no recibir recordatorios',
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const inboundMessages = allMessages.filter(m => m.direction === 'inbound');
    const firstMessage = allMessages[0];
    const lastMessage = allMessages[allMessages.length - 1];
    const lastSummary = summaries[summaries.length - 1];

    return {
      conversationId,
      customerName: conversation.customerName || conversation.customerId,
      platform: conversation.platform,
      events,
      summary: {
        firstContactAt: toISOString(firstMessage?.timestamp || conversation.createdAt),
        lastActivityAt: toISOString(lastMessage?.timestamp || conversation.lastMessageAt),
        totalMessages: allMessages.length,
        totalReminders: reminders.filter(r => r.status === 'sent').length,
        currentStatus: conversation.status,
        detectedIntent: conversation.closingIntent || lastSummary?.summary?.substring(0, 100) || undefined,
      }
    };
  }

  async getContactTimeline(contactId: string): Promise<ConversationTimeline | null> {
    const contact = await this.getCrmContact(contactId);
    if (!contact) {
      return null;
    }

    const contactConversations = await this.getCrmContactConversations(contactId);
    const toDateString = (date: Date | string | null | undefined): string => {
      if (!date) return new Date().toISOString();
      return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    };

    if (contactConversations.length === 0) {
      return {
        conversationId: contactId,
        customerName: contact.displayName || 'Sin nombre',
        platform: 'multi',
        events: [],
        summary: {
          firstContactAt: toDateString(contact.firstInteractionAt || contact.createdAt),
          lastActivityAt: toDateString(contact.lastInteractionAt || contact.createdAt),
          totalMessages: contact.totalMessages,
          totalReminders: 0,
          currentStatus: contact.status || 'lead',
        }
      };
    }

    const events: TimelineEvent[] = [];
    const conversationIds = contactConversations.map(c => c.id);
    const toISOString = toDateString;

    const allMessages = await db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(messages.timestamp);

    const summaries = await db
      .select()
      .from(conversationUserSummaries)
      .where(inArray(conversationUserSummaries.conversationId, conversationIds))
      .orderBy(conversationUserSummaries.updatedAt);

    const reminders = await db
      .select()
      .from(reminderEvents)
      .where(inArray(reminderEvents.conversationId, conversationIds))
      .orderBy(reminderEvents.createdAt);

    const statusHistory = await db
      .select()
      .from(conversationStatusHistory)
      .where(inArray(conversationStatusHistory.conversationId, conversationIds))
      .orderBy(conversationStatusHistory.createdAt);

    let firstContactAdded = false;
    for (const msg of allMessages) {
      const isInbound = msg.direction === 'inbound';
      const isAiReply = msg.source === 'repliyo' && msg.internalOrigin === 'ai';
      
      if (isInbound && !firstContactAdded) {
        events.push({
          id: `first_contact_${msg.id}`,
          type: 'first_contact',
          timestamp: toISOString(msg.timestamp),
          title: 'Primer contacto',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            platform: msg.platform,
            author: msg.author,
            content: msg.content || undefined,
          }
        });
        firstContactAdded = true;
      } else if (isAiReply) {
        events.push({
          id: `ai_reply_${msg.id}`,
          type: 'ai_reply',
          timestamp: toISOString(msg.timestamp),
          title: 'Respuesta automática de IA',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            direction: 'outbound',
            platform: msg.platform,
            content: msg.content || undefined,
          }
        });
      } else if (isInbound) {
        events.push({
          id: `msg_in_${msg.id}`,
          type: 'message_inbound',
          timestamp: toISOString(msg.timestamp),
          title: `Mensaje de ${msg.author}`,
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            author: msg.author,
            platform: msg.platform,
            content: msg.content || undefined,
          }
        });
      } else {
        events.push({
          id: `msg_out_${msg.id}`,
          type: 'message_outbound',
          timestamp: toISOString(msg.timestamp),
          title: 'Respuesta de la marca',
          description: msg.content?.substring(0, 150) || undefined,
          metadata: {
            messageId: msg.id,
            direction: 'outbound',
            platform: msg.platform,
            content: msg.content || undefined,
          }
        });
      }
    }

    for (const summary of summaries) {
      events.push({
        id: `summary_${summary.id}`,
        type: 'summary_generated',
        timestamp: toISOString(summary.updatedAt),
        title: 'Resumen de conversación generado',
        description: summary.summary?.substring(0, 200) || undefined,
        metadata: {
          summaryId: summary.id,
          author: summary.author,
        }
      });
    }

    for (const reminder of reminders) {
      if (reminder.status === 'scheduled') {
        events.push({
          id: `reminder_scheduled_${reminder.id}`,
          type: 'reminder_scheduled',
          timestamp: toISOString(reminder.scheduledAt),
          title: `Recordatorio #${reminder.reminderNumber} programado`,
          metadata: {
            reminderEventId: reminder.id,
            reminderNumber: reminder.reminderNumber,
          }
        });
      } else if (reminder.status === 'sent') {
        events.push({
          id: `reminder_sent_${reminder.id}`,
          type: 'reminder_sent',
          timestamp: toISOString(reminder.sentAt || reminder.createdAt),
          title: `Recordatorio #${reminder.reminderNumber} enviado`,
          description: reminder.content?.substring(0, 150) || undefined,
          metadata: {
            reminderEventId: reminder.id,
            reminderNumber: reminder.reminderNumber,
            content: reminder.content || undefined,
          }
        });
      }
    }

    for (const status of statusHistory) {
      events.push({
        id: `status_${status.id}`,
        type: 'status_change',
        timestamp: toISOString(status.createdAt),
        title: `Estado cambiado a ${status.newStatus}`,
        description: status.reason || undefined,
        metadata: {
          statusHistoryId: status.id,
          previousStatus: status.previousStatus || undefined,
          newStatus: status.newStatus,
        }
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const firstMessage = allMessages[0];
    const lastMessage = allMessages[allMessages.length - 1];

    return {
      conversationId: contactId,
      customerName: contact.displayName || 'Sin nombre',
      platform: 'multi',
      events,
      summary: {
        firstContactAt: toISOString(firstMessage?.timestamp || contact.firstInteractionAt || contact.createdAt),
        lastActivityAt: toISOString(lastMessage?.timestamp || contact.lastInteractionAt || contact.createdAt),
        totalMessages: allMessages.length,
        totalReminders: reminders.filter(r => r.status === 'sent').length,
        currentStatus: contact.status || 'lead',
      }
    };
  }
  
  async getKnownBrandAccountNames(platform: string): Promise<Set<string>> {
    const normalizedPlatform = platform.toLowerCase();
    
    const result = await db
      .selectDistinct({ author: messages.author })
      .from(messages)
      .where(
        and(
          eq(messages.direction, 'outbound'),
          eq(messages.source, 'metricool_sync'),
          sql`LOWER(${messages.platform}) = ${normalizedPlatform}`
        )
      );
    
    const accountNames = new Set<string>();
    for (const row of result) {
      if (row.author) {
        accountNames.add(row.author.toLowerCase());
      }
    }
    
    return accountNames;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async getMetaPageConnections(brandId: string): Promise<MetaPageConnection[]> {
    return await db
      .select()
      .from(metaPageConnections)
      .where(eq(metaPageConnections.brandId, brandId))
      .orderBy(desc(metaPageConnections.createdAt));
  }

  async getMetaPageConnectionByPageId(brandId: string, pageId: string): Promise<MetaPageConnection | undefined> {
    const [row] = await db
      .select()
      .from(metaPageConnections)
      .where(and(eq(metaPageConnections.brandId, brandId), eq(metaPageConnections.pageId, pageId)));
    return row;
  }

  async upsertMetaPageConnection(data: InsertMetaPageConnection): Promise<MetaPageConnection> {
    const [row] = await db
      .insert(metaPageConnections)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [metaPageConnections.brandId, metaPageConnections.pageId],
        set: {
          pageName: data.pageName,
          pageAccessToken: data.pageAccessToken,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async updateMetaPageConnection(id: string, data: UpdateMetaPageConnection): Promise<MetaPageConnection | undefined> {
    const [row] = await db
      .update(metaPageConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(metaPageConnections.id, id))
      .returning();
    return row;
  }

  async deleteMetaPageConnection(id: string): Promise<void> {
    await db.delete(metaPageConnections).where(eq(metaPageConnections.id, id));
  }

  async createPublicAccessToken(data: InsertPublicAccessToken): Promise<PublicAccessToken> {
    return await db.transaction(async (tx) => {
      await tx
        .update(publicAccessTokens)
        .set({ isActive: false, revokedAt: new Date() })
        .where(and(eq(publicAccessTokens.brandId, data.brandId), eq(publicAccessTokens.isActive, true)));
      const [token] = await tx.insert(publicAccessTokens).values(data).returning();
      return token;
    });
  }

  async getActivePublicAccessToken(brandId: string): Promise<PublicAccessToken | undefined> {
    const [token] = await db
      .select()
      .from(publicAccessTokens)
      .where(and(eq(publicAccessTokens.brandId, brandId), eq(publicAccessTokens.isActive, true)));
    return token;
  }

  async getPublicAccessTokenById(id: string): Promise<PublicAccessToken | undefined> {
    const [row] = await db
      .select()
      .from(publicAccessTokens)
      .where(eq(publicAccessTokens.id, id));
    return row;
  }

  async getPublicAccessTokenByToken(token: string): Promise<PublicAccessToken | undefined> {
    const [row] = await db
      .select()
      .from(publicAccessTokens)
      .where(and(eq(publicAccessTokens.token, token), eq(publicAccessTokens.isActive, true)));
    return row;
  }

  async revokePublicAccessToken(id: string): Promise<PublicAccessToken | undefined> {
    const [row] = await db
      .update(publicAccessTokens)
      .set({ isActive: false, revokedAt: new Date() })
      .where(eq(publicAccessTokens.id, id))
      .returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
