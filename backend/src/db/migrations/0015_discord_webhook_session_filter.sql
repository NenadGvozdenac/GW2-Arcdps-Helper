ALTER TABLE "discord_webhooks" ADD COLUMN "accounts" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_webhooks" ADD COLUMN "min_accounts" integer DEFAULT 3 NOT NULL;