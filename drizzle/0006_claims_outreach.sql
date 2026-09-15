CREATE TYPE "public"."claim_method" AS ENUM('invite', 'email_domain', 'phone', 'document');--> statement-breakpoint
ALTER TYPE "public"."claim_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "method" "claim_method" DEFAULT 'document' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "code_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "code_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_claims" ADD COLUMN "decision_note" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "claim_invite_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "claim_invite_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "business_claims_business_user_idx" ON "business_claims" USING btree ("business_id","user_id");