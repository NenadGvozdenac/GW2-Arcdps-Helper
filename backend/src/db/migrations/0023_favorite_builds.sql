CREATE TABLE "favorite_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"weapons" text DEFAULT '' NOT NULL,
	"profession" text NOT NULL,
	"specialization" text NOT NULL,
	"template" text,
	"updated" text,
	"gear" jsonb NOT NULL,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorite_builds" ADD CONSTRAINT "favorite_builds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_builds_user_url_idx" ON "favorite_builds" USING btree ("user_id","url");