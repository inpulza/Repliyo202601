ALTER TABLE "reminder_events" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reminder_events_unique_active_idx" ON "reminder_events" USING btree ("conversation_id","reminder_number") WHERE status IN ('scheduled', 'processing');
