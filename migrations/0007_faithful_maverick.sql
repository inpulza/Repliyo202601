CREATE TABLE "brand_lifecycle_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"solved_to_closed_hours" integer DEFAULT 24,
	"auto_generate_summary" boolean DEFAULT true,
	"thank_you_detection_enabled" boolean DEFAULT true,
	"thank_you_max_words" integer DEFAULT 15,
	"auto_close_inactivity_hours" integer DEFAULT 72,
	"csat_survey_enabled" boolean DEFAULT false,
	"csat_survey_delay_minutes" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_lifecycle_settings_brand_id_unique" UNIQUE("brand_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_by_user_id" varchar,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contact_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"username" text,
	"avatar_url" text,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"message_count" integer DEFAULT 0,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contact_channels_platform_external_id_unique" UNIQUE("platform","external_id")
);
--> statement-breakpoint
CREATE TABLE "crm_contact_limbo" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"username" text,
	"avatar_url" text,
	"interaction_type" text NOT NULL,
	"interaction_count" integer DEFAULT 1,
	"first_interaction_at" timestamp NOT NULL,
	"last_interaction_at" timestamp NOT NULL,
	"promoted_to_contact_id" varchar,
	"promoted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contact_limbo_brand_id_platform_external_id_unique" UNIQUE("brand_id","platform","external_id")
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"display_name" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"email" text,
	"language" text DEFAULT 'es',
	"country" text,
	"city" text,
	"status" text DEFAULT 'lead',
	"lifecycle_stage" text DEFAULT 'new',
	"source" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"last_used_channel_id" varchar,
	"conversation_count" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"first_interaction_at" timestamp,
	"last_interaction_at" timestamp,
	"reminder_count" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"opt_out_reminders" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" text,
	"company_name" text,
	"industry" text,
	"team_size" text,
	"country" text,
	"platforms" text[],
	"monthly_volume" text,
	"brand_count" text,
	"goals" text[],
	"pain_point" text,
	"current_tools" text,
	"source" text DEFAULT 'website',
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_page_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"page_id" text NOT NULL,
	"page_name" text NOT NULL,
	"page_access_token" text NOT NULL,
	"ig_user_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_page_connections_brand_id_page_id_unique" UNIQUE("brand_id","page_id")
);
--> statement-breakpoint
CREATE TABLE "playground_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_access_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "public_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reminder_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"contact_id" varchar,
	"reminder_number" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"content" text,
	"content_source" text,
	"context_snapshot" jsonb,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"error_message" text,
	"delivery_channel" text,
	"external_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"enabled" boolean DEFAULT false,
	"delay_hours_1" integer DEFAULT 24,
	"delay_hours_2" integer DEFAULT 48,
	"max_reminders" integer DEFAULT 2,
	"daily_brand_cap" integer DEFAULT 50,
	"use_ai_content" boolean DEFAULT true,
	"template_text" text,
	"apply_to_dms" boolean DEFAULT true,
	"apply_to_comments" boolean DEFAULT false,
	"auto_close_after_max_reminders" boolean DEFAULT true,
	"auto_close_delay_hours" integer DEFAULT 48,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_rules_brand_id_unique" UNIQUE("brand_id")
);
--> statement-breakpoint
CREATE TABLE "sentiment_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"message_id" varchar NOT NULL,
	"conversation_id" varchar,
	"severity" text NOT NULL,
	"sentiment" text NOT NULL,
	"category" text NOT NULL,
	"reason" text,
	"confidence" real,
	"status" text DEFAULT 'new' NOT NULL,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"notes" text,
	"platform" text,
	"message_author" text,
	"message_preview" text,
	"message_timestamp" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text DEFAULT 'email_verification' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp DEFAULT now() NOT NULL,
	"resend_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agents" ALTER COLUMN "cooldown_enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "ai_agents" ALTER COLUMN "cooldown_seconds" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "dm_batch_delay_seconds" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "dm_reply_mode" text DEFAULT 'batch' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "cooldown_per_conversation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "auto_mention_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "private_reply_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "private_reply_template" text;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "auto_private_reply_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "auto_private_reply_delay_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "auto_private_reply_use_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "auto_private_reply_prompt" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_ai_reply_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "contact_id" varchar;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closed_by" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closed_by_user_id" varchar;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "ai_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "assigned_to_user_id" varchar;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "first_response_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "resolution_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "reopen_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_customer_message_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closing_summary" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closing_sentiment" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closing_intent" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closing_resolution" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "reminder_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "reminder_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "replit_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "brand_lifecycle_settings" ADD CONSTRAINT "brand_lifecycle_settings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_status_history" ADD CONSTRAINT "conversation_status_history_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_channels" ADD CONSTRAINT "crm_contact_channels_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_limbo" ADD CONSTRAINT "crm_contact_limbo_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_limbo" ADD CONSTRAINT "crm_contact_limbo_promoted_to_contact_id_crm_contacts_id_fk" FOREIGN KEY ("promoted_to_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_page_connections" ADD CONSTRAINT "meta_page_connections_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playground_templates" ADD CONSTRAINT "playground_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_access_tokens" ADD CONSTRAINT "public_access_tokens_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_access_tokens" ADD CONSTRAINT "public_access_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_alerts" ADD CONSTRAINT "sentiment_alerts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_alerts" ADD CONSTRAINT "sentiment_alerts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_alerts" ADD CONSTRAINT "sentiment_alerts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_status_history_conversation_idx" ON "conversation_status_history" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_status_history_created_at_idx" ON "conversation_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "crm_contact_channels_contact_idx" ON "crm_contact_channels" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "crm_contact_limbo_brand_idx" ON "crm_contact_limbo" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "crm_contact_limbo_not_promoted_idx" ON "crm_contact_limbo" USING btree ("promoted_to_contact_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_email_idx" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "crm_contacts_phone_idx" ON "crm_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "crm_contacts_brand_idx" ON "crm_contacts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_status_idx" ON "crm_contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reminder_events_brand_idx" ON "reminder_events" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "reminder_events_conversation_idx" ON "reminder_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "reminder_events_contact_idx" ON "reminder_events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "reminder_events_status_idx" ON "reminder_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reminder_events_scheduled_at_idx" ON "reminder_events" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_events_unique_scheduled_idx" ON "reminder_events" USING btree ("conversation_id","reminder_number") WHERE status = 'scheduled';--> statement-breakpoint
CREATE INDEX "sentiment_alerts_brand_idx" ON "sentiment_alerts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_severity_idx" ON "sentiment_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_status_idx" ON "sentiment_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_brand_severity_idx" ON "sentiment_alerts" USING btree ("brand_id","severity");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_message_idx" ON "sentiment_alerts" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_brand_idx" ON "conversations" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_message_at_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_brand_status_idx" ON "conversations" USING btree ("brand_id","status");--> statement-breakpoint
CREATE INDEX "messages_brand_idx" ON "messages" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_brand_timestamp_idx" ON "messages" USING btree ("brand_id","timestamp");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_replit_id_unique" UNIQUE("replit_id");