# Validation — TECHCRUSH Tbilisi Chase

## Compact interface 1.10.0 — 12 September 2026

`npm test`: **123 passed, 0 failed**. The production build and link/asset verification pass. Existing 21 runtime assets (41,110,441 bytes) remain byte-identical; toolbar icons are inline SVG and no additional media is downloaded.

Chrome UI review passed at **1440×900, 1280×720, 1024×768, 390×844, 360×640, 844×390 and 667×375**. Checks covered reachable Start/Garage/toolbars, phone control hit targets, no document overflow, pause Tab/Shift+Tab wrapping, focus after Resume, grouped graphics/gyro settings, sticky garage shortcuts, grade previews and three-reward dialogs. The small-screen Start clipping and tablet recovery/rewind overlap found during review were corrected. A separate 360×640 inspector capture measured 314 px content width and 314 px scroll width.

Touch emulation retained simultaneous steering/drift/nitro, committed burst after release, depletion, manual gas/steer/drift, pointer cancellation and gyro switching. The final minified build passed touch driving, pause, isolated save-backed box opening, garage preview, persisted preferences/box state after reload, and desktop W/Shift driving. No page errors, missing assets or QA globals were found.

Lifecycle checks passed audio/visual suspension on pause, hidden pages and finished chases, resumed audio, terminal rewind and garage invalidation. Six run/garage cycles retained **4,734 world geometries / 81 textures**, **67 garage geometries / 5 textures**, no active effects/voices at rest and a **63.95–64.29 MiB** sampled JS heap after collection. These are local Chrome/emulated-touch checks, not physical-phone, Safari or FPS certification. QA scripts, captures and isolated profiles remain under ignored `artifacts/`.

## Roads, terrain and river safety 1.9.0 — 12 September 2026

`npm test`: **123 passed, 0 failed**. New coverage checks all road centers and both lanes against water/hills, connected added streets, sedan/SUV/tank water recovery, live riverbank pursuit, player HP/recovery/rewind, immediate panel fracture and restoration, mountain collision, exact nearest-road parity and broad-phase contact parity. The old unbreakable-rail regression was replaced by the new high-impact fracture requirement.

The full level-one controller run won: all six checkpoints followed by eight seconds of escape, with normal throttle/steering/braking and the normal recovery action. A controlled Chrome fixture verified actual patrol mesh descent, one splash, removal of the splash effect, and a new patrol identity on dry road; no page errors occurred. Rendered screenshots revealed a riverbed overlap during development, which was corrected and covered by a regression.

Chrome touch emulation passed simultaneous steering/drift/nitro, tap-to-deplete, independent releases, manual three-finger controls, cancellation and gyro switching. Control hit targets remained clear at 360×740, 390×844, 667×375 and 844×390. Lifecycle checks passed pause/hidden/result suspension, resumed audio, terminal rewind, garage invalidation and six repeated run/garage cycles with stable geometry/texture counts. These are browser emulation tests, not physical-device tests.

The final minified build passed touch drift/nitro, pause, real isolated save-backed box opening, garage preview, persisted settings and box state after reload, and desktop keyboard driving. No missing assets or QA globals were present. Build/link verification confirms that all 21 runtime assets (41,110,441 bytes) remain byte-identical to source.

The local simulation benchmark used 1,200 steps at 120 Hz, a stationary level-three player, normal traffic/pursuit and a living-player fixture. Warm-sample median was **1,956.8 ms before / 752.6 ms after**, about **62% less simulation CPU time** in that workload. This is not a total-game FPS or phone battery claim. See [PERFORMANCE.md](docs/PERFORMANCE.md).

## Mobile arcade controls and loading 1.8.0 — 12 September 2026

`npm test`: **113 passed, 0 failed**. Six new cases cover one-tap depletion/recharge, simultaneous steering/drift/boost in actual physics, brake priority, thumb ownership/hysteresis, lifecycle cancellation, exact route-cache invalidation and hashed-asset caching. Build and `npm run check:build` pass; all 21 shipped assets match source bytes exactly.

Chrome touch emulation verified simultaneous thumb-pad drift + NITRO, continued boost after finger release, independent steering release, empty-tank lockout, and manual gas/right/drift. Hit targets were unobstructed with no horizontal overflow at 360×740, 390×844, 667×375 and 844×390. Separate synthetic gyro checks passed re-enable, pause detachment, neutral reset and resumed steering.

