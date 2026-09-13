# Rendering and audio lifecycle

## City loading and resource ownership (2.5.1)

City switches bank progress and replace the current navigation entry, avoiding a history stack of old WebGL worlds. Selected-city media starts alongside profile I/O, before geometry construction. Media URLs contain a hash of the shipped asset pack: unchanged files can be reused between cities and code-only releases. Only one current pack ships. Legacy asset URLs resolve to that same pack so already-open games can finish lazy audio/image requests after an update. There is no Service Worker, CacheStorage copy, prefetch of other cities, or clearing of player storage. The browser controls normal HTTP cache eviction. HTML/profile/API responses retain their fresh-response policy.

A reproduced bottleneck was removal of thousands of sibling meshes during static batching: repeated child-array searches/splices were quadratic. Parent arrays now compact once, preserving child order, removal events, animated subtrees and exact merged vertex data. Successive local source-browser loads at **1280 x 720** measured:

| Selected city / stage | Before | After |
| --- | ---: | ---: |
| Kutaisi static city batching | 5,862.3 ms | 149.3 ms |
| Kutaisi ready milestone | 9,654.7 ms | 4,179.7 ms |
| Batumi ready milestone | 9,984.4 ms | 3,457.2 ms |

The ready milestone precedes the first normal world frame. These are bounded local observations, not an Internet-bandwidth benchmark or a universal loading guarantee.

Tree classification/pose/color work happens once per tree, then packed data is reused by bark/leaf batches. Exact comparisons cover near/far visibility, color, falling, shrink/despawn and rewind on desktop/mobile budgets. A Node workload of 1,100 trees, eight submesh batches and 500 forced updates measured a warm median **183.50 ms before / 25.30 ms after**, about **86% less CPU work in that isolated routine**. It is not an 86% whole-game FPS improvement. Invisible NPCs skip wheel/light/HP-canvas animation while physics continues. Explosion-light selection avoids a temporary sorted list. Restarts retain an unchanged selected model, reset its damage/boost state, and rebuild when equipment changes.

Page departure and initialization failure stop the frame loop, cancel shader-readiness polling, abort model/audio requests, discard late image/decode results, disconnect observers, close audio and explicitly dispose both renderers/contexts. Reflection render targets now have an owner. A BFCache return rebuilds from saved progress because the old GPU resources are deliberately gone. The cancellable shader adapter uses the pinned Three r180 program interface and needs review when upgrading Three.

Six local start/pause/garage/return cycles held world geometry/textures stable (4,075 / 96 in the initial viewport fixture and 3,647 / 86 in the fixed-viewport fixture); the garage stayed at 67 / 5. Menu probes observed zero additional world/garage frames over 1.2 seconds. An explicit teardown reported zero world geometries/textures, no pending frame, zero voices and both WebGL contexts lost. The garage's internal counter still listed four borrowed/cached textures after disposal while its context was confirmed lost; that counter does not establish live GPU storage. Heap samples were not collected after forced GC and are not evidence of zero retained heap. This is a short lifecycle check, not an exhaustive device/driver leak audit.

All **30 deployed media files (41,859,437 bytes)** remain byte-identical. Geometry/texture resolution, shadow and draw-distance budgets, physics and saved progression are preserved. Part artwork retains at most 32 recent thumbnail entries while the page is open. Physical-phone thermal/FPS testing and universal steady-FPS claims are outside these measurements.

> Current 2.0 rules: all three cities start open; classic cornering and adjustable driving feel; a 180-second night-first Auto cycle; four new earned cars; visual result cards. See [version 2.0 details](BATUMI.md). Earlier measurements and release descriptions below retain their original context.

## Bonus feedback 1.17.0

The feed retains at most 16 pending simulation events and three DOM rows, expiring on active simulation time. It introduces no independent RAF, timer, network call or media download. Finite opacity/transform animation pauses with the existing idle lifecycle. HUD checkpoint dots are rebuilt only when checkpoint count/progress changes, instead of every HUD update. The near-pass test reuses existing physics-step positions; it does not maintain a second motion history. Rendering quality and runtime media are unchanged. These are bounded-work improvements, not a measured universal FPS increase.

## Drift, Fusion and map UI (1.16)

The radar reuses one lazy 1536 × 1536 canvas atlas of the selected city’s roads and water instead of stroking every street on each HUD update. The full quest map uses the same atlas and repaints its 900 × 900 overlay only when opened. Together these buffers use about 12.1 MiB of raw RGBA storage; there is no new frame loop, WebGL context for the map, media download or change to 3D quality. Map changes still reload and release the previous world.

