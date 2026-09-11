CREATE TABLE `garages` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
