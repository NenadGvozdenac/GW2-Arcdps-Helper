ALTER TABLE "logs" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "logs_share_token_idx" ON "logs" USING btree ("share_token");