Opening the quest dialog suspends simulation, race clock, audio/gyro and continuous scene rendering. A local browser check observed identical simulation time and renderer frame count with no pending frame over 600 ms. Fusion stores at most fourteen small star counters per car; stats are computed for the installed build at run start. Reward animation is finite and stops on hide. The existing garage renderer supplies reward artwork. Patrol counts remain capped at 22 despite faster and more frequent pursuit.

## Result screen and weather 1.14.0

The result overlay makes two finite rank reads after saving, with an eight-second deadline and cancellation on hide/leave. It does not poll. The world remains on the existing single on-demand frame loop. The two musical cues use cached PCM buffers and disconnect after a maximum 1.25-second tail; the audio context then suspends. Lighting conditions are cached per level rather than allocating a shuffled bag each frame.

One-time placement calibration checked 1,860 prop groups and relocated 457 groups outside asphalt/building/water boundaries. All 993 planted tree stems and every sampled remaining bridge rail midpoint cleared the actual asphalt. Candidate checkpoint pools are also computed once.

Six start/drive/pause/garage cycles retained 5,472 world geometries / 85 textures and 67 garage geometries / 5 textures throughout; effects and audio voices returned to zero. Sampled retained JS heap ranged 71.18–72.10 MiB. Hidden and terminal scenes stopped producing frames. This is a bounded local test, not proof that every browser/device is leak-free.

Rain adds one draw call and 144 line segments, zero triangles and 4,608 bytes of fixed attribute storage. A 1280×720 local Chromium test alternated 30 warmed dry/wet renders with GPU completion: medians were 14.70 ms dry / 15.10 ms with the final shower effect. This isolated scene measurement is not a whole-game FPS benchmark. Showers last 24 seconds on a minority of levels; no separate animation loop or timer runs when inactive. All 21 shipped runtime media assets remain byte-identical.

## Timings and surface queries 1.13.0

For 100 distinct route queries on the same graph, the previous quadratic Dijkstra took 318.22 ms and the heap implementation took 15.86 ms locally. All 100 returned point sequences matched exactly, including deterministic tie ordering. This measures route computation, not total game FPS. The source cache now holds at most 96 trees in typed arrays. Single-cell obstacle queries reuse immutable ordered lists; water support checks use Z-banded polygon edges instead of full street scans.

The 1,200-step simulation workload's warm median was 327.20 ms in this run, within the range of the previous release's 336.62 ms. No overall FPS gain is claimed. Six browser lifecycle cycles retained 5,611 world geometries / 86 textures, 67 garage geometries / 5 textures, zero remaining effects/voices and 72.05–72.84 MiB sampled JS heap. This bounded local observation does not prove the absence of every leak on every device. The race clock owns no timer or animation loop; leaderboard polling still stops on close/hide. Existing media bytes and render-quality budgets remain unchanged.

## World queries 1.9.0

A static 48-metre cell index prunes contact and sightline footprints; query results retain source order for deterministic iterative resolution. The nearest-road bounding hierarchy returns the exact original projection, including road-ID tie breaks. Regression tests compare both indices against complete scans. Broken barriers are skipped by physics, sightlines and camera clipping without rebuilding immutable footprint bounds.

Grass uses 6,500 shared-geometry instanced clusters in spatial tiles and no per-frame JavaScript or new downloaded textures. Bridge panels share two instanced batches; unchanged panel transforms are not uploaded again. Rewind stores only fractured panel state. The earlier on-demand rendering and suspended audio lifecycle remains in place.

Reproduce the simulation workload with `node scripts/benchmark-simulation.mjs`: four 1,200-step runs, discard the warm-up run and take the median of three. On this Windows/Node 24 machine, before-update warm samples were 1,657.5 / 1,956.8 / 1,994.3 ms; final samples were 752.6 / 627.7 / 861.1 ms. Median time fell from 1,956.8 to 752.6 ms (about 62%). The expanded map and new terrain/water checks are included. These are local workload timings, not FPS, total CPU, statistical hardware benchmarks or a physical-phone thermal test.

No texture resolution, vehicle detail, shadow setting, render resolution or existing visibility budget was reduced. The larger map necessarily adds geometry. Six completed browser run/garage cycles held geometry and texture counts stable, with no remaining effects or audio voices after returning to the menu. Pause, hidden tabs, terminal effects and garage inactivity still stop their frame loops.

## Mobile loading 1.8.0

Production JS/CSS is bundled and minified with content-hashed filenames and safe long-lived code caching. Independent city/car/tree assets load concurrently; the hidden phone cover loads only when needed. Seven unused early reference assets remain in Git but remove **12,719,902 bytes** from deployment. This exclusion is a packaging improvement, not a claim that unrequested files previously slowed browsing. The playable original remains `sports-car.glb`.

