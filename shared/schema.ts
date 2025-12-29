import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, unique, integer, boolean, real, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  avatar: text("avatar"),
  status: text("status").notNull().default('active'),
  syncPaused: boolean("sync_paused").notNull().default(false),
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
  lastAiReplyAt: timestamp("last_ai_reply_at"),
  contactId: varchar("contact_id").references(() => crmContacts.id, { onDelete: 'set null' }),
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
  draftWasEdited: boolean("draft_was_edited").default(false),
  aiAgentId: varchar("ai_agent_id"),
  internalOrigin: text("internal_origin"),
  mediaType: text("media_type"),
  mediaUrl: text("media_url"),
  mediaTranscription: text("media_transcription"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiAgents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }).unique(),
  provider: text("provider").notNull().default('openai'),
  model: text("model").notNull().default('gpt-4o-mini'),
  transcriptionProvider: text("transcription_provider").notNull().default('gemini'),
  temperature: real("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(500),
  systemPrompt: text("system_prompt"),
  knowledgeBase: text("knowledge_base"),
  guardrailPrompt: text("guardrail_prompt"),
  autoReplyMode: text("auto_reply_mode").notNull().default('off'),
  approvalWorkflow: text("approval_workflow").notNull().default('none'),
  characterLimitStrategy: text("character_limit_strategy").notNull().default('reject'),
  cooldownEnabled: boolean("cooldown_enabled").notNull().default(true),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(30),
  cooldownRandomness: integer("cooldown_randomness").notNull().default(0),
  lastAutoReplyAt: timestamp("last_auto_reply_at"),
  platformSettings: jsonb("platform_settings"),
  isActive: boolean("is_active").notNull().default(true),
  // DM Buffer Configuration (Punto 6 del plan)
  dmBatchDelaySeconds: integer("dm_batch_delay_seconds").notNull().default(50),
  dmReplyMode: text("dm_reply_mode").notNull().default('batch'), // 'auto' | 'first_only' | 'batch'
  cooldownPerConversation: boolean("cooldown_per_conversation").notNull().default(true),
  autoMentionEnabled: boolean("auto_mention_enabled").notNull().default(false),
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
  // Campos para tracking de costos
  provider: text("provider"), // openai, gemini, anthropic
  model: text("model"), // gpt-4o, gemini-2.5-flash, etc.
  promptCostUsd: real("prompt_cost_usd"), // Costo de tokens de entrada en USD
  completionCostUsd: real("completion_cost_usd"), // Costo de tokens de salida en USD
  totalCostUsd: real("total_cost_usd"), // Costo total de la solicitud en USD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TABLA SATÉLITE: Resúmenes de conversación por usuario
// Permite almacenar un resumen independiente para cada usuario dentro de una conversación (post)
// Esto evita la "contaminación de contexto" cuando múltiples usuarios comentan en el mismo post
export const conversationUserSummaries = pgTable("conversation_user_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  author: text("author").notNull(), // Consistente con messages.author
  summary: text("summary"),
  lastMessageId: varchar("last_message_id").references(() => messages.id, { onDelete: 'set null' }),
  messageCount: integer("message_count").default(0), // Contador de mensajes resumidos
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueConversationAuthor: unique().on(table.conversationId, table.author),
}));

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

export const conversationUserSummariesRelations = relations(conversationUserSummaries, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationUserSummaries.conversationId],
    references: [conversations.id],
  }),
  lastMessage: one(messages, {
    fields: [conversationUserSummaries.lastMessageId],
    references: [messages.id],
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

export const socialProviderEnum = z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'google']);
export type SocialProvider = z.infer<typeof socialProviderEnum>;

export const channelSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  bufferDelaySeconds: z.number().int().min(0).max(300).nullable().optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  cooldownRandomness: z.number().int().min(0).max(120).nullable().optional(),
  cooldownPerConversation: z.boolean().nullable().optional(),
});
export type ChannelSettings = z.infer<typeof channelSettingsSchema>;

export const platformSettingsSchema = z.object({
  instagram: channelSettingsSchema.optional(),
  facebook: channelSettingsSchema.optional(),
  tiktok: channelSettingsSchema.optional(),
  youtube: channelSettingsSchema.optional(),
  linkedin: channelSettingsSchema.optional(),
  google: channelSettingsSchema.optional(),
});
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

