import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  avatar: text("avatar"),
  agentName: text("agent_name").notNull(),
  tone: text("tone").notNull(),
  businessContext: text("business_context").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  platform: text("platform").notNull(),
  type: text("type").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull().default('unread'),
  draftResponse: text("draft_response"),
  urgency: text("urgency").notNull(),
  intent: text("intent").notNull(),
  sentiment: text("sentiment").notNull(),
  aiSummary: text("ai_summary"),
  sourceUrl: text("source_url"),
  contextType: text("context_type"),
  crmData: jsonb("crm_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id],
  }),
}));

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const selectClientSchema = createSelectSchema(clients);

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const selectMessageSchema = createSelectSchema(messages);

export const updateMessageSchema = insertMessageSchema.partial();

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