All **21 shipped assets (41,110,441 bytes)** are byte-identical to source. No geometry decimation, lower texture resolution, reduced visibility or changed quality budget is introduced. Derived road database downloads and attribution remain included. `npm run check:build` verifies production links and asset equality; CI runs it after building.

Local cold-load comparison in headless Chrome 153 on Windows, mobile emulation 844×390 / DPR 3, simulated 40 ms latency and 4 MiB/s download:

| Measurement                               |      1.7.1 |        1.8 |
| ----------------------------------------- | ---------: | ---------: |
| Resource requests before ready + 300 ms   |         83 |         18 |
| JS requests                               |         59 |          1 |
| JS encoded bytes                          |  2,789,414 |  1,049,339 |
| Total encoded resource bytes              | 29,738,274 | 25,224,593 |
| Observed load, including warm-up + 300 ms |  10,229 ms |   8,657 ms |

This sample is approximately 15% faster to the observed ready state and 62% smaller in JS. It is a single before/after trace, not a statistical or physical-phone FPS/thermal benchmark. Later small layout/copy edits can slightly change bundle bytes. The visual assets are unchanged.

During play, arrows, HUD distance and minimap share a route cached for the exact player/checkpoint state. Any position change, even 0.001 units or rewind, invalidates it. Pointer lookup no longer allocates arrays on every input query. The idle suspension below remains intact.

## Idle lifecycle 1.7.1

Version 1.7.1 fixes unnecessary CPU use after playing. The principal reproduced issue was **continuing work while idle**, rather than demonstrated unbounded heap growth.

## Changes

- The city owns one coalesced frame request while driving or rewinding. Menus and pause screens render on demand; the result screen stops after the last explosion/impact has expired. HUD/minimap updates stop with it.
- Car selection, camera/lighting changes, resize and dialog transitions invalidate the retained image. A resumed loop starts with a fresh clock, keeping the existing 120 Hz simulation and capped frame delta.
- The garage's second WebGL renderer redraws on model/equipment changes, orbit, pinch, wheel zoom, inspection angle and resize. It does no continuous work while still or closed.
- Audio is lazy-created when enabled. Muting, pausing, returning to a menu or hiding the page suspends the AudioContext, rather than only setting gains to zero. Final collision/explosion sounds may finish before suspension. Interrupted sources, filters, gains and panners disconnect immediately.
- Turbo SVG strokes animate only during visible, active boost. Gyro listeners are attached only during gameplay or motion setup; they detach in other menus, pause and background. Returning re-centers from a fresh reading. Screen wake locks release when inactive.
- Navigation/page-hide cancels pending frames. Returning to a cached page redraws without automatically resuming a chase. Hidden/closed reward animations finish their already-saved result and stop their timer; upgrade counters stop while hidden.

The shared city, car templates, decoded sounds and bounded part-art cache remain allocated for reuse while the page is open. Retaining these resources avoids re-downloading/recompiling on every restart; it is not continuous CPU work. Closing the tab lets the browser release the page. Other tabs, browser extensions and browser GPU-process activity are outside the game's lifecycle.

## Measured before and after

Local headless Chrome 153.0.8010.36 on Windows, desktop viewport 960 × 540, default desktop graphics, same machine and isolated in-memory save database. Each sample waits for settling, then measures about three seconds using Chrome DevTools Protocol `Performance.getMetrics` (`TaskDuration`) and instrumented renderer-call counters. The game-over sample waits for destruction effects to finish.

| State                       | Before: world / garage frames in ~3s | After: world / garage frames | Before: main-thread task time | After: main-thread task time |
| --------------------------- | -----------------------------------: | ---------------------------: | ----------------------------: | ---------------------------: |
| Start menu                  |                              181 / 0 |                        0 / 0 |                      1,963 ms |                         1 ms |
| Paused chase                |                              181 / 0 |                        0 / 0 |                      2,980 ms |                         1 ms |
| Stationary garage           |                              0 / 181 |                        0 / 0 |                        175 ms |                         1 ms |
| Garage closed, back to menu |                              181 / 0 |                        0 / 0 |                      2,083 ms |                        <1 ms |
| Settled wreck/result screen |                              179 / 0 |                        0 / 0 |                      3,029 ms |                         1 ms |

The initialized AudioContext was `running` in all four previously played idle states before the fix, and `suspended` in each afterward. This is over 99% less **measured idle main-thread task time** in this controlled run, not an overall computer CPU percentage or an in-game FPS claim. Timing varies by hardware, browser, graphics driver and measurement overhead.

