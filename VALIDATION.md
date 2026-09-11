# Validation — TECHCRUSH Tbilisi Chase

## Damage and destruction 1.4.0 — 12 September 2026

`npm test`: **85 passed, 0 failed**. Seven added cases cover contact-direction damage at four headings, bounded damage/cooldowns, healing, finite deformed meshes, fixed wheel/steering pivots, aligned headlights, exact rest-vertex restoration, private deformation of the actual licensed GLB, same-step tree fragments, rewind, immovable wreck contacts, clean patrol replacements, one player explosion, bounded effect history and deterministic particle playback/cleanup. The older explosion test now uses the shared 3.8-second lifetime.

Chromium visual checks compared intact and heavily dented Original 458 and Vector V12 bodies, repaired geometry, projected window cracks, patrol wrecks and staged explosion fire/debris. The first original-model check exposed an interleaved-attribute bug; positions and normals were separated into packed private buffers, a bounded-displacement regression was added, and the repaired model was visually rechecked. Player deformation preparation happens during selection, and a permanent flash-light slot avoids changing the scene light count during explosions.

An ordinary-input browser run reached checkpoint 1 at 100 HP after a four-second turbo input (302 km/h observed before pausing). A subsequent turn into a wall reduced HP to 67 and produced front damage 0.65, a visible contact burst and impact audio. Holding rewind restored 100 HP, zero body damage and the earlier checkpoint state. The browser reported eight decoded audio assets, ten played effects, no dropped effects and no errors during that run. Fixtures used for close-up visual inspection are not shipped.

The real mixer was rendered again in Chromium OfflineAudioContext. The revised material/explosion sequence peaked at **0.511 full scale or below**, with finite samples, eight decoded assets, zero drops and at most six concurrent effect voices in that sequence. This is sampled signal validation, not a human listening panel or an every-device performance guarantee. Conservative arcade collision shapes are retained while body dents remain visual; wrecks are solid but explosion fragments do not add area damage.

## Driving audio 1.3.0 — 12 September 2026

`npm test`: **78 passed, 0 failed**. Nine new cases cover distinct engine profiles, idle/load/redline, audible shift RPM drops and gear hysteresis, reverse, coordinate-correct stereo, relative-speed pass detection, same-step material cues including gentle tree contact, vehicle/wall contacts, single police explosions, bounded/deduplicated events, rewind clearing, muted/paused event consumption, asset hashes, fast attacks and loop continuity.

Chromium rendered the actual Web Audio mixer through OfflineAudioContext at stereo 32 kHz: seven seconds for each car, seven seconds for material impacts/passing, and four seconds for pause/rewind/mute. All eight WAVs decoded, every output sample was finite and no asset/effect drops occurred. Engine runs peaked between 0.292 and 0.352 full scale; the material sequence peaked at 0.392 or below. These sampled fixtures did not clip. Opposite-side pass windows correctly favored opposite stereo channels. Samples taken half a second after pause, rewind and mute were silent. Offline fixtures are excluded from distribution. These are signal and behavior checks, not a subjective listening panel or a guarantee for every device/output level.

A live Chromium run enabled audio through the Sound button, decoded eight files, accelerated the Original 458 under turbo to 281 km/h, and displayed seven-speed engine telemetry. The run crossed checkpoint 1, registered a moving pass and vehicle impact effects, then was captured. Twenty effects played with zero drops and no browser errors observed. Cockpit selection and rewind remained functional. This is an audio integration check, not a successful full-route escape. The existing physics and save regression suite remains passing.

## Interface and pursuit expansion 1.2.0 — 12 September 2026

`npm test`: **69 passed, 0 failed**. The six added cases check twenty levels of deterministic clear checkpoint positions, connected routes, SUV/air/tank unlocks, capped tanks and restart behavior, heavier vehicle contacts and HP, three-dimensional air sight through rotated/thin walls, lost-contact searching, escape and helicopter rewind, radial radar bearings, road distance, and finite positive previews for all fourteen parts at four tiers. Existing vehicle, bridge, collision and save tests continue to pass.

Browser review used the real local game and an isolated QA garage in Chromium at 1280 × 720, plus the garage at 390 × 844. Part images, category filtering, all three reward results and free installation were checked; a Silver engine changed the Original 458 from 230 to 245 km/h displayed top speed. The narrow garage had no horizontal overflow. A local fixture positioned the SUV, tank, aircraft and arch for close visual inspection; the aircraft was lowered only in this non-shipped fixture to inspect fittings. The public simulation uses its normal roof-aware flight altitude. No browser errors were observed during these checks.

Full-route controller runs with ordinary driving inputs, recovery, collisions and pursuit enabled:

| Car / equipment         | Level | Result                             | Gates |    Time |  HP |
| ----------------------- | ----: | ---------------------------------- | ----- | ------: | --: |
| Original 458 / stock    |     1 | Captured after all gates           | 6/6   | 198.5 s |  56 |
| Apex R / stock          |     1 | Won                                | 6/6   | 221.7 s |  26 |
| Apex R / all Silver     |     2 | Wrecked during escape              | 6/6   | 194.3 s |   0 |
| Vector V12 / all Silver |     3 | Won, including loss of air contact | 6/6   | 168.0 s |  83 |

