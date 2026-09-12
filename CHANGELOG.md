# Changelog

## 2.1.0 — 2026-09-13

- Place 48 two-sided TECHCRUSH subscription banners in each city with large Georgian copy and a laughing emoji. Exactly three turn into 4,000-coin smash rewards per new run, selected from its server-issued identifier.
- Award 25 coins per player-destroyed decoration, capped at 100 paid ordinary decorations per run. Linked supports count once; NPC destruction earns nothing. Rewind restores props and counters together. Server settlement derives the money from bounded, validated counters; old clients can omit the new fields.
- Increase solid patrol impacts to a 10 HP cap and tank impacts to 15 HP before armor; grazing hits remain proportional and the existing contact cooldown remains.
- Replace flat car icons with eight compact WebP studio captures of the actual models. Use a horizontal car picker, shorter labels and balanced launch actions on desktop, phone and landscape layouts.
- Mark available cash banners in gold on the radar and full quest map. Reuse the existing collision grid, event feed, textures and idle lifecycle; no additional animation loop or renderer is added.

## 2.0.0 — 2026-09-13

- Open every city immediately and add Batumi: connected real-street data, Black Sea, boulevard planting, original palm geometry, thirteen landmark interpretations and a distant airport. Share pursuit, traffic, checkpoints, rewind, weather and garage logic. Add a connected Platinum rooftop stunt.
- Restore classic responsive cornering; add bounded steering/drift controls and reset. Match visual tire support to asphalt/sidewalks and body lean.
- Add three city-level-five mystery cars and the signature TECHCRUSH YouTuber Car, unlocked by ten cumulative banked patrol takedowns. Every ten earn a three-part creator box. Add Emerald/Ruby/TECHCRUSH beyond existing Platinum, with exclusive installation rules and bounded fused performance.
- Preserve old profiles with additive schema 5 migration and idempotent reward claims. Keep independent city rankings; archive prior timed courses and start Tbilisi 2.0, Kutaisi 2.0 and Batumi 1.0.
- Redesign city/car cards, launch actions, graphical reward summaries, mystery-car reveals and persistent coin balance. Show each city’s milestone progress.
- Generate public result PNG cards server-side with city/car artwork and Georgian names. Check visibility on both HTML and image endpoints. No browser renderer or new native dependency on the server.
- Default to enabled music after a gesture, with mute/volume/reset; start Auto at night with a full 180-second cycle. Keep audio and rendering suspended when hidden/paused.
- Batch individually breakable lamps on all maps, use O(1) lamp membership during batching, retain selected-city lazy loading, bounded tree LOD and unchanged existing media quality.

## 1.18.0 — 2026-09-13

- Redesign the start menu around city selection, car selection and one prominent Start action. Use balanced columns on wide screens, a scrollable phone layout and a persistent launch area with garage/ranking access.
- Show Kutaisi's exact unlock requirement, completed Tbilisi levels out of three, remaining levels, selected/locked/unlocked states and available-city count. Refresh from the existing profile change event.
- Keep the selected city/level and current car beside Start; add an accessible Change shortcut to the selected car. Retain upcoming Batumi and YouTuber Car slots.
- Use inline city illustrations and CSS only: no new media, continuous animation, frame loop or background request. Preserve gameplay, garages and timed courses.

## 1.17.0 — 2026-09-13

- Show up to three animated score notices for patrol takedowns, near misses, completed drifts, safe jump landings, checkpoints and escapes. Display actual awarded points and credits, with a desktop level multiplier. Traffic destruction correctly shows credits only.
- Award near misses when the player actually passes a traffic car with safe side clearance and enough relative speed. Reject collisions, following, teleports and repeated junction proximity; rewind restores eligibility and clears stale notices.
- Add gentle tire scrub and speed/grip-dependent understeer on both maps. Braking before a corner restores a tighter line; handbrake drift and combined mobile nitro remain available, including maximum fused builds.
- Bound the event queue and DOM, reuse the existing HUD loop and pause animations when inactive. Update checkpoint dots only when progress changes. No new media or graphics-quality reduction.
- Preserve garages, parts, levels and rankings. Archive previous timed courses and start Tbilisi 1.17 / Kutaisi 1.2 for the changed driving rules.

## 1.16.0 — 2026-09-13

