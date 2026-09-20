CREATE TABLE `game_id_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_id_attempt_expiry` ON `game_id_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `game_ids` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`credential_hash` text NOT NULL,
	`recovery_code` text NOT NULL,
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_ids_credential_hash_unique` ON `game_ids` (`credential_hash`);