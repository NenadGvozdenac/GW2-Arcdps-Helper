DROP INDEX "feedback_ip_idx";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "ip_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "verification_email_sent_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_reset_sent_at";