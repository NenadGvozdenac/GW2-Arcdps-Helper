CREATE TABLE "session_discord_messages" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"webhook_url" text NOT NULL,
	"message_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_discord_messages" ADD CONSTRAINT "session_discord_messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;