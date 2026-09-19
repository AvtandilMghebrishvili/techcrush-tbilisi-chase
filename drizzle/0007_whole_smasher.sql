ALTER TABLE `event_entries` ADD `unlocked_at` integer;--> statement-breakpoint
CREATE INDEX `event_discovery` ON `event_entries` (`event_id`,`unlocked_at`);
--> statement-breakpoint
-- Preserve already completed hunts when upgrading a private or live database.
UPDATE event_entries SET unlocked_at = (
  SELECT COALESCE(json_extract(profile, '$.events."' || event_id || '".lastReceipt.at'), joined_at)
  FROM garages WHERE garages.key_hash = event_entries.key_hash
)
WHERE EXISTS (
  SELECT 1 FROM garages WHERE garages.key_hash = event_entries.key_hash
    AND json_array_length(json_extract(profile, '$.events."' || event_id || '".artifacts.tbilisi')) = 5
    AND json_array_length(json_extract(profile, '$.events."' || event_id || '".artifacts.kutaisi')) = 5
    AND json_array_length(json_extract(profile, '$.events."' || event_id || '".artifacts.batumi')) = 5
);