- Fix handbrake input after toolbar focus and rear-traction behavior with upgraded/fused tires. Support smooth drift entry, recovery and re-entry on both maps; keyboard and mobile turbo can accompany a turn.
- Match the base patrol speed to the selected car build, add 20% of that base per level up to a 145 m/s physics ceiling, raise acceleration and increase Kutaisi starting units to six with shorter reinforcement intervals. Existing role, collision, road/bridge routing and 22-unit bounds remain.
- Run the full Auto lighting cycle in four minutes, with morning/noon/dusk/night/dawn and repeatable level start offsets. Manual modes remain fixed.
- Add a full city/side-quest map, separate rooftop/river pins, collected state, route selection and on-radar markers. Cache static streets/water in one shared raster; pause chase, clock, rendering and audio while the map is open.
- Open one earned box atomically with a successful level settlement. Reveal all three drops immediately; equip stronger parts or sell/keep spares, with per-drop replay protection.
- Add five permanent fusion stars to each car part slot. Consume 5/10/15/20/25 same-part, same-rarity duplicates for +30/+50/+70/+90/+110% of its base part effect. Tuning survives rarity upgrades; maximum landing protection is capped at 90%.
- Preserve old profiles, parts, paint and records. Separate new timing rules as Tbilisi 1.16 / Kutaisi 1.1 and retain earlier course archives. Add shared-rule, API concurrency, both-map drift, browser, map/pause and full-driving validation.

## 1.15.0 — 2026-09-13

- Unlock a separate Kutaisi city after clearing Tbilisi level 3. Use one shared saved garage with independent city levels, progress/score/weekly boards and per-level times. Existing Tbilisi careers and records remain intact.
- Add a connected OSM-derived central Kutaisi street network, joined asphalt/sidewalks, the Rioni and bridge decks, Colchis Fountain, Bagrati, theatre, opera, royal quarter, palace, bazaar, synagogue, park wheel and cable cars. White Bridge includes an original bronze boy holding hats. Day/night, traffic, physics, police and mobile controls are shared.
- Add four street jumps and two Platinum challenges: the rooftop Skybox and Rioni gap. Each secret awards one three-part Platinum box once per profile. Fourteen fifth-grade assemblies have matching previews, inventory/equipment behavior and a modest improvement over Diamond. Ordinary reward odds remain unchanged.
- Load only the selected map's geometry, reload safely when switching cities, and batch individually breakable street lamps by spatial tile. Cache unchanged prop poses, preserve rewind and stop rendering/audio while idle. Runtime media files are unchanged.
- Fix the stunt yard's hillside clearance, keep fountain collisions finite, retain dry bridge lanes, and add automated map, bridge, reward, save and renderer regressions. New additive city-ranking migration preserves all existing data.

## 1.14.1 — 2026-09-12

- Add all-time unique player profiles, filtered ranking participants and personal rank denominators to the leaderboard. Finish results also show each rank out of its matching player count.
- Count a saved garage once when it first starts a chase, including private guests. Page visits and naming an unused profile do not count; restoring the same garage keeps the same identity.
- Backfill existing active/completed players with an additive indexed database migration. Preserve every garage, upgrade, balance, result and course record. No new polling loop or runtime media assets.

## 1.14.0 — 2026-09-12

- Show a prominent finish clock, automatic overall and per-level time ranks, saved rewards, Garage / Next Level actions, and Facebook/copy result links. Render immutable server-stored result pages with Open Graph metadata; private drivers stay private.
- Add distinct checkpoint and level-clear musical cues using two cached, finite PCM buffers. Preserve mute, pause, hidden-tab suspension and terminal audio drain.
- Shuffle roomy checkpoint positions/order by level, consistently for all players; vary Auto daylight starts in shuffled dusk/night/day bags. Preserve manual lighting. Add rare 24-second GPU showers with one small buffer and one draw call.
- Calibrate linked street props against the asphalt union, river support and building footprints; move poles/benches/signs together and keep trees/bridge rail openings clear of the roadway.
- Keep existing garages and records, add an archive course selector, accept already-open 1.13 clients, and separate 1.14 time comparisons. Add the immutable-result table through a new additive migration.
- Keep idle views on demand, abort result rank requests on hide/leave, and stop finite sound tails. No runtime texture/model/audio assets or quality settings were reduced.

## 1.13.0 — 2026-09-12

