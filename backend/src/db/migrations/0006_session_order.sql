ALTER TABLE "sessions" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;