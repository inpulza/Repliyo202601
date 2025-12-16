CREATE TABLE "conversation_user_summaries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"author" text NOT NULL,
	"summary" text,
	"last_message_id" varchar,
	"message_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_user_summaries_conversation_id_author_unique" UNIQUE("conversation_id","author")
);
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "transcription_provider" text DEFAULT 'gemini' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_group_id" varchar;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "part_index" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "total_parts" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "draft_was_edited" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "internal_origin" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_transcription" text;--> statement-breakpoint
ALTER TABLE "conversation_user_summaries" ADD CONSTRAINT "conversation_user_summaries_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_user_summaries" ADD CONSTRAINT "conversation_user_summaries_last_message_id_messages_id_fk" FOREIGN KEY ("last_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;