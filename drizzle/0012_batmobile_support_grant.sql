-- Authorized gift, bound to the exact two receipts from the previous support case.
-- No balances, levels, scores, artifact finds, equipment or active runs are reset.
WITH targets AS (
 SELECT g.*,json_extract(s.receipt,'$.recipient') recipient,
   COALESCE(json_extract(g.profile,'$.batBoxes'),0) boxes_before
 FROM garages g JOIN support_adjustments s ON s.key_hash=g.key_hash
 WHERE s.case_id='artifact-search-2026-09-21'
   AND g.key_hash IN (
     '7f5f815e14ce4183a3e6ea4f455dcf1f30d97945d2c54c896811dcf78710322c',
     'fcfa3ee8eec3d9d8f89f0b496cd0c534c89af5f2519098bc26dbfcb74080a861')
   AND json_extract(g.profile,'$.supportAdjustments.batmobileGift20260921') IS NULL
   AND NOT EXISTS(SELECT 1 FROM support_adjustments done WHERE done.key_hash=g.key_hash AND done.case_id='batmobile-gift-2026-09-21')
), changes AS (
 SELECT key_hash,json_set(profile,
   '$.batBoxes',boxes_before+1000,
   '$.unlockedCars',json(CASE WHEN EXISTS(SELECT 1 FROM json_each(profile,'$.unlockedCars') WHERE value='batmobile')
     THEN json_extract(profile,'$.unlockedCars') ELSE json_insert(COALESCE(json_extract(profile,'$.unlockedCars'),'[]'),'$[#]','batmobile') END),
   '$.cars.batmobile',json(COALESCE(json_extract(profile,'$.cars.batmobile'),'{}')),
   '$.supportAdjustments.batmobileGift20260921',json_object(
     'recipient',recipient,'car','batmobile','batBoxesAdded',1000,
     'batBoxesBefore',boxes_before,'batBoxesAfter',boxes_before+1000,
     'versionBefore',version,'appliedAt',unixepoch()*1000)) patched
 FROM targets
)
UPDATE garages SET profile=(SELECT patched FROM changes WHERE changes.key_hash=garages.key_hash),
  version=version+1,updated_at=unixepoch()*1000
WHERE key_hash IN (SELECT key_hash FROM changes);
--> statement-breakpoint
INSERT INTO support_adjustments(id,key_hash,case_id,receipt,applied_at)
SELECT 'batmobile-gift-2026-09-21:'||key_hash,key_hash,'batmobile-gift-2026-09-21',
 json_extract(profile,'$.supportAdjustments.batmobileGift20260921'),
 json_extract(profile,'$.supportAdjustments.batmobileGift20260921.appliedAt')
FROM garages WHERE json_type(profile,'$.supportAdjustments.batmobileGift20260921')='object'
ON CONFLICT(id) DO NOTHING;
