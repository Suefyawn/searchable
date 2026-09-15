CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_documents_title_trgm_idx" ON "search_documents" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_documents_keywords_trgm_idx" ON "search_documents" USING gin ("keywords" gin_trgm_ops);
