CREATE TYPE "public"."professional_status" AS ENUM('pending', 'active', 'hidden', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."professional_tier" AS ENUM('free', 'verified');--> statement-breakpoint
ALTER TYPE "public"."search_entity_type" ADD VALUE 'professional';--> statement-breakpoint
ALTER TYPE "public"."order_kind" ADD VALUE 'professional_plan';--> statement-breakpoint
CREATE TABLE "professional_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"message" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" text,
	"status" "professional_status" DEFAULT 'pending' NOT NULL,
	"tier" "professional_tier" DEFAULT 'free' NOT NULL,
	"tier_expires_at" timestamp with time zone,
	"name" text NOT NULL,
	"profession_slug" text NOT NULL,
	"headline" text,
	"bio" text,
	"city_id" text,
	"area_id" text,
	"workplace" text,
	"service_mode" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"show_email" boolean DEFAULT false NOT NULL,
	"website" text,
	"social" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"years_experience" integer,
	"licence_no" text,
	"availability" text,
	"rate_from" integer,
	"rate_unit" text,
	"cv_url" text,
	"cv_public" boolean DEFAULT true NOT NULL,
	"photo_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"rating_avg" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "professional_id" text;--> statement-breakpoint
ALTER TABLE "professional_leads" ADD CONSTRAINT "professional_leads_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_area_id_locations_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professional_leads_pro_idx" ON "professional_leads" USING btree ("professional_id","created_at");--> statement-breakpoint
CREATE INDEX "professionals_profession_city_idx" ON "professionals" USING btree ("profession_slug","city_id","status");--> statement-breakpoint
CREATE INDEX "professionals_owner_idx" ON "professionals" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "professionals_status_idx" ON "professionals" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE set null ON UPDATE no action;