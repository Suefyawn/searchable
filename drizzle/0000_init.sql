CREATE TYPE "public"."user_role" AS ENUM('user', 'business_owner', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."location_kind" AS ENUM('country', 'province', 'city', 'area');--> statement-breakpoint
CREATE TYPE "public"."article_kind" AS ENUM('news', 'guide', 'explainer', 'page');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'research', 'editing', 'fact_check', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('pending', 'active', 'closed', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."business_tier" AS ENUM('free', 'verified', 'premium', 'sponsored');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('organization', 'company', 'brand', 'product', 'person', 'place', 'commodity', 'currency', 'topic');--> statement-breakpoint
CREATE TYPE "public"."entity_link_target" AS ENUM('article', 'tool', 'business', 'location', 'data_series', 'comparison');--> statement-breakpoint
CREATE TYPE "public"."newsletter_frequency" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'active', 'unsubscribed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."search_entity_type" AS ENUM('news', 'guide', 'tool', 'business', 'location', 'entity', 'data_series', 'comparison');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"kind" "location_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_urdu" text,
	"city_id" text,
	"province_id" text,
	"lat" double precision,
	"lng" double precision,
	"population" integer,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"editor_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "article_kind" NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"dek" text,
	"body" text DEFAULT '' NOT NULL,
	"excerpt" text,
	"category_id" text,
	"author_id" text,
	"location_id" text,
	"featured_image_url" text,
	"featured_image_alt" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"reading_minutes" integer,
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "article_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tool_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tool_slug" text NOT NULL,
	"inputs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"description" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" text NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "business_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_plural" text,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "business_category_links" (
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "business_category_links_business_id_category_id_pk" PRIMARY KEY("business_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "business_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"evidence_url" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"opens" text,
	"closes" text,
	"is_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"message" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text,
	"author_name" text,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"owner_response" text,
	"owner_responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_services" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_from" integer,
	"price_to" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "business_status" DEFAULT 'pending' NOT NULL,
	"tier" "business_tier" DEFAULT 'free' NOT NULL,
	"description" text,
	"tagline" text,
	"primary_category_id" text,
	"city_id" text,
	"area_id" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"social" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_range" integer,
	"rating_avg" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"owner_user_id" text,
	"logo_url" text,
	"cover_url" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_urdu" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"website" text,
	"logo_url" text,
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "entity_links" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"target_type" "entity_link_target" NOT NULL,
	"target_id" text NOT NULL,
	"relation" text DEFAULT 'mentions' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_points" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"date" date NOT NULL,
	"value" double precision NOT NULL,
	"note" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_series" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"frequency" text NOT NULL,
	"description" text,
	"source_name" text,
	"source_url" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"preheader" text,
	"body" text NOT NULL,
	"frequency" "newsletter_frequency" DEFAULT 'daily' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"frequency" "newsletter_frequency" DEFAULT 'daily' NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"city_id" text,
	"confirm_token" text,
	"unsubscribe_token" text NOT NULL,
	"source" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" "search_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text,
	"keywords" text,
	"category" text,
	"category_slug" text,
	"city" text,
	"city_slug" text,
	"image_url" text,
	"boost" double precision DEFAULT 1 NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(keywords, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(city, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(body, '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"normalized" text NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"clicked_url" text,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_synonyms" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"synonyms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "search_synonyms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path" text,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"storage_key" text,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"alt" text,
	"credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" text PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_parent_id_business_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."business_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_category_links" ADD CONSTRAINT "business_category_links_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_category_links" ADD CONSTRAINT "business_category_links_category_id_business_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."business_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_leads" ADD CONSTRAINT "business_leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_photos" ADD CONSTRAINT "business_photos_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_primary_category_id_business_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."business_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_area_id_locations_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_series_id_data_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."data_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_kind_slug_idx" ON "locations" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "locations_city_idx" ON "locations" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "article_revisions_article_idx" ON "article_revisions" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_kind_slug_idx" ON "articles" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "articles_status_published_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_kind_slug_idx" ON "categories" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "tool_runs_slug_created_idx" ON "tool_runs" USING btree ("tool_slug","created_at");--> statement-breakpoint
CREATE INDEX "tools_category_idx" ON "tools" USING btree ("category");--> statement-breakpoint
CREATE INDEX "business_categories_parent_idx" ON "business_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "business_claims_business_idx" ON "business_claims" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_day_idx" ON "business_hours" USING btree ("business_id","day_of_week");--> statement-breakpoint
CREATE INDEX "business_leads_business_idx" ON "business_leads" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "business_photos_business_idx" ON "business_photos" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_reviews_business_idx" ON "business_reviews" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_services_business_idx" ON "business_services" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "businesses_city_category_idx" ON "businesses" USING btree ("city_id","primary_category_id","status");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "businesses_phone_idx" ON "businesses" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "entities_kind_idx" ON "entities" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_links_unique_idx" ON "entity_links" USING btree ("entity_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "entity_links_target_idx" ON "entity_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_points_series_date_idx" ON "data_points" USING btree ("series_id","date");--> statement-breakpoint
CREATE INDEX "data_points_series_idx" ON "data_points" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_entity_idx" ON "search_documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "search_documents_tsv_idx" ON "search_documents" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "search_documents_type_idx" ON "search_documents" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "search_queries_normalized_idx" ON "search_queries" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "search_queries_created_idx" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events" USING btree ("name","created_at");