CREATE TYPE "public"."saved_target" AS ENUM('article', 'tool', 'business', 'professional', 'post', 'data_series');--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_type" "saved_target" NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "notify_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_unique_idx" ON "saved_items" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "saved_items_user_idx" ON "saved_items" USING btree ("user_id","created_at");