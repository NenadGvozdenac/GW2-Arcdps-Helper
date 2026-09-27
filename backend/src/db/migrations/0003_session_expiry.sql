ALTER TABLE "sessions" ADD COLUMN "end_reason" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp with time zone DEFAULT now() + interval '6 hours' NOT NULL;