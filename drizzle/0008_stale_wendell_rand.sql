CREATE TABLE `ghost_presence` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`map` text NOT NULL,
	`car` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`angle` real NOT NULL,
	`pitch` real DEFAULT 0 NOT NULL,
	`roll` real DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ghost_city_recency` ON `ghost_presence` (`map`,`updated_at`);