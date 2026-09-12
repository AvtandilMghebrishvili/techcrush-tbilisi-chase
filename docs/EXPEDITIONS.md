# Tbilisi expeditions — v1.12

## Find the new challenges

During a chase, use **ROUTE** inside the pursuit panel (top right). Choose Checkpoints, Skybox or River Gap. The road arrows and distance display change together. Near the ramp, guidance points to the launch edge; in flight it points toward the landing zone. Main checkpoint progress stays intact while you explore. The original four street ramps remain available.

| Challenge | How to complete it | One-time reward per garage |
| --- | --- | --- |
| Skybox | Use the northern ramp at roughly 200–230 km/h, keep the car straight, land upright on the 14 m roof and drive into the red crate | 1 three-part upgrade box + 2,500 CR |
| Mtkvari Gap | Use the embankment ramp at around 220 km/h and land upright on the opposite bank | 1 three-part upgrade box + 1,500 CR |

Keep accelerating up the ramp; letting off early loses speed. Excessive turbo can overshoot the roof. Release steering in the air to avoid a roll. Hold Q or the mobile rewind button to retry the last five seconds. If you fall into the river, the existing sinking and road recovery rules apply. A living overturned car recovers automatically.

Collected challenge rewards are banked with the run when you finish the level or choose Garage / Restart. The crate disappears after collection. Each box opens into three independently rolled parts; duplicate items remain possible. Banked challenges stay completed after updates. An unfinished chase, including unbanked rewards, is still held only in the current tab.

## New city content

The road graph grows from 551 nodes / 704 segments to **598 / 766**, adding northern streets around First Republic Square, Akhvlediani, Kiacheli, Zandukeli, Vashlovani and nearby lanes from the archived OSM source. An original Architecture Drive connects a new landmark plaza. Stunt approach and landing aprons join the asphalt surface without bridging open water. All roads remain bidirectional for arcade play.

The Bank of Georgia-inspired headquarters uses intersecting elevated volumes and ground supports. Its real Gagarin Street location lies outside this central-city map; this is an explicitly compressed landmark placement, not a surveyed reconstruction. Two taller office buildings occupy the new northern district. New original brick, stucco, arched-window and glazed-office facade atlases supplement the existing textures. Window lights follow the day/night system.

**YouTuber Car**, **Kutaisi** and **Batumi** are disabled coming-soon slots. They do not add a playable car/map or change existing car IDs.

## Endless pursuit

Tbilisi has no designed final level. Existing sedan patrols remain in the fleet. SUVs and the helicopter appear from level 2; tanks from level 3; coupe interceptors from level 4; V12 pursuit cars from level 7. Speed, acceleration, planning cadence, anticipation and reinforcement pressure keep scaling toward bounded limits. Active patrol capacity rises from 12 to at most 22, preserving a fixed performance budget. Higher levels also retain the score/cash multipliers described in [Community](COMMUNITY.md).

## Save compatibility

Profile schema 4 adds `quests.completed` with stable IDs `tbilisi-skybox-v1` and `mtkvari-gap-v1`. Migration clones the existing profile and supplies missing defaults. Credits, level, boxes, inventory, installed parts, paint, selected car, driver name, badges, standings and unrelated future fields are preserved. No database is replaced and no existing SQL migration is rewritten.

The anonymous garage key, server key hash, local storage names, outbox format, public profile ID and public site origin are unchanged. New streets, scenery, textures and car slots are not used as save-array offsets. Older community clients can still settle runs without the optional `quests` metric. New challenge claims require a matching server run ticket and plausible jump/speed/time counters, and are awarded once in the same atomic garage settlement. This remains a casual community game with client-reported physics, not a competitive anti-cheat server.

For future releases: add stable content IDs; migrate additively; retain old IDs; test old JSON fixtures and old client requests; never clear browser keys or the production database as part of a deployment. Keep your private garage backup when changing devices or clearing browser storage.

## Implementation and checks

- `dist/world-sites.js`: shared ramps, roof, aprons and landmark colliders.
- `dist/stunts.js`: swept ramp faces, low-end entry, launch, roof support and airborne landing.
- `dist/expansion-visuals.js`: original facade atlases, matching landmark geometry and quest crate.
- `dist/navigation-cache.js`: shared checkpoint/challenge targets for HUD, map and arrows.
- `dist/community-rules.js` / `dist/progression.js`: additive saves and one-time server awards.
- `tests/expedition.test.mjs`: actual rooftop/river flight, failed approaches, solid ramp faces, road clearance, old saves, replay prevention and late pursuit types.

Build roads with `python scripts/build-map.py` followed by `node scripts/build-road-surface.mjs`. Run `npm test`, `npm run build`, and `npm run check:build`. The authored source lives in `dist/`; only its generated `client`, `server` and `.openai` children are build outputs.
