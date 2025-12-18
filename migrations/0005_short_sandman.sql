CREATE TABLE "ai_model_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"display_name" text NOT NULL,
	"input_price_per_million" real NOT NULL,
	"output_price_per_million" real NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"source_url" text,
	"last_verified_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_pricing_provider_model_unique" UNIQUE("provider","model")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"click_url" text,
	"platform" text,
	"count" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD COLUMN "prompt_cost_usd" real;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD COLUMN "completion_cost_usd" real;--> statement-breakpoint
ALTER TABLE "ai_agent_audit_log" ADD COLUMN "total_cost_usd" real;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "sync_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;