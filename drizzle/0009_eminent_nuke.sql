ALTER TABLE `garages` ADD `private_mode` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE garages SET private_mode=1,listed=0,profile=json_set(profile,'$.driver.listed',json('false'))
WHERE lower(trim(display_name)) IN ('citiars','test','phantom_7q9x4m2k')
   OR key_hash IN (
     SELECT key_hash FROM event_entries
     WHERE lower(trim(handle)) IN ('citiars','test','phantom_7q9x4m2k')
   );