The minified production build passed touch driving/nitro/pause, a real isolated save-API box opening, garage preview, persistence of opened boxes and manual preferences across reload, and desktop W/Shift at 1280×800. A pre-existing Start/footer overlap at that desktop size was fixed with a scrollable menu. No page errors or missing assets appeared in the completed production check. Credits' road downloads remain available and no QA globals ship.

[Cold-load measurements](docs/PERFORMANCE.md#mobile-loading-180): requests 83→18, JS 2.79→1.05 MB and observed load 10.23→8.66 s at 40 ms / 4 MiB/s. No new graphics reduction or save-schema change. Physical-phone feel, FPS and thermal performance remain unverified.

## Idle CPU lifecycle 1.7.1 — 12 September 2026

`npm test`: **107 passed, 0 failed** including four new lifecycle/audio cleanup cases. Production Worker/assets build passes. [Detailed before/after measurements and reproduction steps](docs/PERFORMANCE.md).

In controlled local Chrome samples, paused/result/menu city rendering fell from roughly 60 frames/second to zero after settling, and the stationary garage stopped its separate rendering loop. Main-thread task time in three-second idle windows fell from 175–3,029 ms to at most 1 ms. AudioContext changes from running to suspended in previously played idle states. Invisible turbo SVG animation is paused as well. These are idle workload measurements, not total machine CPU or gameplay FPS guarantees.

Browser regressions passed driving, audio mute/resume, synthetic visibility lifecycle, crash-tail disposal, waking from game-over with Q rewind, and on-demand garage orbit/inspection. Six warmed run/garage cycles kept geometry/texture counts constant, effects/voices at zero after returning, and collected JS heap within 59.33–59.67 MiB. No growing resource leak was observed in this bounded sample. Mobile emulation passed the existing touch, synthetic gyro permission/fallback, pinch and five viewport/layout checks. No page errors were reported; no physical-device thermal or long-soak claim is made.

Changes retain the same visual detail, simulation, saved-garage format and public URL. Local QA uses an in-memory database; measurement fixtures are excluded from production.

## Mobile driving 1.7.0 — 12 September 2026

`npm test`: **103 passed, 0 failed**. Seven mobile cases cover four screen orientations, calibration/dead zone/filtering, Euler-angle wrap, stale-data neutrality, independent pointer ownership, keyboard priority, auto-gas brake override, actual simulation equivalence/rewind, GPU pixel budgets and portrait camera framing. Production Worker/assets build passes.

Chromium mobile emulation at 844×390 with three simultaneous touch points verified gas + steering + turbo, independent release and cancellation. Browser checks covered denied and granted synthetic motion permission, right-turn mapping, calibration, no-sensor timeout, brake overriding auto gas, graphics changes, pause/reset of held controls, saved settings after reload, garage pinch zoom and a real welcome-box action. Layouts at 360×740, 390×844, 667×375, 844×390 and 1024×768 had no horizontal document overflow. Portrait gameplay/cockpit, garage, reward box and landscape gameplay/settings screenshots were inspected. A 1440×900 desktop keyboard regression passed. No page errors were reported.

The phone path skips the 12,089,548-byte near-tree asset, uses the existing lower-detail tree model and caps Auto/Battery saver rendering at 800,000 pixels. This is a resource budget, not a measured physical-phone FPS guarantee. Game physics, save format and player garages are unchanged. QA uses an isolated in-memory database and ignored capture fixtures; no production test controls are shipped.

**Limit:** these are Chromium emulation and synthetic sensor checks, not physical iPhone/Android, Safari, thermal or device-permission-dialog tests. Real-device gyro calibration and performance still require hardware validation. Touch fallback remains available.

## Evening lighting and racing interface 1.6.0 — 12 September 2026

`npm test`: **96 passed, 0 failed**. Three new cases cover continuous/deterministic day-night progression, mode overrides, bounded nearest-intact-lamp selection, same-frame broken-lamp cutoff, rewind restoration, zero daylight lamp intensity and fixed scene/light allocation over repeated updates. Existing navigation, driving, destruction, pursuit and saved-garage tests remain passing.

Local Chromium review covered dusk and night menus, the visible moon, aligned occupied-window emission, street lighting, daylight restoration, nighttime chase and Original 458 cockpit views, the independently lit garage studio, upgrade buttons and the three-part reward dialog. A four-second ordinary turbo input crossed checkpoint 1 with 100 HP; the tool reported 318 km/h before capture. The lighting preference survived reload, and the selector was returned to Auto. No browser rendering errors or warnings were observed in the final check.

At 390 × 844 the menu exposed all car choices and the Start button, the header controls wrapped into a separate row, upgrade comparisons were corrected to a single column, and mobile navigation/rewind were moved clear of the other HUD readouts. The reward dialog showed all three results, and its return action worked. The final compact cockpit layout was visually reviewed and the viewport override reset. Custom DOM measurement calls timed out after viewport changes, so these are visual layout checks rather than measured overflow assertions. No physical-phone or Safari verification is claimed.

The diagnostic local fixture reported 899 registered lamps, 64 active nearby effect instances and exactly 3 real local lights. The design adds no media downloads, per-window meshes, shadow maps or bloom passes; the five emission masks and one falloff texture are generated once. This is a bounded rendering-cost check, not a measured FPS or low-end-device performance guarantee. QA records and the isolated reward/profile database remain under ignored `artifacts/` and are excluded from publishing.

## Navigation scale 1.5.1 — 12 September 2026

`npm test`: **93 passed, 0 failed**. Added coverage verifies sub-200 ms route updates, stable arrow size/height during light animation, paused effects, finite positions after time reversal, near-windshield clearance, depth testing and bounded projected widths for all four cameras at landscape and portrait aspect ratios. The existing street-route, checkpoint, driving, rewind, collision, pursuit and garage cases remain passing.

Local Chromium visual review covered cockpit, hood, chase and aerial views at 1280 × 720, the Original 458 and Vector V12 cabins, and compact cockpit navigation at 390 × 844. A three-second turbo input reached 288 km/h; a further 1.1-second input crossed checkpoint 1 at 100 HP and displayed the new route and right-turn HUD. The narrow HUD measured a 36 px direction glyph and 28 px distance with no panel background. Temporary viewport overrides were reset. No browser warnings or errors were reported in the final cabin check. A short-landscape screenshot attempt timed out, so no visual verification claim is made for that viewport; projected geometry is covered by the tests. These checks are not physical-device or measured-FPS certification.

## Garage studio and cabins 1.5.0 — 12 September 2026

`npm test`: **91 passed, 0 failed**. Six added cases cover validated independent per-car paint, serialization, unchanged performance/currency on repaint, 56 finite and geometrically distinct part grades, fixed wheel centers/radii/calipers, fitted wing assemblies, original GLB hub alignment/template isolation, exact non-mutating performance comparisons, and cockpit guide positioning/reset. Existing driving, collision, body damage, steering, rewind, pursuit, map and save tests remain green. `npm run build` produced the Worker, client assets and existing database migrations successfully.

The real Chromium garage was tested against an isolated local save database. Electric paint was saved and retained across reload. A Bronze engine purchase charged 600 CR and raised the Original 458 ceiling from 230.4 to 237.6 km/h. All four rim purchases produced the matching tier geometry, returned replaced parts and showed animated comparisons. A Gold spoiler was previewed and installed from inventory for free. Changing a preview quality did not spend credits. Original and Vector exterior/cabin views, the corrected mounted instrument binnacle, the final raised/tilted road arrows and completed three-part box artwork were visually reviewed. The engine/gear display uses the same telemetry calculation as audio. An ordinary 1.5-second throttle input was tested in the revised Vector cockpit; 123 km/h and 100 HP were observed when paused after capture. No complete-route or new difficulty claim is made for this release.

At 390 × 844 the garage dialog's measured content and client widths were both 357 px (no horizontal overflow), with paint controls wrapping and the car preview visible. The temporary viewport override was reset. No browser errors or warnings were observed in the final garage/reward checks. Test funding, diagnostic controls and databases live only under ignored `artifacts/`; no production garage was modified by the agent. These checks do not constitute physical-phone, Safari or measured-FPS testing.

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
