import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, unique, integer, boolean, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  avatar: text("avatar"),
  status: text("status").notNull().default('active'),
  metricoolToken: text("metricool_token").notNull(),
  metricoolUserId: text("metricool_user_id").notNull(),
  metricoolBlogId: text("metricool_blog_id").notNull(),
  agentName: text("agent_name"),
  tone: text("tone"),
  businessContext: text("business_context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const socialAccounts = pgTable("social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  accountName: text("account_name"),
  accountAvatar: text("account_avatar"),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBrandProvider: unique().on(table.brandId, table.provider),
}));

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default('client'),
  brandId: varchar("brand_id").references(() => brands.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBrandPlatformPost: unique().on(table.brandId, table.platform, table.externalId),
}));

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  socialPostId: varchar("social_post_id").references(() => socialPosts.id, { onDelete: 'cascade' }),
  platform: text("platform").notNull(),
  type: text("type").notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name"),
  customerAvatar: text("customer_avatar"),
  threadExternalId: text("thread_external_id"),
  lastMessageAt: timestamp("last_message_at").notNull(),
  lastMessagePreview: text("last_message_preview"),
  unreadCount: integer("unread_count").default(0),
  status: text("status").notNull().default('open'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }),
  metricoolId: text("metricool_id").unique(),
  platform: text("platform").notNull(),
  type: text("type").notNull(),
  direction: text("direction").default('inbound'),
  author: text("author").notNull(),
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull().default('unread'),
  draftResponse: text("draft_response"),
  urgency: text("urgency"),
  intent: text("intent"),
  sentiment: text("sentiment"),
  aiSummary: text("ai_summary"),
  sourceUrl: text("source_url"),
  contextType: text("context_type"),
  crmData: jsonb("crm_data"),
  rawData: jsonb("raw_data"),
  threadId: text("thread_id"),
  parentMessageId: varchar("parent_message_id"),
  source: text("source").default('metricool_sync'),
  replyGroupId: varchar("reply_group_id"),
  partIndex: integer("part_index"),
  totalParts: integer("total_parts"),
  aiSuggestedReply: text("ai_suggested_reply"),
  aiReplyStatus: text("ai_reply_status").default('none'),
  aiAgentId: varchar("ai_agent_id"),
  internalOrigin: text("internal_origin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiAgents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }).unique(),
  provider: text("provider").notNull().default('openai'),
  model: text("model").notNull().default('gpt-4o-mini'),
  temperature: real("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(500),
  systemPrompt: text("system_prompt"),
  knowledgeBase: text("knowledge_base"),
  guardrailPrompt: text("guardrail_prompt"),
  autoReplyMode: text("auto_reply_mode").notNull().default('off'),
  approvalWorkflow: text("approval_workflow").notNull().default('none'),
  characterLimitStrategy: text("character_limit_strategy").notNull().default('truncate'),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(0),
  lastAutoReplyAt: timestamp("last_auto_reply_at"),
  platformSettings: jsonb("platform_settings"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiAgentAuditLog = pgTable("ai_agent_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortCode: varchar("short_code", { length: 12 }).unique(),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").references(() => messages.id, { onDelete: 'set null' }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'set null' }),
  action: text("action").notNull(),
  inputContent: text("input_content"),
  outputContent: text("output_content"),
  status: text("status").notNull().default('success'),
  errorReason: text("error_reason"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  platform: text("platform"),
  characterCount: integer("character_count"),
  wasCharacterLimited: boolean("was_character_limited").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many, one }) => ({
  messages: many(messages),
  users: many(users),
  socialPosts: many(socialPosts),
  conversations: many(conversations),
  socialAccounts: many(socialAccounts),
  aiAgent: one(aiAgents, {
    fields: [brands.id],
    references: [aiAgents.brandId],
  }),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  brand: one(brands, {
    fields: [socialAccounts.brandId],
    references: [brands.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  brand: one(brands, {
    fields: [users.brandId],
    references: [brands.id],
  }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  brand: one(brands, {
    fields: [socialPosts.brandId],
    references: [brands.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  brand: one(brands, {
    fields: [conversations.brandId],
    references: [brands.id],
  }),
  socialPost: one(socialPosts, {
    fields: [conversations.socialPostId],
    references: [socialPosts.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  brand: one(brands, {
    fields: [messages.brandId],
    references: [brands.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  aiAgent: one(aiAgents, {
    fields: [messages.aiAgentId],
    references: [aiAgents.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ one, many }) => ({
  brand: one(brands, {
    fields: [aiAgents.brandId],
    references: [brands.id],
  }),
  auditLogs: many(aiAgentAuditLog),
  messages: many(messages),
}));

export const aiAgentAuditLogRelations = relations(aiAgentAuditLog, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiAgentAuditLog.agentId],
    references: [aiAgents.id],
  }),
  message: one(messages, {
    fields: [aiAgentAuditLog.messageId],
    references: [messages.id],
  }),
  conversation: one(conversations, {
    fields: [aiAgentAuditLog.conversationId],
    references: [conversations.id],
  }),
}));

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
});

export const selectBrandSchema = createSelectSchema(brands);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({
  id: true,
  createdAt: true,
});

export const selectSocialPostSchema = createSelectSchema(socialPosts);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const selectConversationSchema = createSelectSchema(conversations);

export const updateConversationSchema = insertConversationSchema.partial();

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const selectMessageSchema = createSelectSchema(messages);

export const updateMessageSchema = insertMessageSchema.partial();

export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

export type Client = Brand;
export type InsertClient = InsertBrand;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type UpdateConversation = z.infer<typeof updateConversationSchema>;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  createdAt: true,
});

export const selectSocialAccountSchema = createSelectSchema(socialAccounts);

export const updateSocialAccountSchema = insertSocialAccountSchema.partial();

export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type UpdateSocialAccount = z.infer<typeof updateSocialAccountSchema>;

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectAiAgentSchema = createSelectSchema(aiAgents);

export const updateAiAgentSchema = insertAiAgentSchema.partial();

export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type UpdateAiAgent = z.infer<typeof updateAiAgentSchema>;

export const insertAiAgentAuditLogSchema = createInsertSchema(aiAgentAuditLog).omit({
  id: true,
  createdAt: true,
});

export const selectAiAgentAuditLogSchema = createSelectSchema(aiAgentAuditLog);

export const updateAiAgentAuditLogSchema = insertAiAgentAuditLogSchema.partial();

export type InsertAiAgentAuditLog = z.infer<typeof insertAiAgentAuditLogSchema>;
export type AiAgentAuditLog = typeof aiAgentAuditLog.$inferSelect;
export type UpdateAiAgentAuditLog = z.infer<typeof updateAiAgentAuditLogSchema>;

export const aiReplyStatusEnum = z.enum(['none', 'suggested', 'approved', 'sent', 'rejected']);
export type AiReplyStatus = z.infer<typeof aiReplyStatusEnum>;

export const autoReplyModeEnum = z.enum(['off', 'draft', 'auto']);
export type AutoReplyMode = z.infer<typeof autoReplyModeEnum>;

export const approvalWorkflowEnum = z.enum(['none', 'human_review']);
export type ApprovalWorkflow = z.infer<typeof approvalWorkflowEnum>;

export const characterLimitStrategyEnum = z.enum(['truncate', 'reject', 'summarize']);
export type CharacterLimitStrategy = z.infer<typeof characterLimitStrategyEnum>;

export const llmProviderEnum = z.enum(['openai', 'gemini']);
export type LlmProvider = z.infer<typeof llmProviderEnum>;

export const internalOriginEnum = z.enum(['manual', 'ai']);
export type InternalOrigin = z.infer<typeof internalOriginEnum>;