Six additional start → pause → garage → close cycles, after warming resources and collecting garbage at each sample, retained exactly 4,206 world geometries / 84 textures and 67 garage geometries / 5 textures throughout. Live transient effect and one-shot voice counts returned to zero every time. Retained JavaScript heap stayed between 59.33 and 59.67 MiB. No accumulating geometry/texture leak appeared in this bounded test; a longer soak on physical devices may reveal other issues.

## Validation and reproduction

`npm test` includes lifecycle scheduling and audio graph tests, alongside driving, collision, pursuit, rewind, upgrade and mobile-input regressions. Browser checks verify acceleration, pause/resume, mute/unmute, visibility suspension, finite crash effects, Q rewind from the stopped result screen, garage angle/orbit changes and repeated reuse. Existing multi-touch, gyro permission/fallback, pinch zoom and phone-layout checks also pass. A separate mobile lifecycle check verifies repeated gyro enable, listener detachment in menus/pause, fresh neutral calibration on resume, restored steering and no AudioContext creation on muted starts.

To inspect in Chrome DevTools:

1. Open the game directly, start a chase, enable sound and drive briefly.
2. Pause and record a Performance trace for several seconds. After the final UI frame, there should be no recurring game rendering/HUD work. Resume and verify immediate driving/audio response.
3. Repeat for an untouched garage, the closed-garage menu and a settled game-over screen. Trigger an interaction to verify that demand rendering wakes.
4. Switch tabs during gameplay. Return: the game should remain paused, with no held throttle/boost. On mobile, resume and establish a fresh neutral gyro position.
5. Repeat several garage/run cycles. Compare heap snapshots after garbage collection and WebGL object counts at the same warmed scene/camera state; do not mistake the first-time asset/shader cache for a leak.

Test instrumentation and synthetic visibility/orientation fixtures are local only. They do not alter production saves or ship public debug controls. Physical iPhone/Android sensor, battery and thermal tests remain separate from Chromium emulation.

## v1.12 expedition update

Breakable trees and street props now use the existing 48 m spatial index. Their stationary coordinates are indexed once per collection; mutable break states and source-order contacts remain exact. The simulation reuses the combined prop collection until its source arrays change. Static building trim and lane markings are merged by material in 160 m tiles, preserving full geometry, materials, shadows and culling. The per-level checkpoint-layout cache retains at most 32 layouts rather than growing with endless level numbers. Patrol capacity remains bounded at 22.

Using `node scripts/benchmark-simulation.mjs` on this Windows host, the warm median for 1,200 stationary level-3 simulation steps changed from **714.23 ms before** to **336.62 ms after** (about 53% less simulation time), including the expanded map. This is a controlled CPU workload, not a whole-game FPS or phone battery claim. The four final samples were 534.36 / 376.60 / 336.62 / 319.81 ms; the first is discarded as warm-up.

Six additional warmed start/pause/garage/close cycles held world geometry/textures constant at 5,599 / 86 and the garage at 67 / 5. Effects and sample voices returned to zero each cycle. Retained heap ranged from 71.74 to 72.56 MiB; bounded road/shader caches can warm further, so this short run is not an assertion that every possible leak is excluded. Idle frame/audio suspension, hidden-tab pause and rewind from a settled wreck passed.

All 21 deployed media assets remain byte-identical (41,110,441 bytes). Four new facade atlases and a concrete grain map are generated once, without additional image downloads. The final bundled browser code is 1,124,714 bytes and CSS 98,054 bytes; reference-only assets remain excluded from deployment. The visual additions have a small memory/code cost; the physics optimization does not reduce graphics settings or asset quality.

## v1.15 Kutaisi map

The two cities share cars, texture/audio files and gameplay modules. Map data is imported per city; switching banks progress and reloads the document, releasing the previous world's WebGL and route caches. The published build splits city geometry into lazy chunks. All 21 runtime media assets remain byte-identical (41,110,441 bytes). The source-only map reference photos are not deployed.

Kutaisi static architecture is merged by material and spatial tile. Repeated street lamps are instanced in 180 m tiles while retaining individual contact definitions. Falling lamps update their instance transforms; intact/stable prop poses do not repeat transform work every frame. Rewind restores exact matrices, and broken lamps stop emitting light. Existing tree detail levels, dynamic shadows, mobile graphics settings and the maximum patrol cap are preserved.

In the local Chromium 1440×900 gameplay fixture, a driving frame reported 1,551 render calls, 3,806,285 triangles and 1,649 uploaded geometries / 47 textures, with 524 spatial lamp batches. These are one view/configuration's renderer counters, not universal budgets or an FPS claim. After pausing, frame 156 remained unchanged for the 800 ms observation and no game frame callback was pending. Source city switching and workshop interactions produced no page/HTTP errors. Phone screenshots were Chromium touch emulation, not a physical-device thermal or sensor test.
