CREATE TABLE "brands" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"avatar" text,
	"metricool_token" text NOT NULL,
	"metricool_user_id" text NOT NULL,
	"metricool_blog_id" text NOT NULL,
	"agent_name" text,
	"tone" text,
	"business_context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"metricool_id" text,
	"platform" text NOT NULL,
	"type" text NOT NULL,
	"author" text NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"draft_response" text,
	"urgency" text NOT NULL,
	"intent" text NOT NULL,
	"sentiment" text NOT NULL,
	"ai_summary" text,
	"source_url" text,
	"context_type" text,
	"crm_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"brand_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;