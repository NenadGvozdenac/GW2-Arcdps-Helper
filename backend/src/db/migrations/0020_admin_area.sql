CREATE TABLE "blocked_ips" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"blocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ips" (
	"user_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_ips_user_id_ip_hash_pk" PRIMARY KEY("user_id","ip_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "user_ips" ADD CONSTRAINT "user_ips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limit_events_created_idx" ON "rate_limit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rate_limit_events_kind_idx" ON "rate_limit_events" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "user_ips_ip_idx" ON "user_ips" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "user_ips_last_seen_idx" ON "user_ips" USING btree ("last_seen_at");