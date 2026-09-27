ALTER TABLE "sessions" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_share_token_idx" ON "sessions" USING btree ("share_token");