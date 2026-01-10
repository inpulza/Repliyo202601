import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table for Replit Auth OAuth sessions.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// Note: This is SEPARATE from the legacy 'session' table (connect-pg-simple)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Re-export User types from main schema
// We use the EXISTING users table, not a new one
export type { User, InsertUser as UpsertUser } from "../schema";
