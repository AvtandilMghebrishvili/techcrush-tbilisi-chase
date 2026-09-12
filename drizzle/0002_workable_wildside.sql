CREATE TABLE `level_records` (
	`key_hash` text NOT NULL,
	`course` text NOT NULL,
	`level` integer NOT NULL,
	`car` text NOT NULL,
	`build_class` text NOT NULL,
	`build_points` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`rewinds` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	PRIMARY KEY(`key_hash`, `course`, `level`, `car`, `build_class`),
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leaderboard_level_time` ON `level_records` (`course`,`level`,`duration_ms`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `leaderboard_stock_time` ON `level_records` (`course`,`level`,`build_class`,`car`,`duration_ms`);