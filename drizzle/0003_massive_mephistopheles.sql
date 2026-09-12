CREATE TABLE `race_results` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`course` text NOT NULL,
	`level` integer NOT NULL,
	`car` text NOT NULL,
	`build_points` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`score` integer NOT NULL,
	`rewinds` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
