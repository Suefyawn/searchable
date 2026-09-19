CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_by` text,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "api_keys_role_check" CHECK("role" in ('user', 'business_owner', 'editor', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_created_by_idx` ON `api_keys` (`created_by`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`notification_prefs` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("role" in ('user', 'business_owner', 'editor', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_urdu` text,
	`image_url` text,
	`image_credit` text,
	`city_id` text,
	`province_id` text,
	`lat` real,
	`lng` real,
	`population` integer,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "locations_kind_check" CHECK("kind" in ('country', 'province', 'city', 'area'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_kind_slug_idx` ON `locations` (`kind`,`slug`);--> statement-breakpoint
CREATE INDEX `locations_parent_idx` ON `locations` (`parent_id`);--> statement-breakpoint
CREATE INDEX `locations_city_idx` ON `locations` (`city_id`);--> statement-breakpoint
CREATE TABLE `article_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`editor_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `article_revisions_article_idx` ON `article_revisions` (`article_id`);--> statement-breakpoint
CREATE TABLE `article_tags` (
	`article_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`dek` text,
	`body` text DEFAULT '' NOT NULL,
	`excerpt` text,
	`category_id` text,
	`author_id` text,
	`location_id` text,
	`featured_image_url` text,
	`featured_image_alt` text,
	`featured_image_credit` text,
	`featured_image_source_url` text,
	`sources` text DEFAULT '[]' NOT NULL,
	`related_ids` text DEFAULT '[]' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`is_sponsored` integer DEFAULT false NOT NULL,
	`contributor_name` text,
	`contributor_bio` text,
	`canonical_url` text,
	`noindex` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`reading_minutes` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`scheduled_for` integer,
	`last_reviewed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "articles_kind_check" CHECK("kind" in ('news', 'guide', 'explainer', 'page')),
	CONSTRAINT "articles_status_check" CHECK("status" in ('draft', 'research', 'editing', 'fact_check', 'scheduled', 'published', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_kind_slug_idx` ON `articles` (`kind`,`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_published_idx` ON `articles` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_category_idx` ON `articles` (`category_id`);--> statement-breakpoint
CREATE TABLE `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authors_slug_unique` ON `authors` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "categories_kind_check" CHECK("kind" in ('news', 'guide', 'explainer', 'page'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_kind_slug_idx` ON `categories` (`kind`,`slug`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `tool_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_slug` text NOT NULL,
	`inputs` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tool_runs_slug_created_idx` ON `tool_runs` (`tool_slug`,`created_at`);--> statement-breakpoint
CREATE TABLE `tools` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`description` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`version` text NOT NULL,
	`last_reviewed_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`run_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tools_slug_unique` ON `tools` (`slug`);--> statement-breakpoint
CREATE INDEX `tools_category_idx` ON `tools` (`category`);--> statement-breakpoint
CREATE TABLE `business_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_plural` text,
	`description` text,
	`icon` text,
	`image_url` text,
	`image_credit` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `business_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_categories_slug_unique` ON `business_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `business_categories_parent_idx` ON `business_categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `business_category_links` (
	`business_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`business_id`, `category_id`),
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `business_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `business_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`method` text DEFAULT 'document' NOT NULL,
	`role` text,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`message` text,
	`evidence_url` text,
	`verification_code` text,
	`code_expires_at` integer,
	`code_attempts` integer DEFAULT 0 NOT NULL,
	`verified_at` integer,
	`decision_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "business_claims_status_check" CHECK("status" in ('pending', 'approved', 'rejected', 'expired')),
	CONSTRAINT "business_claims_method_check" CHECK("method" in ('invite', 'email_domain', 'phone', 'document'))
);
--> statement-breakpoint
CREATE INDEX `business_claims_business_idx` ON `business_claims` (`business_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `business_claims_business_user_idx` ON `business_claims` (`business_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `business_hours` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`opens` text,
	`closes` text,
	`is_closed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_hours_day_idx` ON `business_hours` (`business_id`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `business_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`message` text,
	`source` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `business_leads_business_idx` ON `business_leads` (`business_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `business_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `business_photos_business_idx` ON `business_photos` (`business_id`);--> statement-breakpoint
CREATE TABLE `business_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text,
	`author_name` text,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_response` text,
	`owner_responded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "business_reviews_status_check" CHECK("status" in ('pending', 'published', 'hidden'))
);
--> statement-breakpoint
CREATE INDEX `business_reviews_business_idx` ON `business_reviews` (`business_id`,`status`);--> statement-breakpoint
CREATE TABLE `business_services` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_from` integer,
	`price_to` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `business_services_business_idx` ON `business_services` (`business_id`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`description` text,
	`tagline` text,
	`primary_category_id` text,
	`city_id` text,
	`area_id` text,
	`address` text,
	`lat` real,
	`lng` real,
	`phone` text,
	`whatsapp` text,
	`email` text,
	`website` text,
	`social` text DEFAULT '{}' NOT NULL,
	`price_range` integer,
	`rating_avg` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`tier_expires_at` integer,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` integer,
	`last_verified_at` integer,
	`owner_user_id` text,
	`claimed_at` integer,
	`claim_invite_sent_at` integer,
	`claim_invite_count` integer DEFAULT 0 NOT NULL,
	`logo_url` text,
	`cover_url` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`primary_category_id`) REFERENCES `business_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "businesses_status_check" CHECK("status" in ('pending', 'active', 'closed', 'rejected', 'duplicate')),
	CONSTRAINT "businesses_tier_check" CHECK("tier" in ('free', 'verified', 'premium', 'sponsored'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_slug_unique` ON `businesses` (`slug`);--> statement-breakpoint
CREATE INDEX `businesses_city_category_idx` ON `businesses` (`city_id`,`primary_category_id`,`status`);--> statement-breakpoint
CREATE INDEX `businesses_status_idx` ON `businesses` (`status`);--> statement-breakpoint
CREATE INDEX `businesses_phone_idx` ON `businesses` (`phone`);--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_urdu` text,
	`aliases` text DEFAULT '[]' NOT NULL,
	`description` text,
	`website` text,
	`logo_url` text,
	`facts` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "entities_kind_check" CHECK("kind" in ('organization', 'company', 'brand', 'product', 'person', 'place', 'commodity', 'currency', 'topic'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_slug_unique` ON `entities` (`slug`);--> statement-breakpoint
CREATE INDEX `entities_kind_idx` ON `entities` (`kind`);--> statement-breakpoint
CREATE TABLE `entity_links` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`relation` text DEFAULT 'mentions' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "entity_links_target_type_check" CHECK("target_type" in ('article', 'tool', 'business', 'location', 'data_series', 'comparison'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_links_unique_idx` ON `entity_links` (`entity_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `entity_links_target_idx` ON `entity_links` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `data_points` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`note` text,
	`source_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `data_series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_points_series_date_idx` ON `data_points` (`series_id`,`date`);--> statement-breakpoint
CREATE INDEX `data_points_series_idx` ON `data_points` (`series_id`);--> statement-breakpoint
CREATE TABLE `data_series` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`frequency` text NOT NULL,
	`description` text,
	`source_name` text,
	`source_url` text,
	`meta` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_series_slug_unique` ON `data_series` (`slug`);--> statement-breakpoint
CREATE TABLE `newsletter_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`preheader` text,
	`body` text NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_for` integer,
	`sent_at` integer,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "newsletter_issues_frequency_check" CHECK("frequency" in ('daily', 'weekly'))
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`city_id` text,
	`confirm_token` text,
	`unsubscribe_token` text NOT NULL,
	`source` text,
	`confirmed_at` integer,
	`unsubscribed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "newsletter_subscribers_status_check" CHECK("status" in ('pending', 'active', 'unsubscribed', 'bounced')),
	CONSTRAINT "newsletter_subscribers_frequency_check" CHECK("frequency" in ('daily', 'weekly'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE INDEX `newsletter_subscribers_status_idx` ON `newsletter_subscribers` (`status`);--> statement-breakpoint
CREATE TABLE `search_documents` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`body` text,
	`keywords` text,
	`category` text,
	`category_slug` text,
	`city` text,
	`city_slug` text,
	`image_url` text,
	`boost` real DEFAULT 1 NOT NULL,
	`popularity` integer DEFAULT 0 NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "search_documents_entity_type_check" CHECK("entity_type" in ('news', 'guide', 'tool', 'business', 'location', 'entity', 'data_series', 'comparison', 'professional', 'post'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_documents_id_unique` ON `search_documents` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `search_documents_entity_idx` ON `search_documents` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `search_documents_type_idx` ON `search_documents` (`entity_type`);--> statement-breakpoint
CREATE TABLE `search_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`normalized` text NOT NULL,
	`result_count` integer DEFAULT 0 NOT NULL,
	`clicked_url` text,
	`session_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_queries_normalized_idx` ON `search_queries` (`normalized`);--> statement-breakpoint
CREATE INDEX `search_queries_created_idx` ON `search_queries` (`created_at`);--> statement-breakpoint
CREATE TABLE `search_synonyms` (
	`id` text PRIMARY KEY NOT NULL,
	`term` text NOT NULL,
	`synonyms` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_synonyms_term_unique` ON `search_synonyms` (`term`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text,
	`props` text DEFAULT '{}' NOT NULL,
	`session_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_created_idx` ON `analytics_events` (`name`,`created_at`);--> statement-breakpoint
CREATE TABLE `automation_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`slot` text NOT NULL,
	`at` integer NOT NULL,
	`report` text NOT NULL,
	`published` integer,
	`updated` integer,
	`errors` integer
);
--> statement-breakpoint
CREATE INDEX `automation_reports_at_idx` ON `automation_reports` (`at`);--> statement-breakpoint
CREATE TABLE `inbox_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`mailbox` text NOT NULL,
	`from_address` text NOT NULL,
	`from_name` text,
	`to` text DEFAULT '[]' NOT NULL,
	`cc` text DEFAULT '[]' NOT NULL,
	`reply_to` text DEFAULT '[]' NOT NULL,
	`subject` text NOT NULL,
	`snippet` text NOT NULL,
	`text` text,
	`has_html` integer DEFAULT 0 NOT NULL,
	`message_id` text,
	`in_reply_to` text,
	`attachments` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`read_at` integer,
	`replied_at` integer,
	`received_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inbox_messages_status_idx` ON `inbox_messages` (`status`,`received_at`);--> statement-breakpoint
CREATE INDEX `inbox_messages_mailbox_idx` ON `inbox_messages` (`mailbox`,`received_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`storage_key` text,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`bytes` integer,
	`alt` text,
	`credit` text,
	`license` text,
	`license_version` text,
	`source_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`about` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_status_idx` ON `messages` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redirects_from_path_unique` ON `redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`reporter_email` text,
	`reporter_user_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "reports_target_type_check" CHECK("target_type" in ('business', 'review', 'article', 'post', 'comment', 'professional', 'member')),
	CONSTRAINT "reports_status_check" CHECK("status" in ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_no` text NOT NULL,
	`kind` text NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`user_id` text,
	`business_id` text,
	`professional_id` text,
	`submission_id` text,
	`amount_pkr` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`payment_reference` text,
	`payer_name` text,
	`payer_email` text,
	`payer_phone` text,
	`notes` text,
	`meta` text DEFAULT '{}' NOT NULL,
	`paid_at` integer,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "orders_kind_check" CHECK("kind" in ('business_plan', 'sponsored_post', 'placement', 'professional_plan')),
	CONSTRAINT "orders_status_check" CHECK("status" in ('pending', 'paid', 'active', 'expired', 'cancelled', 'refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_no_unique` ON `orders` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_business_idx` ON `orders` (`business_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'guest' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`company` text,
	`website` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text,
	`links` text DEFAULT '[]' NOT NULL,
	`user_id` text,
	`article_id` text,
	`order_id` text,
	`editor_notes` text,
	`ip` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "submissions_kind_check" CHECK("kind" in ('guest', 'sponsored', 'press_release')),
	CONSTRAINT "submissions_status_check" CHECK("status" in ('new', 'reviewing', 'accepted', 'rejected', 'published'))
);
--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE TABLE `professional_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`professional_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`message` text,
	`source` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `professional_leads_pro_idx` ON `professional_leads` (`professional_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `professional_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`professional_id` text NOT NULL,
	`user_id` text,
	`author_name` text,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_response` text,
	`owner_responded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "professional_reviews_status_check" CHECK("status" in ('pending', 'published', 'hidden'))
);
--> statement-breakpoint
CREATE INDEX `professional_reviews_pro_idx` ON `professional_reviews` (`professional_id`,`status`);--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`owner_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`tier_expires_at` integer,
	`name` text NOT NULL,
	`profession_slug` text NOT NULL,
	`headline` text,
	`bio` text,
	`city_id` text,
	`area_id` text,
	`workplace` text,
	`service_mode` text,
	`phone` text,
	`whatsapp` text,
	`email` text,
	`show_email` integer DEFAULT false NOT NULL,
	`website` text,
	`social` text DEFAULT '{}' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`services` text DEFAULT '[]' NOT NULL,
	`experience` text DEFAULT '[]' NOT NULL,
	`education` text DEFAULT '[]' NOT NULL,
	`certifications` text DEFAULT '[]' NOT NULL,
	`years_experience` integer,
	`licence_no` text,
	`availability` text,
	`rate_from` integer,
	`rate_unit` text,
	`cv_url` text,
	`cv_public` integer DEFAULT true NOT NULL,
	`photo_url` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` integer,
	`rating_avg` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "professionals_status_check" CHECK("status" in ('pending', 'active', 'hidden', 'rejected')),
	CONSTRAINT "professionals_tier_check" CHECK("tier" in ('free', 'verified'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `professionals_slug_unique` ON `professionals` (`slug`);--> statement-breakpoint
CREATE INDEX `professionals_profession_city_idx` ON `professionals` (`profession_slug`,`city_id`,`status`);--> statement-breakpoint
CREATE INDEX `professionals_owner_idx` ON `professionals` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `professionals_status_idx` ON `professionals` (`status`);--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bids_post_idx` ON `bids` (`post_id`,`amount`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`parent_id` text,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`edited_at` integer,
	`moderation_note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comments_target_type_check" CHECK("target_type" in ('post', 'article')),
	CONSTRAINT "comments_status_check" CHECK("status" in ('published', 'pending', 'hidden', 'deleted'))
);
--> statement-breakpoint
CREATE INDEX `comments_target_idx` ON `comments` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `comments_author_idx` ON `comments` (`author_id`);--> statement-breakpoint
CREATE TABLE `member_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text,
	`avatar_url` text,
	`city_id` text,
	`social` text DEFAULT '{}' NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`is_banned` integer DEFAULT false NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`post_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`likes_received` integer DEFAULT 0 NOT NULL,
	`notify_digest` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_profiles_user_id_unique` ON `member_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_profiles_handle_unique` ON `member_profiles` (`handle`);--> statement-breakpoint
CREATE INDEX `member_profiles_handle_idx` ON `member_profiles` (`handle`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`author_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`topic` text,
	`city_id` text,
	`images` text DEFAULT '[]' NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`bid_count` integer DEFAULT 0 NOT NULL,
	`highest_bid` integer,
	`published_at` integer,
	`expires_at` integer,
	`moderation_note` text,
	`moderated_by` text,
	`moderated_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "posts_kind_check" CHECK("kind" in ('job', 'listing', 'auction', 'question', 'discussion')),
	CONSTRAINT "posts_status_check" CHECK("status" in ('pending', 'published', 'rejected', 'hidden', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_kind_idx` ON `posts` (`status`,`kind`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `posts_city_idx` ON `posts` (`city_id`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reactions_target_type_check" CHECK("target_type" in ('post', 'comment', 'article'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reactions_unique_idx` ON `reactions` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `reactions_target_idx` ON `reactions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `saved_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "saved_items_target_type_check" CHECK("target_type" in ('article', 'tool', 'business', 'professional', 'post', 'data_series'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_items_unique_idx` ON `saved_items` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `saved_items_user_idx` ON `saved_items` (`user_id`,`created_at`);