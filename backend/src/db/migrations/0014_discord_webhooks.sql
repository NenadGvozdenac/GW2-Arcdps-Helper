CREATE TABLE "discord_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	"content" text DEFAULT 'all' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discord_webhooks" ADD CONSTRAINT "discord_webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_webhooks_user_position_idx" ON "discord_webhooks" USING btree ("user_id","position");--> statement-breakpoint
-- Carry every connected webhook over as the user's first one (posting logs and sessions, as before).
INSERT INTO "discord_webhooks" ("user_id", "position", "url") SELECT "id", 0, "discord_webhook_url" FROM "users" WHERE "discord_webhook_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "discord_webhook_url";--> statement-breakpoint
-- Columns from an earlier draft of this change, in case a development database already has them.
ALTER TABLE "users" DROP COLUMN IF EXISTS "discord_webhook_content";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "discord_second_webhook_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "discord_webhook_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "discord_second_webhook_enabled";