-- A session can now be posted by two webhooks, so its messages are keyed by session and webhook.
ALTER TABLE "session_discord_messages" DROP CONSTRAINT "session_discord_messages_pkey";--> statement-breakpoint
ALTER TABLE "session_discord_messages" ADD CONSTRAINT "session_discord_messages_session_id_webhook_url_pk" PRIMARY KEY("session_id","webhook_url");--> statement-breakpoint
ALTER TABLE "discord_webhooks" ADD COLUMN "excluded_accounts" text[] DEFAULT '{}' NOT NULL;
