CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"social_post_id" varchar,
	"platform" text NOT NULL,
	"type" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text,
	"customer_avatar" text,
	"last_message_at" timestamp NOT NULL,
	"last_message_preview" text,
	"unread_count" text DEFAULT '0',
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"permalink" text,
	"thumbnail_url" text,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_posts_brand_id_platform_external_id_unique" UNIQUE("brand_id","platform","external_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "urgency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "intent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sentiment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" varchar;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "direction" text DEFAULT 'inbound';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "author_avatar" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "raw_data" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "thread_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "parent_message_id" varchar;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_social_post_id_social_posts_id_fk" FOREIGN KEY ("social_post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_metricool_id_unique" UNIQUE("metricool_id");