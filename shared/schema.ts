import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, unique, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  avatar: text("avatar"),
  metricoolToken: text("metricool_token").notNull(),
  metricoolUserId: text("metricool_user_id").notNull(),
  metricoolBlogId: text("metricool_blog_id").notNull(),
  agentName: text("agent_name"),
  tone: text("tone"),
  businessContext: text("business_context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  messages: many(messages),
  users: many(users),
  socialPosts: many(socialPosts),
  conversations: many(conversations),
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