- Add shared per-level completion times, car/stock filters, equal-time ranks, rewind counts and a prominent menu Leaderboard button. Active wall time excludes pause/loading but includes rewind and slow frames; successful clears are timed to hundredths.
- Add server-captured course/loadout metadata and an indexed level-record table. Garage settlement and the record insert are atomic. Keep existing saves, identities, standings and old migrations intact; older clients still bank normal progress.
- Derive water support from rendered roads, sidewalks, bridge decks and bank caps. Keep overhanging cars supported until tire contacts leave the edge.
- Replace oversized vehicle-circle/building contacts with oriented chassis contacts. Refine clock wings/cornices, baths, elevated tubes and cable-station collision dimensions.
- Replace quadratic shortest-path scans with a deterministic heap and bounded typed-array cache; index water edges and reuse single-cell contact lists. Preserve runtime artwork and quality settings.

## 1.12.0 — 2026-09-12

- Expand the connected Tbilisi road graph to 598 nodes / 766 segments; join stunt aprons into continuous asphalt, keep widened roads clear of buildings and add a scenic landmark access road.
- Fix ramp high-end/side collisions, airborne wall damage, roof support and edge falls. Add a high-speed Skybox roof challenge and a bank-to-bank Mtkvari jump, each with a one-time upgrade box and credit reward.
- Add checkpoint/challenge navigation in the pursuit panel, a disabled YouTuber Car slot and coming-soon Kutaisi/Batumi map slots. Preserve all four playable cars.
- Add a compressed Bank of Georgia-inspired landmark, northern office towers and four original facade atlases with matching night window masks.
- Retain sedans/SUVs/tanks and add coupe interceptors from level 4 and V12 pursuit cars from level 7. Extend difficulty scaling with at most 22 active patrols.
- Add profile schema 4 without resetting old saves, anonymous keys, leaderboard records or equipment. Server settlements validate and award each challenge once; rewind restores unbanked challenge collection.
- Distinguish masonry/landing thuds, wood/splinter impacts and metal vehicle crashes. Reuse existing sound recordings with separate filtering and layers.
- Spatially index breakable contacts, reuse the prop index, merge static street/building meshes in cullable tiles and bound the checkpoint-layout cache. Keep source textures and quality settings intact.

## 1.11.0 — 2026-09-12

- Add anonymous named drivers with Georgian/English nicknames, six avatar colors, stable public tags and optional public visibility. Retain existing private garage keys and saves.
- Add a shared server-backed leaderboard: furthest level/checkpoints, best run score and weekly points; top-three medals, pagination, personal rank, refresh, empty/error states and a copy-game-link button. Read-only standings need no account.
- Scale positive score awards by 1 + 15% per extra level and run/clear credits by 1 + 10%. Show coefficients in the menu and driver profile.
- Add eight permanent achievements, a 500 CR first-clear UTC daily bonus, consecutive-clear streaks and an extra reward box every third win. Rewind restores all run achievement counters.
- Start server-issued run tickets, validate result bounds/timing, derive currency on the server, settle idempotently and update public standings atomically with the garage. Invalid/replaced tickets do not trap players in repeated save failures.
- Add the community dialog to input/audio/render/gyro suspension. Poll standings only while visible, abort on close/hide and retain independent mobile drift/nitro controls. Exclude recovery teleports from travel points.
- Add an additive database migration, server/physics regressions and an English community guide.

## 1.10.0 — 2026-09-12

- Refresh the interface with compact graphite panels, readable contrast, red primary actions and consistent rounded buttons. Keep entry controls opaque and the center route cue free of a background.
- Use a single row of inline SVG toolbar icons, accessible names and desktop shortcut hints. Keep Start and Garage reachable while car details scroll on short screens.
- Reposition score, pursuit, speed, circular radar, rewind and recovery controls for desktop, tablet, portrait phones and short landscape screens. Preserve independent touch steering, drift and one-tap nitro.
- Add sticky garage shortcuts for Your Build, Boxes and Upgrades; compact the preview, grade controls and part comparisons while retaining the actual car/part artwork and saved customization.
- Organize Driver Setup into Driving, Gyro Tuning and Display. Enabling gyro opens its tuning section; graphics, fullscreen and touch visibility remain available under Display.
- Keep keyboard focus inside the pause/result overlay and return it to Pause after resuming. Respect reduced motion, retain on-demand rendering and introduce no additional media or icon-font downloads.

## 1.9.0 — 2026-09-12

