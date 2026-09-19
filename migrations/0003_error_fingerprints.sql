CREATE TABLE `error_fingerprints` (
	`fp` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`route` text NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`top_frame` text,
	`sample` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	CONSTRAINT "error_fingerprints_source_check" CHECK("source" in ('server', 'client'))
);
--> statement-breakpoint
CREATE INDEX `error_fingerprints_last_seen_idx` ON `error_fingerprints` (`last_seen`);