export function getEffectiveChannelSettings(
  agent: AiAgent,
  provider: SocialProvider
): { bufferDelaySeconds: number; cooldownSeconds: number; cooldownRandomness: number; cooldownPerConversation: boolean } {
  const platformSettings = agent.platformSettings as PlatformSettings | null;
  const channelOverride = platformSettings?.[provider];
  
  return {
    bufferDelaySeconds: channelOverride?.bufferDelaySeconds ?? agent.dmBatchDelaySeconds,
    cooldownSeconds: channelOverride?.cooldownSeconds ?? agent.cooldownSeconds,
    cooldownRandomness: channelOverride?.cooldownRandomness ?? agent.cooldownRandomness,
    cooldownPerConversation: channelOverride?.cooldownPerConversation ?? agent.cooldownPerConversation,
  };
}

export const insertAiAgentAuditLogSchema = createInsertSchema(aiAgentAuditLog).omit({
  id: true,
  createdAt: true,
});

export const selectAiAgentAuditLogSchema = createSelectSchema(aiAgentAuditLog);

export const updateAiAgentAuditLogSchema = insertAiAgentAuditLogSchema.partial();

export type InsertAiAgentAuditLog = z.infer<typeof insertAiAgentAuditLogSchema>;
export type AiAgentAuditLog = typeof aiAgentAuditLog.$inferSelect;
export type UpdateAiAgentAuditLog = z.infer<typeof updateAiAgentAuditLogSchema>;

export const aiReplyStatusEnum = z.enum(['none', 'suggested', 'approved', 'sent', 'rejected', 'drafting', 'drafted', 'draft_error']);
export type AiReplyStatus = z.infer<typeof aiReplyStatusEnum>;

export const autoReplyModeEnum = z.enum(['off', 'auto']);
export type AutoReplyMode = z.infer<typeof autoReplyModeEnum>;

export const characterLimitStrategyEnum = z.enum(['reject', 'summarize']);
export type CharacterLimitStrategy = z.infer<typeof characterLimitStrategyEnum>;

export const llmProviderEnum = z.enum(['openai', 'gemini', 'anthropic']);
export type LlmProvider = z.infer<typeof llmProviderEnum>;

// Tabla de precios de modelos de IA
// Precios en USD por 1 millón de tokens
export const aiModelPricing = pgTable("ai_model_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // openai, gemini, anthropic
  model: text("model").notNull(), // gpt-4o, gemini-2.5-flash, etc.
  displayName: text("display_name").notNull(), // Nombre amigable para UI
  inputPricePerMillion: real("input_price_per_million").notNull(), // USD por 1M tokens de entrada
  outputPricePerMillion: real("output_price_per_million").notNull(), // USD por 1M tokens de salida
  isActive: boolean("is_active").notNull().default(true), // Si el modelo está disponible
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(), // Desde cuándo aplica este precio
  sourceUrl: text("source_url"), // URL de la fuente oficial de precios
  lastVerifiedAt: timestamp("last_verified_at").defaultNow().notNull(), // Última vez que se verificó
  notes: text("notes"), // Notas adicionales (ej: contexto >200K tiene precio diferente)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueProviderModel: unique().on(table.provider, table.model),
}));

export const internalOriginEnum = z.enum(['manual', 'ai']);
export type InternalOrigin = z.infer<typeof internalOriginEnum>;

// Schemas y tipos para conversation_user_summaries
export const insertConversationUserSummarySchema = createInsertSchema(conversationUserSummaries).omit({
  id: true,
  updatedAt: true,
});

export const selectConversationUserSummarySchema = createSelectSchema(conversationUserSummaries);

export const updateConversationUserSummarySchema = insertConversationUserSummarySchema.partial();

export type InsertConversationUserSummary = z.infer<typeof insertConversationUserSummarySchema>;
export type ConversationUserSummary = typeof conversationUserSummaries.$inferSelect;
export type UpdateConversationUserSummary = z.infer<typeof updateConversationUserSummarySchema>;

// Schemas y tipos para ai_model_pricing
export const insertAiModelPricingSchema = createInsertSchema(aiModelPricing).omit({
  id: true,
  createdAt: true,
});

export const selectAiModelPricingSchema = createSelectSchema(aiModelPricing);

