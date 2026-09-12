ALTER TABLE `garages` ADD `public_id` text;--> statement-breakpoint
ALTER TABLE `garages` ADD `display_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `avatar` text DEFAULT 'red' NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `listed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `ranked_runs` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `rank_level` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `rank_checkpoints` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `best_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `total_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `badges` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `week_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `week_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `week_wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `garages` ADD `rank_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `leaderboard_progress` ON `garages` (`listed`,`rank_level`,`rank_checkpoints`,`best_score`,`rank_at`,`public_id`);--> statement-breakpoint
CREATE INDEX `leaderboard_score` ON `garages` (`listed`,`best_score`,`rank_level`,`rank_at`,`public_id`);--> statement-breakpoint
CREATE INDEX `leaderboard_week` ON `garages` (`listed`,`week_key`,`week_score`,`week_wins`,`rank_at`,`public_id`);