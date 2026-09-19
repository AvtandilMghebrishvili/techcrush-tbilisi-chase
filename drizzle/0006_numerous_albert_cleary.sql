CREATE TABLE `event_entries` (
	`event_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`handle` text NOT NULL,
	`handle_key` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `key_hash`),
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_unique_handle` ON `event_entries` (`event_id`,`handle_key`);--> statement-breakpoint
CREATE TABLE `event_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`map` text NOT NULL,
	`score` integer NOT NULL,
	`result` text NOT NULL,
	`metrics` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_scores` (
	`event_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`map` text NOT NULL,
	`score` integer NOT NULL,
	`runs` integer NOT NULL,
	`level` integer NOT NULL,
	`rank_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `key_hash`, `map`),
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_city_score` ON `event_scores` (`event_id`,`map`,`score`,`rank_at`);