- Expand the archived OSM street network from 519 nodes / 671 segments to 551 / 704, including Dumas, Kikodze, Lermontovi, Iashvili and Sulkhan-Saba streets. Move two approximate embankment connections onto dry land and regenerate joined asphalt/sidewalks.
- Add 6,500 instanced grass clusters with shared geometry and spatial culling. Retain existing textures, vehicles, quality settings and lighting.
- Share hillside profiles between presentation and physics. Roads have clear shoulders; vehicles collide with mountains and landmark mounds instead of driving underneath them.
- Patrol shortcuts now require continuous land or an explicit bridge. All vehicles fall and sink after entering unsupported water, with splash/foam, spatial water audio and a road respawn. Sunk patrols do not award repeatable wreck cash; the player's recovery costs 20 HP.
- Divide bridge rails into local fracture panels. Direct normal impacts of at least 34 m/s (about 122 km/h) can break a section immediately; ordinary hits and glancing scrapes remain solid. Rewind restores panel damage and sinking state.
- Index static obstacle queries and nearest-road projections without changing their exact results. Reuse actor lists and cached barrier references; store only broken panels in rewind frames. Keep menu/hidden-tab/audio suspension.

## 1.8.0 — 2026-09-12

- Default mobile Auto accelerator and proportional thumb steering with a pull-down drift strip; manual pedals, arrow buttons and gyro remain selectable.
- One-tap mobile nitro burns to empty, works during drift, respects brake/reverse motion, and never restarts without another tap. Pause, rewind, recovery and leaving the run cancel it. Desktop Shift is unchanged.
- Larger action targets, a fuel/status button and improved phone HUD spacing. Keep desktop Start reachable above the footer on shorter windows.
- Bundle/minify production code, parallelize asset requests, defer the hidden cover and omit seven unused reference assets from deployment. Retain every shipped visual/audio asset byte, existing quality budgets and attribution downloads.
- Share exact-state navigation paths, remove pointer-query allocations and retain idle suspension. Add arcade regressions and production link/asset verification to CI.

## 1.7.1 — 2026-09-12

- Stop continuous city rendering and HUD work on the menu, pause and result screens. Finish the last crash burst, dispose its debris, then retain the last image. Input, resize, camera/lighting changes and dialog transitions request a fresh frame.
- Render the garage preview only when its car, angle, size or pointer input changes. Cancel pending frames on close, page hide and navigation; stop hidden reward/upgrade animations.
- Suspend the Web Audio graph when muted, paused, in menus or hidden. Resume for an audible chase, let terminal one-shots finish, and disconnect every node of interrupted collision sounds immediately. Muted starts no longer create or download audio.
- Stop invisible turbo streak animations and remove gyro listeners outside gameplay or motion setup. Release screen wake locks when inactive and restore sensor calibration on return.
- Add lifecycle regressions and measured idle CPU / repeated-run memory results in `docs/PERFORMANCE.md`. Driving physics, visual detail and garage saves are unchanged.

## 1.7.0 — 2026-09-12

- Add multi-touch gas, brake/reverse, steering, drift and turbo with independent pointer ownership; preserve keyboard input and hold-to-rewind after crashes.
- Add opt-in gyro steering with motion permission, screen-relative axes, calibration, a dead zone, smoothing, sensitivity, inversion and explicit button fallback on denied/missing/stale sensor data.
- Add driver setup, optional auto accelerator with brake priority, touch visibility preference, fullscreen/landscape request and supported screen wake lock. Rotation and app switching clear input and pause the chase.
- Reflow the HUD, menus, reward boxes and buttons for portrait, landscape, safe areas and smaller viewports. Widen portrait cameras to keep more road visible.
- Add Auto/Battery saver/High graphics, pixel budgets, lighter phone trees without the 12 MB near-tree download, and no dynamic shadow maps in the lighter mode. Physics and saves are unchanged.
- Add two-finger garage zoom, larger paint targets and online home-screen metadata.
- Add mobile regressions and an English setup/compatibility guide. Physical-phone sensor and performance validation remains separate from emulation.

## 1.6.0 — 2026-09-12

- Add a ten-minute automatic dusk/night/day cycle driven by simulation time, with a moon, subtle stars/clouds, warm occupied windows, streetlight halos and soft pools of light. Pause and rewind preserve the cycle.
- Add an Auto / Night / Day / Dusk control with a local display preference. Raise player headlight output after dark and retain daytime illumination for the garage studio.
- Reuse the existing HDR and facade assets. Limit street illumination to three shadowless local lights and two instanced effect batches of at most 64 lamps. Broken lamp bulbs, glows and illumination turn off on contact and return on rewind.
- Restyle the menu, car choices, garage, parts inspector, reward dialog, pause screen, touch controls and HUD with graphite surfaces, red TECHCRUSH accents and racing typography. Keep compact navigation and distinct part-grade colors.
- Replace the plain loading message with milestone-based preparation progress and a racing-strip gauge; warm shader programs before dismissing it. No artificial loading delay or added media downloads.
- Add narrow-screen header rows, readable single-column upgrade comparisons and a compact rewind control above the touch buttons. Respect reduced-motion preferences.

