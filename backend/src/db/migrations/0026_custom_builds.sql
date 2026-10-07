ALTER TABLE "favorite_builds" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_builds" ADD COLUMN "kind" text DEFAULT 'snowcrows' NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_builds" ADD COLUMN "custom" jsonb;