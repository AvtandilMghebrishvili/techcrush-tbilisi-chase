CREATE TABLE `city_rankings` (
	`key_hash` text NOT NULL,
	`map` text NOT NULL,
	`ranked_runs` integer NOT NULL,
	`rank_level` integer NOT NULL,
	`rank_checkpoints` integer NOT NULL,
	`best_score` integer NOT NULL,
	`total_score` integer NOT NULL,
	`wins` integer NOT NULL,
	`badges` text NOT NULL,
	`week_key` text NOT NULL,
	`week_score` integer NOT NULL,
	`week_wins` integer NOT NULL,
	`rank_at` integer NOT NULL,
	PRIMARY KEY(`key_hash`, `map`),
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `city_progress` ON `city_rankings` (`map`,`rank_level`,`rank_checkpoints`,`best_score`);--> statement-breakpoint
CREATE INDEX `city_score` ON `city_rankings` (`map`,`best_score`);--> statement-breakpoint
CREATE INDEX `city_week` ON `city_rankings` (`map`,`week_key`,`week_score`);