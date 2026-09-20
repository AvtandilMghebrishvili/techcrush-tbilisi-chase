CREATE TABLE IF NOT EXISTS `support_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`case_id` text NOT NULL,
	`receipt` text NOT NULL,
	`applied_at` integer NOT NULL,
	FOREIGN KEY (`key_hash`) REFERENCES `garages`(`key_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- This one-time case is authorized for exactly Ani and the uniquely named,
-- unlisted/private techcrush-mac garage. It never changes scores or event finds.
WITH targets AS (
  SELECT g.*,
    CASE WHEN g.key_hash='7f5f815e14ce4183a3e6ea4f455dcf1f30d97945d2c54c896811dcf78710322c'
      THEN 'Ani' ELSE 'techcrush-mac' END recipient,
    COALESCE(json_extract(g.profile,'$.events."city-wars-2026-09".artifactPurchases.batumi'),0) purchases
  FROM garages g
  WHERE json_extract(g.profile,'$.supportAdjustments.artifactSearch20260921') IS NULL
    AND json_type(g.profile,'$.events."city-wars-2026-09"')='object'
    AND (
      (g.key_hash='7f5f815e14ce4183a3e6ea4f455dcf1f30d97945d2c54c896811dcf78710322c'
        AND EXISTS(SELECT 1 FROM event_entries e WHERE e.key_hash=g.key_hash
          AND e.event_id='city-wars-2026-09' AND e.handle_key='ani'))
      OR (lower(trim(g.display_name))='techcrush-mac' AND (g.private_mode=1 OR g.listed=0)
        AND (SELECT COUNT(*) FROM garages WHERE lower(trim(display_name))='techcrush-mac')=1)
    )
), cities(map, city_order) AS (
  VALUES ('tbilisi',0),('kutaisi',1),('batumi',2)
), artifacts(artifact) AS (VALUES (0),(3),(6),(9),(12)), candidates AS (
  SELECT t.key_hash,c.map,c.city_order,a.artifact,
    ROW_NUMBER() OVER (PARTITION BY t.key_hash,c.map ORDER BY a.artifact) city_choice
  FROM targets t CROSS JOIN cities c CROSS JOIN artifacts a
  WHERE NOT EXISTS(SELECT 1 FROM json_each(t.profile,'$.events."city-wars-2026-09".artifacts.'||c.map) WHERE value=a.artifact)
    AND NOT EXISTS(SELECT 1 FROM json_each(t.profile,'$.events."city-wars-2026-09".artifactHints.'||c.map) WHERE value=a.artifact)
), ordered AS (
  SELECT *,ROW_NUMBER() OVER (PARTITION BY key_hash ORDER BY city_choice,city_order,artifact) choice FROM candidates
), picked AS (SELECT * FROM ordered WHERE choice<=3), amounts AS (
  SELECT t.*,CASE WHEN recipient='techcrush-mac' THEN
    CASE purchases WHEN 1 THEN 1000000 WHEN 2 THEN 2000000 WHEN 3 THEN 4000000 WHEN 4 THEN 8000000 WHEN 5 THEN 16000000 ELSE 0 END
    ELSE 0 END refund
  FROM targets t
), changes AS (
  SELECT t.key_hash,
    json_set(t.profile,
      '$.credits',COALESCE(json_extract(t.profile,'$.credits'),0)+10000000+t.refund,
      '$.creatorBoxes',COALESCE(json_extract(t.profile,'$.creatorBoxes'),0)+100,
      '$.events."city-wars-2026-09".artifactPurchases.batumi',t.purchases-CASE WHEN t.refund>0 THEN 1 ELSE 0 END,
      '$.events."city-wars-2026-09".artifactHints.tbilisi',json((SELECT json_group_array(value) FROM (
        SELECT value FROM json_each(t.profile,'$.events."city-wars-2026-09".artifactHints.tbilisi')
        UNION SELECT artifact FROM picked WHERE key_hash=t.key_hash AND map='tbilisi'))),
      '$.events."city-wars-2026-09".artifactHints.kutaisi',json((SELECT json_group_array(value) FROM (
        SELECT value FROM json_each(t.profile,'$.events."city-wars-2026-09".artifactHints.kutaisi')
        UNION SELECT artifact FROM picked WHERE key_hash=t.key_hash AND map='kutaisi'))),
      '$.events."city-wars-2026-09".artifactHints.batumi',json((SELECT json_group_array(value) FROM (
        SELECT value FROM json_each(t.profile,'$.events."city-wars-2026-09".artifactHints.batumi')
        UNION SELECT artifact FROM picked WHERE key_hash=t.key_hash AND map='batumi'))),
      '$.supportAdjustments.artifactSearch20260921',json_object(
        'recipient',t.recipient,'bonusCredits',10000000,'creatorBoxes',100,'refund',t.refund,
        'refundCity',CASE WHEN t.refund>0 THEN 'batumi' ELSE NULL END,
        'purchasesBefore',t.purchases,'purchasesAfter',t.purchases-CASE WHEN t.refund>0 THEN 1 ELSE 0 END,
        'creditsBefore',json_extract(t.profile,'$.credits'),
        'creditsAfter',COALESCE(json_extract(t.profile,'$.credits'),0)+10000000+t.refund,
        'creatorBoxesBefore',COALESCE(json_extract(t.profile,'$.creatorBoxes'),0),
        'creatorBoxesAfter',COALESCE(json_extract(t.profile,'$.creatorBoxes'),0)+100,
        'previousPurchase',json_extract(t.profile,'$.lastPurchase'),
        'previousHints',json_extract(t.profile,'$.events."city-wars-2026-09".artifactHints'),
        'grantedHints',json((SELECT json_group_array(json_object('map',map,'artifact',artifact)) FROM picked WHERE key_hash=t.key_hash)),
        'versionBefore',t.version,'appliedAt',unixepoch()*1000
      )
    ) patched
  FROM amounts t
)
UPDATE garages SET profile=(SELECT patched FROM changes WHERE changes.key_hash=garages.key_hash),
  version=version+1,updated_at=unixepoch()*1000
WHERE key_hash IN (SELECT key_hash FROM changes);
--> statement-breakpoint
-- The receipt remains recoverable if publishing is retried after the update.
INSERT INTO support_adjustments(id,key_hash,case_id,receipt,applied_at)
SELECT 'artifact-search-2026-09-21:'||key_hash,key_hash,'artifact-search-2026-09-21',
  json_extract(profile,'$.supportAdjustments.artifactSearch20260921'),
  json_extract(profile,'$.supportAdjustments.artifactSearch20260921.appliedAt')
FROM garages WHERE json_type(profile,'$.supportAdjustments.artifactSearch20260921')='object'
ON CONFLICT(id) DO NOTHING;
