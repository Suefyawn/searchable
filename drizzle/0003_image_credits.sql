ALTER TABLE "locations" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "image_credit" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "featured_image_credit" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "featured_image_source_url" text;--> statement-breakpoint
ALTER TABLE "business_categories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "business_categories" ADD COLUMN "image_credit" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "license_version" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "source_url" text;