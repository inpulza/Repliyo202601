CREATE TABLE "ai_agent_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"message_id" varchar,
	"conversation_id" varchar,
	"action" text NOT NULL,
	"input_content" text,
	"output_content" text,
	"status" text DEFAULT 'success' NOT NULL,
	"error_reason" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"platform" text,
	"character_count" integer,
	"was_character_limited" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"max_tokens" integer DEFAULT 500 NOT NULL,
	"system_prompt" text,
	"knowledge_base" text,
	"guardrail_prompt" text,
	"auto_reply_mode" text DEFAULT 'off' NOT NULL,
	"approval_workflow" text DEFAULT 'none' NOT NULL,
	"character_limit_strategy" text DEFAULT 'truncate' NOT NULL,
	"cooldown_seconds" integer DEFAULT 0 NOT NULL,
	"last_auto_reply_at" timestamp,
	"platform_settings" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agents_brand_id_unique" UNIQUE("brand_id")
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"account_name" text,
	"account_avatar" text,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_accounts_brand_id_provider_unique" UNIQUE("brand_id","provider")
);
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "unread_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "thread_external_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "source" text DEFAULT 'metricool_sync';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "ai_suggested_reply" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "ai_reply_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "ai_agent_id" varchar;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD CONSTRAINT "ai_agent_audit_log_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD CONSTRAINT "ai_agent_audit_log_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD CONSTRAINT "ai_agent_audit_log_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;