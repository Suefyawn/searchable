CREATE TABLE "professional_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
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
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professional_reviews_pro_idx" ON "professional_reviews" USING btree ("professional_id","status");