The level-2 controller broke air contact and reached 5.4 seconds of escape before a collision ended the run; this is not reported as a passing full-route run. The controller has ideal route knowledge and does not establish human difficulty. Failed early tuning runs led to the mixed-fleet tank cap and air-search refinements. No physical-phone, Safari or measured GPU/FPS claim is made. Local fixtures and test garage databases are excluded from the published game.

In the browser, a three-second throttle/turbo input from the local gate fixture crossed the new first arch, advanced the HUD to 1/6, awarded 150 CR and retained 100 HP. The scene, radar and guide updated to the next checkpoint without browser errors. The established Worker build (`npm run build`) completed successfully.

## Vehicle and contact refinements 1.1.1 — 11 September 2026

`npm test`: **63 passed, 0 failed**.

The release adds six regression cases to the existing 57. Coverage loads the actual restored 458 GLB, verifies that steering hub positions and shaft normals remain fixed for left/center/right inputs, raycasts fitted details against the actual new body meshes, and checks each animated exhaust base against its model outlet. It also checks old-profile migration, same-timestamp prop response and rewind restoration, repeated high-speed impacts against both sides of bridge railings, and timer-independent rollover recovery.

The existing suite continues to drive every segment of all three bridges in both directions and verifies clear center routes across the entire map. Rendering and collision now share railing segments; deliberate road-width junction openings keep exits accessible.

Browser review used the local game in Codex's Chromium browser at 1280 × 720. All four garage choices loaded. A restored-458 run accelerated with turbo, reached checkpoint 1 at 100 HP and showed 301 km/h during boost. The original cockpit rendered correctly in the city; no warning/error messages were returned by the browser log check. A temporary isolated model viewer was used for front detail checks on all four cars, hypercar rear fittings, and left/right steering checks in the original and procedural cabins. That fixture was removed before release. These observations are visual checks, not a photorealism or FPS claim.

Full-route controller results with ordinary controls, traffic, pursuit, tree contacts and normal recovery enabled:

| Model        | Result                   | Gates |    Time |  Score |  HP | Takedowns |
| ------------ | ------------------------ | ----- | ------: | -----: | --: | --------: |
| Original 458 | Captured after all gates | 6/6   | 198.5 s | 25,334 |  56 |         6 |
| Apex R       | Won                      | 6/6   | 221.7 s | 33,912 |  26 |        11 |

The original-car controller reached all gates but did not escape; this is not recorded as a passing full-route run. The controller has ideal route knowledge and is not a human difficulty assessment. No new physical-phone, Safari or measured GPU-performance claim is made.

## Career edition 1.1.0 — 11 September 2026

`npm test`: **57 passed, 0 failed**. New coverage includes full-footprint clearance for every building against all road widths, three bridges driven both ways, high-speed thin-wall collisions, distinct finite car meshes, 14 parts/four tiers, integrated engine/brake/turbo effects, repeatable three-slot rewards, wallet/part operations, level scaling, wreck-credit rewind, breakable poles and durable SQLite saves. The API suite verifies two isolated profiles, conflicts, retries, box/level idempotency and closing/reopening the database.

The regenerated road graph contains **519 nodes and 671 segments**, with a connected asphalt surface containing **46 block islands**. Peace Bridge has an explicitly fictional driveable connection.

Observed level-1 controller runs, with ordinary driving inputs and recovery:

| Model      | Result | Gates |    Time |  Score |  HP | Takedowns |
| ---------- | ------ | ----- | ------: | -----: | --: | --------: |
| Apex R     | Won    | 6/6   |   220 s | 32,384 |  54 |         9 |
| Vector V12 | Won    | 6/6   |   211 s | 29,473 |  85 |         4 |
| Veyra W16  | Won    | 6/6   | 218.1 s | 32,417 |  88 |         6 |

The initial Veyra controller was artificially capped at the previous car's speed; it reached all six gates but wrecked before escape. Updating the controller to use the selected car's speed envelope produced the recorded win. A level-4 Veyra fixture with all Silver parts reached all six gates but wrecked during escape at 290 s with 14 police slots; it demonstrates tougher pursuit, not successful completion or human difficulty calibration. No checkpoints, immunity or health were granted during those runs. The test controller does not intentionally jump or rewind; dedicated tests cover those mechanics.

Local Chromium review checked all three model selections, welcome-box animation, a free Gold spoiler installation, a 600 CR engine purchase and reload persistence (400 CR remaining, fitted engine/spoiler retained). A Veyra drive reached 316 km/h with turbo after approximately three seconds at 100 HP; holding rewind returned position, speed, score and nitro to the initial state. Cockpit rendering was inspected and its driver offset aligned with the steering wheel. Tests and visuals are local evidence; they do not establish low-end phone performance or a one-to-one reconstruction of Tbilisi.

## Historical expanded-city validation

