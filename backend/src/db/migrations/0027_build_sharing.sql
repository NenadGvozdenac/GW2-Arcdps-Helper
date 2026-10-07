ALTER TABLE "favorite_builds" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_builds_share_token_idx" ON "favorite_builds" USING btree ("share_token");