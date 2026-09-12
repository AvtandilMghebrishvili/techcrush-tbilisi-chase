ALTER TABLE `garages` ADD `has_played` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `leaderboard_player_count` ON `garages` (`has_played`);
--> statement-breakpoint
UPDATE garages SET has_played=1 WHERE ranked_runs>0
 OR json_extract(profile,'$.activeRun.id') IS NOT NULL
 OR COALESCE(json_array_length(profile,'$.settled'),0)>0;