The remaining sections document version 1.0.0, before the career and model update; their counts and car labels are historical.

## Automated checks

`npm test`: **44 passed, 0 failed**. Existing checks cover acceleration, braking, reverse, fixed-step consistency, left/right steering and Georgian physical keys, lateral drift, turbo spool/release/empty lockout, walls, oriented vehicle contacts, police-to-police separation, solid/breakable trees, pursuit roles and roadblocks, limited radio observation, police HP/explosion/replacement, checkpoints and repairs, escape/capture/restart, camera clearance, navigation and local module imports.

Eight new checks cover driving onto a shared ramp, flight/landing score, roll control and upright recovery with damage, whole-world rewind, the rolling five-second limit, release/future-history discard, rewinding after a wreck, restoration of trees and police identities across respawn, and reinforcements capped at twelve. Stunt tests were rerun after raising the overturned car so its roof stays above the street.

The graph has **514 nodes and 665 segments**. All nodes are connected and six gates have clear road routes. Triangulation tests check street coverage and upward-facing triangles. Asphalt is one polygon with **45 block islands**; ground includes a river cutout. No non-bridge road midpoint lies within 35 metres of the final river center line.

## Full driving runs

The deterministic controller uses ordinary throttle, steering, braking, turbo and the player's R recovery action, including its score penalty. Traffic, trees, collisions and all police roles stay active. It grants no gates, health or immunity. These runs do not use rewind or intentional jumps; those have separate tests. Ideal route knowledge and recovery establish completion, not first-time human difficulty.

| Car          | Result  | Gates | Simulation time | Score  | Condition | Takedowns | Broken trees | Units |
| ------------ | ------- | ----- | --------------- | ------ | --------- | --------- | ------------ | ----- |
| 458 Stradale | Escaped | 6/6   | 262.2 s         | 35,450 | 14%       | 12        | 9            | 12    |
| 458 Track    | Escaped | 6/6   | 228.0 s         | 34,340 | 62%       | 11        | 7            | 12    |
| 458 Touring  | Escaped | 6/6   | 245.1 s         | 33,636 | 75%       | 9         | 11           | 12    |

Reproduce with `node tests/route-drive.mjs gt`, `node tests/route-drive.mjs rally`, and `node tests/route-drive.mjs suv`. These results use the final map, bridge approach clearance and contact broad phase. The later overturned-car height change does not affect these no-jump runs. The first Touring run failed after six gates; a small acceleration, handling and speed increase allowed escape from the larger force while retaining the slower armored character.

## Browser inspection

The actual game was driven using its registered controls in Chromium. Turbo, a handbrake turn and driving after rewind were checked. Drift reached 27 degrees of lateral slip. Holding rewind took time from 7.8 to 2.8 seconds and score from 351 to 143, then held at the five-second boundary. Rewind after capture restored an earlier unboxed state, a previously destroyed patrol and earlier HP. Another run reversed to its beginning; releasing immediately returned `running`, acceleration worked again, then pause worked. Browser error/warning logs were empty.

Temporary review pages rendered real assets at Baratashvili Bridge, Peace Bridge, Rike, the twin tubes, Europe Square and Abanotubani. A controlled ramp fixture used the real simulation/renderer: the car reached **5.6 m**, rolled upside down, and returned upright with HP remaining. These fixtures are not ordinary completed playthroughs and are removed from the delivered site.

Inspected two-sided TECHCRUSH branding, deck alignment, river banks, sidewalks/crossings, lawns, 3D trees, masonry/mosaic, roofs and the narrow-screen HUD. The local minimap shows nearby streets and ramps. Rewind hides the overlapping route cue.

## Issues corrected

- Moved the approximate river away from Dachi Ujarmeli Street and the Gorgasali extension; removed floating street islands.
- Aligned bridge decks to roads and cleared the Peace Bridge's blocked approach.
- Gave Rike tubes a single waist and visible sampled diamond seams.
- Clipped park edges to the bank; replaced spherical hill bases with irregular terrain leaving roads clear.
- Prevented interpolation between different patrol identities across respawn.
- Made the rewind tool's release immediate and cleared rewind styling on returning to the garage.
- Rejected distant buildings before contact/visibility transforms. A local 600-step CPU sample fell from about 4.28 to 1.17 ms/step; this is not a browser FPS claim. Full-run outcomes stayed unchanged.

## Limits

The game combines cached OSM streets, approximate manual connections, widened roads, reference-inspired buildings and original terrain. Live expanded-area map requests were unavailable. It is **not** an exact satellite reconstruction, Google Maps photogrammetry, or a measured model of every facade. Provenance is in `ASSETS.md` and Credits.

The three trims share a 458 model; other vehicles are original procedural geometry. Ramps/rollover use arcade physics without suspension simulation or body deformation. Buildings and tree trunks are solid; small sidewalk furniture is decorative. Bridges share the road datum, without separately driveable lower decks. Physical phones, Safari and low-end GPUs were not tested. WebGL2 is required. No multiplayer, persistent leaderboard or accounts are implemented.