export const updateAiModelPricingSchema = insertAiModelPricingSchema.partial();

export type InsertAiModelPricing = z.infer<typeof insertAiModelPricingSchema>;
export type AiModelPricing = typeof aiModelPricing.$inferSelect;
export type UpdateAiModelPricing = z.infer<typeof updateAiModelPricingSchema>;

// Sistema de Notificaciones Central
// Tipos: new_messages, sync_error, sync_success, auto_reply, config_change, error
export const notificationTypeEnum = z.enum([
  'new_messages',    // Nuevos mensajes entrantes (agrupables)
  'sync_error',      // Error de sincronización
  'sync_success',    // Sincronización exitosa
  'auto_reply',      // Respuesta automática enviada
  'auto_reply_error', // Error al enviar respuesta automática
  'config_change',   // Cambio en configuración del agente
  'brand_connected', // Nueva marca conectada
  'platform_toggle', // Plataforma activada/desactivada
  'draft_pending',   // Borrador sin enviar (individual, persistente hasta envío)
  'error'            // Error genérico
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isRead: boolean("is_read").notNull().default(false),
  clickUrl: text("click_url"),
  platform: text("platform"),
  count: integer("count").notNull().default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  brand: one(brands, {
    fields: [notifications.brandId],
    references: [brands.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectNotificationSchema = createSelectSchema(notifications);

export const updateNotificationSchema = insertNotificationSchema.partial();

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;

// Plantillas de Respuestas para el Playground
// Categorías: informacional, comercial, soporte, general
export const templateCategoryEnum = z.enum([
  'informacional',  // Preguntas de información general
  'comercial',      // Preguntas sobre precios, servicios, ventas
  'soporte',        // Problemas técnicos o de servicio
  'general'         // Respuestas genéricas (saludos, agradecimientos)
]);
export type TemplateCategory = z.infer<typeof templateCategoryEnum>;

export const playgroundTemplates = pgTable("playground_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  category: text("category").notNull().default('general'),
  title: text("title").notNull(),
  content: text("content").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playgroundTemplatesRelations = relations(playgroundTemplates, ({ one }) => ({
  brand: one(brands, {
    fields: [playgroundTemplates.brandId],
    references: [brands.id],
  }),
}));

export const insertPlaygroundTemplateSchema = createInsertSchema(playgroundTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export const selectPlaygroundTemplateSchema = createSelectSchema(playgroundTemplates);

export const updatePlaygroundTemplateSchema = insertPlaygroundTemplateSchema.partial();

export type InsertPlaygroundTemplate = z.infer<typeof insertPlaygroundTemplateSchema>;
export type PlaygroundTemplate = typeof playgroundTemplates.$inferSelect;
export type UpdatePlaygroundTemplate = z.infer<typeof updatePlaygroundTemplateSchema>;

// ============================================
// CRM MODULE - Conversational CRM Tables
// ============================================

// Enums para el CRM
export const crmContactStatusEnum = z.enum(['lead', 'qualified', 'customer', 'churned']);
export type CrmContactStatus = z.infer<typeof crmContactStatusEnum>;

export const crmLifecycleStageEnum = z.enum(['new', 'engaged', 'converted', 'loyal']);
export type CrmLifecycleStage = z.infer<typeof crmLifecycleStageEnum>;

export const crmInteractionTypeEnum = z.enum(['comment', 'like', 'mention', 'reaction', 'reply']);
export type CrmInteractionType = z.infer<typeof crmInteractionTypeEnum>;

// TABLA 1: CRM CONTACTS (La persona)
export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  
  // Datos básicos
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  language: text("language").default('es'),
  country: text("country"),
  city: text("city"),
  
  // Lifecycle
  status: text("status").default('lead'),
  lifecycleStage: text("lifecycle_stage").default('new'),
  source: text("source"),
  
  // Datos dinámicos extraídos por IA (JSONB flexible)
  customFields: jsonb("custom_fields").default({}),
  
  // Enrutamiento inteligente
  lastUsedChannelId: varchar("last_used_channel_id"),
  
  // Métricas
  conversationCount: integer("conversation_count").default(0),
  totalMessages: integer("total_messages").default(0),
  firstInteractionAt: timestamp("first_interaction_at"),
  lastInteractionAt: timestamp("last_interaction_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("crm_contacts_email_idx").on(table.email),
  phoneIdx: index("crm_contacts_phone_idx").on(table.phone),
  brandIdx: index("crm_contacts_brand_idx").on(table.brandId),
  statusIdx: index("crm_contacts_status_idx").on(table.status),
}));

// TABLA 2: CRM CONTACT CHANNELS (Identity Merge - un contacto, múltiples canales)
export const crmContactChannels = pgTable("crm_contact_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: 'cascade' }),
  
  // Identificación del canal
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  
  // Estado
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  
  // Métricas
  messageCount: integer("message_count").default(0),
  lastMessageAt: timestamp("last_message_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniquePlatformExternal: unique().on(table.platform, table.externalId),
  contactIdx: index("crm_contact_channels_contact_idx").on(table.contactId),
}));

// TABLA 3: CRM CONTACT LIMBO (Lazy Creation - comentarios públicos esperando handshake)
export const crmContactLimbo = pgTable("crm_contact_limbo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  
  // Identificación
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  
  // Tracking de interacciones
  interactionType: text("interaction_type").notNull(),
  interactionCount: integer("interaction_count").default(1),
  firstInteractionAt: timestamp("first_interaction_at").notNull(),
  lastInteractionAt: timestamp("last_interaction_at").notNull(),
  
  // Promoción a contacto oficial
  promotedToContactId: varchar("promoted_to_contact_id").references(() => crmContacts.id),
  promotedAt: timestamp("promoted_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBrandPlatformExternal: unique().on(table.brandId, table.platform, table.externalId),
  brandIdx: index("crm_contact_limbo_brand_idx").on(table.brandId),
  notPromotedIdx: index("crm_contact_limbo_not_promoted_idx").on(table.promotedToContactId),
}));

// Relations para CRM
export const crmContactsRelations = relations(crmContacts, ({ one, many }) => ({
  brand: one(brands, {
    fields: [crmContacts.brandId],
    references: [brands.id],
  }),
  channels: many(crmContactChannels),
  lastUsedChannel: one(crmContactChannels, {
    fields: [crmContacts.lastUsedChannelId],
    references: [crmContactChannels.id],
  }),
}));

export const crmContactChannelsRelations = relations(crmContactChannels, ({ one }) => ({
  contact: one(crmContacts, {
    fields: [crmContactChannels.contactId],
    references: [crmContacts.id],
  }),
}));

export const crmContactLimboRelations = relations(crmContactLimbo, ({ one }) => ({
  brand: one(brands, {
    fields: [crmContactLimbo.brandId],
    references: [brands.id],
  }),
  promotedToContact: one(crmContacts, {
    fields: [crmContactLimbo.promotedToContactId],
    references: [crmContacts.id],
  }),
}));

// Schemas Zod para CRM Contacts
export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCrmContactSchema = createSelectSchema(crmContacts);

export const updateCrmContactSchema = insertCrmContactSchema.partial();

export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmContact = typeof crmContacts.$inferSelect;
export type UpdateCrmContact = z.infer<typeof updateCrmContactSchema>;

// Schemas Zod para CRM Contact Channels
export const insertCrmContactChannelSchema = createInsertSchema(crmContactChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCrmContactChannelSchema = createSelectSchema(crmContactChannels);

export const updateCrmContactChannelSchema = insertCrmContactChannelSchema.partial();

export type InsertCrmContactChannel = z.infer<typeof insertCrmContactChannelSchema>;
export type CrmContactChannel = typeof crmContactChannels.$inferSelect;
export type UpdateCrmContactChannel = z.infer<typeof updateCrmContactChannelSchema>;

// Schemas Zod para CRM Contact Limbo
export const insertCrmContactLimboSchema = createInsertSchema(crmContactLimbo).omit({
  id: true,
  createdAt: true,
});

export const selectCrmContactLimboSchema = createSelectSchema(crmContactLimbo);

export const updateCrmContactLimboSchema = insertCrmContactLimboSchema.partial();

export type InsertCrmContactLimbo = z.infer<typeof insertCrmContactLimboSchema>;
export type CrmContactLimbo = typeof crmContactLimbo.$inferSelect;
export type UpdateCrmContactLimbo = z.infer<typeof updateCrmContactLimboSchema>;
