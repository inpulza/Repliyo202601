import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  metricoolId: text("metricool_id").unique(),
  platform: text("platform").notNull(),
  type: text("type").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  messages: many(messages),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  brand: one(brands, {
    fields: [users.brandId],
    references: [brands.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  brand: one(brands, {
    fields: [messages.brandId],
    references: [brands.id],
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
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
