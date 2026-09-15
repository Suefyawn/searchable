CREATE TYPE "public"."order_kind" AS ENUM('business_plan', 'sponsored_post', 'placement');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'active', 'expired', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."submission_kind" AS ENUM('guest', 'sponsored', 'press_release');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'reviewing', 'accepted', 'rejected', 'published');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_no" text NOT NULL,
	"kind" "order_kind" NOT NULL,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"user_id" text,
	"business_id" text,
	"submission_id" text,
	"amount_pkr" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"payment_reference" text,
	"payer_name" text,
	"payer_email" text,
	"payer_phone" text,
	"notes" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"paid_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "submission_kind" DEFAULT 'guest' NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"website" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_id" text,
	"article_id" text,
	"order_id" text,
	"editor_notes" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_sponsored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "contributor_name" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "contributor_bio" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "tier_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_business_idx" ON "orders" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");