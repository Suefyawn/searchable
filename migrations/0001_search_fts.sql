-- Full-text search over search_documents (docs/schema-notes.md, ADR-45). Hand-written: Drizzle does not model
-- virtual tables. External-content FTS5 tables read their text from search_documents through `seq`, so the
-- text is stored once; the triggers keep both indexes in step with every insert, update and delete.

CREATE VIRTUAL TABLE `search_fts` USING fts5(
	`title`, `keywords`, `summary`, `category`, `city`, `body`,
	content='search_documents', content_rowid='seq', tokenize='unicode61'
);
--> statement-breakpoint
CREATE VIRTUAL TABLE `search_trgm` USING fts5(
	`title`, `keywords`,
	content='search_documents', content_rowid='seq', tokenize='trigram'
);
--> statement-breakpoint
CREATE TRIGGER `search_documents_ai` AFTER INSERT ON `search_documents` BEGIN
	INSERT INTO `search_fts`(rowid, title, keywords, summary, category, city, body) VALUES (new.seq, new.title, new.keywords, new.summary, new.category, new.city, new.body);
	INSERT INTO `search_trgm`(rowid, title, keywords) VALUES (new.seq, new.title, new.keywords);
END;
--> statement-breakpoint
CREATE TRIGGER `search_documents_ad` AFTER DELETE ON `search_documents` BEGIN
	INSERT INTO `search_fts`(`search_fts`, rowid, title, keywords, summary, category, city, body) VALUES ('delete', old.seq, old.title, old.keywords, old.summary, old.category, old.city, old.body);
	INSERT INTO `search_trgm`(`search_trgm`, rowid, title, keywords) VALUES ('delete', old.seq, old.title, old.keywords);
END;
--> statement-breakpoint
CREATE TRIGGER `search_documents_au` AFTER UPDATE ON `search_documents` BEGIN
	INSERT INTO `search_fts`(`search_fts`, rowid, title, keywords, summary, category, city, body) VALUES ('delete', old.seq, old.title, old.keywords, old.summary, old.category, old.city, old.body);
	INSERT INTO `search_fts`(rowid, title, keywords, summary, category, city, body) VALUES (new.seq, new.title, new.keywords, new.summary, new.category, new.city, new.body);
	INSERT INTO `search_trgm`(`search_trgm`, rowid, title, keywords) VALUES ('delete', old.seq, old.title, old.keywords);
	INSERT INTO `search_trgm`(rowid, title, keywords) VALUES (new.seq, new.title, new.keywords);
END;