## 1.5.1 — 2026-09-12

- Reduce cockpit street chevrons from 3.7 m to at most 2 m wide, with separate hood, chase and aerial sizes and a projected-width limit for narrow screens.
- Fade nearby first-person guidance smoothly, keep a raised visible face, and animate brightness without bobbing or size pulsation. Update route samples every moving frame instead of stepping every 200 ms.
- Reduce the transparent direction/distance HUD, remove oversized cockpit overrides, stabilize number widths and adjust compact-screen placement.
- Add navigation regressions for frame updates, pause, finite rewind positions and projected sizes across all four camera modes.

## 1.5.0 — 2026-09-12

- Add an interactive studio with selected-car orbit/zoom, front/rear/wheel/interior views and explicitly labeled no-cost preview fits.
- Save free per-car preset/custom paint through the existing versioned, idempotent server API. Preserve all previous garage progress.
- Add 56 original 3D part-grade assemblies with distinct machining and material finishes, cached studio renders, detailed explanations, direct inspector purchase/install actions and animated exact before/after statistics.
- Fit tier-specific forged rims, tread/slick tires, stationary calipers and body-mounted wing assemblies to all four player models; keep stock Original 458 wheels and Vector wing.
- Refine cabins with a true body opening, footwell, headliner, upholstery/bolsters, model-specific instruments, trim and a Vector flat-bottom wheel. Preserve the original licensed cabin and shaft-centered steering.
- Use shared engine telemetry for cabin instruments; improve cockpit camera framing and raised, tilted, smaller street guidance without the nearest obstructing arrow.
- Suspend the world render behind the garage and stop the studio loop on close.

## 1.4.0 — 2026-09-12

- Add directional, bounded body deformation to all player cars, patrols and traffic: compressed panels, local creases, scuffs and projected glass cracks. Keep lamps/exhaust aligned and exclude rotating wheel/steering parts.
- Safely separate interleaved GLB position/normal attributes before deformation; preserve shared templates and restore exact rest vertices on repair/rewind. Prepare player damage geometry before driving.
- Keep charred wrecks solid until existing replacement timers expire; nearby traffic/patrol avoidance and recovery now account for wrecks. Prevent repeated wreck rewards.
- Add same-step material fragments and sparks; replace geometric fire blocks with soft fire/smoke sprites, brief light, bent metal fragments and gravity/bounce. Expand explosion duration to 3.8 seconds.
- Add one player destruction burst that finishes behind the game-over screen. Pause and rewind retain authoritative effect timing.
- Strengthen metal crumple and explosion sounds with layered transients, descending bass, filtered blast air and debris. Preserve the existing sound toggle.
- Add seven regression cases for deformation, original-asset isolation, repair/rewind, solid wrecks, single destruction events and deterministic effect cleanup.

## 1.3.0 — 2026-09-12

- Replace the single oscillator engine with four per-car hybrid voices: recorded engine texture, combustion harmonics, load-sensitive intake and smooth RPM/gear changes. Use the same gear telemetry in the HUD.
- Add immediate contact-driven wood, metal, stone, glass, landing and explosion effects, using eight compact CC0 audio assets with reproducible preparation and provenance.
- Add relative-speed stereo pass-by sounds for traffic and patrols; refine turbo spool/release, tire/road wind, drift, nearby sirens and air-support sound. Soften exterior audio in cockpit view.
- Run audio each rendering frame, deduplicate contact cues, bound effect voices, and clear transient sounds during pause, mute and rewind. Preserve the existing M/Sound control and browser gesture requirement.
- Add nine regression tests and validate the real mixer with Chromium audio rendering and a live driving check. No physics, economy or save format changes.

## 1.2.0 — 2026-09-12

