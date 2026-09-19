CREATE TABLE `ingest_runs` (
	`source` text PRIMARY KEY NOT NULL,
	`last_run_at` integer NOT NULL,
	`last_success_at` integer,
	`last_value` real,
	`last_status` text NOT NULL,
	`last_error` text
);
