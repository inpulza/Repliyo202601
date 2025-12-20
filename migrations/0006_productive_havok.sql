ALTER TABLE "ai_agents" ALTER COLUMN "character_limit_strategy" SET DEFAULT 'reject';--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "cooldown_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "cooldown_randomness" integer DEFAULT 0 NOT NULL;