- Circular, clipped radar with bearing-correct edge markers and an air-support marker. Remove the dark center navigation panel and measure road-route distance.
- Use illustrated TECHCRUSH cover art on the mission card and garage showcase.
- Redesign the garage with a 14-part photographic-style atlas, rarity borders and labels, category filters, stock comparisons, and separate paid/free upgrade previews. Preserve all existing saves and reward odds.
- Change six legal checkpoint positions and visiting order per level. Replace rectangular gates with thick translucent branded arches and two-sided wordmarks/logo badges.
- Add larger 145-HP police SUVs from level 2 and 220-HP tracked blockade tanks from level 3. Give them distinct mass, clearance, acceleration and steering; cap tanks to preserve a mixed pursuit fleet.
- Add level-2 air support with animated rotors, searchlight, height-aware building occlusion, shared sightings, last-seen searching, roof clearance and limited pursuit speed. Rewind restores its observations and position.
- Add regression coverage for twenty levels of clear routes, fleet progression, bounded tanks, air visibility/escape/rewind, circular radar and every upgrade preview.

## 1.1.1 — 2026-09-11

- Restore the detailed Original 458 as a fourth selectable car; preserve existing garages, credits and installed parts when migrating profiles.
- Rebuild the three newer body meshes with fitted headlights, glass, mirrors, fenders, spoilers and model-specific exhaust outlets.
- Rotate every steering wheel about its fixed local shaft; keep front-wheel pivots centered. Use per-model cockpit eye positions.
- Replace flat headlight road patches with soft spotlights.
- Share solid, unbreakable bridge rail segments between rendering and physics, preserving road-width junction openings.
- Remove decorative bridge human figures, retaining the Mother of Georgia landmark.
- Make benches, bins, planters and street signs breakable; give props and falling trees an immediate visible impact response with rewind restoration.
- Recover surviving rollovers automatically after 0.8 seconds, including upside-down states without an existing flip timer.
- Add regression coverage for the actual licensed GLB, centered steering, fitted lights/exhaust, profile migration, immediate prop contact and repeated bridge-rail impacts.

## 1.1.0 — 2026-09-11

- Clear full building footprints from roads, correct the clock-building wing collision and connect three driveable bridges; Peace Bridge is an explicitly fictional driving adaptation.
- Prevent high-speed wall tunneling; break street, bridge, flag and sign poles with rewind support.
- Three distinct original sports-car models, higher speeds and visible equipment changes.
- Career levels with faster, more responsive police, larger waves and coordinated flanking.
- Server-saved anonymous garages, 14 parts × four tiers, three-slot boxes with duplicate drops, currency, installation, upgrades and salvage.
- D1/SQLite persistence, generated migration, private-key backup/restore, versioned writes and idempotent retries.
- Add collision, economy, upgrade-physics and persistence tests. CI now builds the Worker; remove static-only Pages workflow.
- Expand English documentation for saves, API, deployment and development.

## 1.0.0 — 2026-09-11

First complete public GitHub source release. This packages the expanded game previously developed through multiple private Sites deployments; the Sites deployment version number is independent of this source release version.

### Game

- A connected central Tbilisi street network with Rustaveli, Baratashvili and its bridge, Europe Square, Rike Park, Peace Bridge and Abanotubani.
- Reference-inspired Georgian architecture, Kartlis Deda, mountain terrain, flags, street furniture, detailed trees and two-sided TECHCRUSH branding.
- Three selectable 458 sports-car trims, modeled cabin and four camera views, procedural patrol sedans and mixed modern/classic civilian traffic.
- Responsive steering, reverse, grip/drift, rechargeable turbo, exhaust flames, smoke, skid marks and synthesized audio.
- Solid vehicle contacts, breakable trees, police damage/explosions/replacements, shared sightings, interception and roadblocks.
- Six checkpoints, scoring, repairs, escape/capture rules and timed reinforcements growing to twelve units.
- Four stunt ramps, airborne roll/pitch, landing rewards, rollover damage and upright recovery.
- Hold-to-rewind controls restoring up to five seconds of world state, including score, HP, patrol identities and broken trees.
- Keyboard and touch controls, pause on focus loss, route arrows, local minimap and chase HUD.

### Project and validation

- Complete browser source, vendored libraries, runtime assets, preparation scripts, source data and dependency lockfile.
- English setup, architecture, development, testing, deployment, contribution and asset documentation.
- Automated tests on Windows and Ubuntu; manually triggered GitHub Pages publishing configuration.
- 44 automated checks and recorded successful six-checkpoint driving runs for all three trims. Detailed scope and limitations are in [VALIDATION.md](VALIDATION.md).

The environment is an arcade approximation, not a one-to-one satellite scan. Physical phone and Safari validation, multiplayer and a persistent leaderboard are outside this release.
