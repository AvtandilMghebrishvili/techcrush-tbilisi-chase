# Architecture

The game is native JavaScript ES modules, HTML and CSS, rendered with Three.js 0.180.0. Simulation modules run without a DOM, which allows physics and pursuit tests to execute directly in Node. `dist/` is authored source, not disposable build output.

## Runtime flow

```mermaid
flowchart LR
  Input[Keyboard, touch or optional WebMCP] --> Main[main.js / controls.js]
  Main -->|fixed 120 Hz updates| Sim[ChaseSimulation]
  Map[Shared road graph, solids, trees and ramps] --> Sim
  Sim <-->|record and restore| Rewind[RewindTimeline]
  Sim -->|world state| View[SceneView / Three.js]
  Map --> View
  Sim -->|snapshot and events| HUD[HUD, minimap, audio and messages]
  Main --> HUD
  View --> Canvas[WebGL canvas]
```

`main.js` accumulates active animation-frame time and calls `sim.update(1 / 120, input)` at a fixed rate. `frame-loop.js` coalesces invalidations, cancels callbacks while hidden, and resets its clock after idle so resuming cannot integrate background wall time. Incoming frame time is capped at 0.05 seconds. Rendering and audio update once per active frame; HUD text updates are throttled to roughly 0.08 seconds, with immediate phase changes. Menus, pause and settled result screens retain a static image and own no continuous frame callback. A final explosion drains before idling. UI changes request a frame; the garage preview independently renders on demand. The simulation owns positions, velocities, damage, scoring and pursuit decisions. The renderer reads that state and maintains transient visual effects. See [performance lifecycle](PERFORMANCE.md).

## Module guide

`mobile-input.js` owns pointer/gyro composition, proportional thumb steering and a one-tap nitro latch. The latch is presentation input, not saved state: pause, rewind and leaving a run clear it. `stepVehicle` receives `boostLatched` only for mobile bursts, burns fuel continuously and allows boosted handbrake turns; reverse/braking still governs acceleration. Desktop held Shift retains its previous rules.

`navigation-cache.js` shares the exact current player/checkpoint route across arrows, distance and minimap. Production bundles the authored ES modules using the checked-in Three sources; the build does not change geometry or texture data.

All paths below are relative to `dist/`.

| Module                                                    | Responsibility                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `main.js`, `index.html`, `style.css`                      | Garage, controls, loop, pause/end screens, HUD, minimap, audio coordination and optional browser tools         |
| `controls.js`, `config.js`                                | Physical keyboard normalization, input values, car trims and camera identifiers                               |
| `simulation.js`                                           | Player integration, traffic, police AI, damage, reinforcement waves, checkpoints, recovery and end conditions |
| `contacts.js`                                             | Oriented vehicle contact detection, separation and mass-weighted impulses                                     |
| `city-map.js`                                             | Road graph, nearest-road projection, routing, checkpoints and building collision footprints                   |
| `road-data.js`                                            | Generated nodes/edges from archived OSM and manual connections                                                |
| `road-surface.js`, `road-surface-data.js`                 | Continuous asphalt, sidewalk and curb geometry                                                                |
| `district-data.js`                                        | Landmark anchors, reserved sites, river and district collision data                                           |
| `world-props.js`, `trees.js`                              | Shared tree placement and solid trunks; model loading, detail levels, wind and falling trees                  |
| `stunts.js`                                               | Shared ramp placement, launch, airborne rotation, landing and rollover state                                  |
| `rewind.js`                                               | Five-second snapshot buffer, reverse interpolation and branching history                                      |
| `view.js`, `camera-clearance.js`                          | Scene, lighting, model synchronization, follow/cockpit/hood/aerial cameras and wall clearance                 |
| `sports-car.js`, `cockpit.js`, `patrol-car.js`            | Sports-car asset setup, cabin, procedural patrol and civilian variants                                        |
| `realistic-city.js`, `scenery.js`                         | Street appearance, buildings, mountains and environment                                                       |
| `landmarks.js`, `kartlis-deda.js`, `tbilisi-districts.js` | Georgian flags, monuments, expanded districts and TECHCRUSH signs                                             |
| `route-guide.js`, `effects.js`, `turbo-effects.js`        | Route arrows, health/explosions, boost flames, tire smoke and skid effects                                    |

## Coordinates and input

`mobile-input.js` owns pure screen-relative tilt math, calibration/filtering, pointer ownership, keyboard/touch/gyro composition, portrait camera framing and render budgets. `mobile-ui.js` connects these to explicit sensor permission, driver setup, safe fallback, fullscreen and wake lock. The adapter feeds the existing fixed-step simulation contract; touch/gyro do not implement separate driving physics. See [mobile setup](MOBILE.md).

Distances use approximate metres, time uses seconds and speeds use metres per second. The HUD multiplies speed by 3.6 for km/h. The local map projection is:

```js
x = -(longitude - 44.799) * 83140;
z = (latitude - 41.699) * 111320;
```

Y points upward. North is positive Z and east is negative X. Route headings use `Math.atan2(dx, dz)`. Because of this coordinate convention, do not infer control signs from a conventional east-positive map: normalized steering **-1 means left and +1 means right** from the player's view. Physical `KeyboardEvent.code` handling preserves WASD on Georgian keyboard layouts. Reverse movement changes the turning response naturally.

The simulation input is `{ throttle, steer, brake, boost, rewind }`: throttle/steer range from -1 to 1, and the remaining values are booleans. `brake` is the handbrake; negative throttle provides normal braking/reverse. Recovery is a separate `sim.recover()` action.

## World and navigation

The current road graph has 519 nodes and 671 segments in one connected component. The same graph drives NPC routes, checkpoint guidance, minimap lines and recovery positions. The generated road surface joins widened streets into one asphalt polygon containing 46 block islands. Map changes must regenerate both graph and surface.

District data is shared by collision and drawing code. Buildings use rotated rectangular footprints. Car contacts use oriented boxes and multiple separation passes, including NPC-to-NPC collisions. Tree models share their trunk locations with the simulation; poles, benches, bins, planters and signs share breakable collision bodies. Ramps share one definition between drawing and flight physics. Bridges use the road datum rather than a multi-level road system.

Police combine graph navigation with local steering. Pursuers follow observations, interceptors target an estimated future position, and blockade units stage across a road ahead. Officers share visible sightings rather than continuously reading an unseen player's current position. Stuck detection, reverse recovery, corner braking and local vehicle avoidance work alongside contact physics. Reinforcement and replacement timers are separate so destroying a car and surviving another wave have distinct effects.

## Run state and rewind

Phases are `ready`, `running`, `paused`, `rewinding`, `won`, `wrecked` and `busted`. Starting a run resets the world. Losing focus releases held input and pauses. A completed escape ends the run; wrecked or captured runs can still rewind if history remains.

`RewindTimeline` records at 30 Hz and retains up to five seconds. Snapshots contain player, police, traffic, radio observations, explosions, broken-tree state, and scalar score/checkpoint/chase timers. Reverse playback restores a full frame, then interpolates visible motion. It does not interpolate between different patrol identities across respawn. Releasing selects the earlier authoritative frame and discards its former future.

Camera smoothing and short-lived smoke/skid rendering are presentation state, not part of an exact historical camera recording. Transient trails reset when rewinding. New mutable gameplay fields must be included in the rewind snapshot, or time reversal could leave damage, rewards or timers in the future.

## Rendering and performance

The renderer uses a local HDR sky/environment, textured terrain, moving sun-shadow coverage, instanced static objects, and geometry merged by material and spatial tile. Trees switch between 123,246-triangle and 20,943-triangle models and are hidden beyond 420 metres. Distant detailed cars are culled. GLB models are prepared without runtime Draco decoding workers. Physics rejects distant lots before more expensive contact/visibility calculations.

This is an arcade reconstruction informed by references, with approximated roads/buildings and original landmark geometry. It is not photogrammetry or a one-to-one survey. See [asset provenance](../ASSETS.md) and [measured validation](../VALIDATION.md).

## Storage and external services

Active run state lives in memory. Career profiles persist through `profile-client.js` → `server/api.mjs` → D1 (`DB`), with a local SQLite adapter for development. `garage-ui.js` and `garage.css` provide inventory, purchases and reward animations. `progression.js` supplies shared rules. See [Career and API](CAREER.md) for identity, recovery, concurrency and limitations.

`server/worker.mjs` handles `/api/*` and delegates other requests to `ASSETS`. `scripts/build-server.mjs` bundles the Worker and copies browser modules into `dist/client`. `db/schema.ts` and `drizzle/` define the database. Generated subdirectories are ignored; authored files in `dist/` remain tracked.

`car-models.js` supplies three procedural bodies with surface-fitted details and equipment visuals. `sports-car.js` loads the independently selectable Original 458 and environment lighting. `vehicle-details.js` binds each steering rotor's rest quaternion and local shaft axis (local Y for the 458 asset; local Z for procedural cabins), and creates soft spotlights. Exhaust anchor positions belong to each model, so animated flames stay at the outlets.

`map-clearance.js` uses full oriented-footprint overlap tests to relocate landmarks and reject lots across roads. The clock-building wing shares corrected render/collision coordinates. `bridge-data.js` shares high-impact fracture panels with rendering and physics and leaves road-width junction openings. `breakable-props.js` links visible lamps, flags, signs, benches, bins and planters to simulation/rewind state; linked contacts let one bench use several trunk-style colliders. A broken prop receives an immediate visible rotation in the contact frame. High-speed player movement resolves obstacles in substeps no longer than 0.8 metres.

Profile schema 2 adds the `classic` equipment slot. Server reads migrate older profile JSON without resetting credits, level, inventory, selected car or equipment. The next successful write persists the migrated JSON; no SQL table migration is needed.

There is no multiplayer or persistent leaderboard. Runtime assets are local to the deployment; optional Google Fonts have fallbacks. Asset preparation may contact providers but gameplay needs no provider API key. Optional WebMCP controls expose ordinary input actions only when supported by the browser.

[Back to README](../README.md)

## Level routes and mixed pursuit (1.2)

`level-routes.js` deterministically chooses six road-center gates from clear segments near the established districts. Position and order depend on level; the original route remains level 1. Each run owns `sim.checkpoints`, used by scoring, recovery, the road guide, center distance and radar. `hud-math.js` sums route legs and clamps distant radar markers radially. `checkpoint-arch.js` fits each branded arch to its road width.

`air-support.js` owns the helicopter state. A segment/box intersection checks line of sight in three dimensions against rotated building footprints, including thin walls. Roof clearance controls altitude. Ground radio and aircraft sightings use the same last-seen observation contract; neither keeps reading a player after contact is lost. The rewind frame includes helicopter position, rotor phase, observation and tracking state.

`makePolice` assigns sedan/SUV/tank stats. Active tank counts are bounded and reset correctly on restart. `pursuit-vehicles.js` renders the mixed fleet and aircraft; `view.js` replaces meshes when a respawn changes vehicle kind. Larger units use larger static clearance and mass-aware dynamic contacts.

`garage-presentation.js` calculates displayed benefits through the same `upgradedSpec` used by driving physics. Paid next-tier and free-spare previews are distinct. A single part atlas feeds all cards and reward slots. `garage-refresh.css` and `ui-refresh.css` provide responsive presentation without changing server storage or reward probabilities.

## Audio pipeline

`audio-model.js` computes presentation RPM, hysteretic automatic gears, engine load, listener-relative stereo and relative-speed pass detection. It never changes vehicle physics. `chase-audio.js` combines a looped engine recording with per-car harmonic waves, filtered intake/road/wind noise and bounded one-shot voices. The HUD reads its gear label. Cockpit filtering affects continuous exterior sound.

Physics emits material-tagged `soundEvents` immediately after contacts at 120 Hz. Each cue includes world position, impact, breakage and simulation time; source cooldowns suppress solver duplicates. The renderer-frame audio update drains these independently of the 80 ms HUD update. Sounds beyond 125 metres are rejected before queuing, the queue is capped at 48 and the mixer at 28 one-shot voices. Stereo, distance attenuation, attack/release envelopes and a compressor control the mix.

AudioContext and eight small WAV assets are initialized only after the user enables sound. Missing recordings fail softly while procedural engine/air layers continue. Pause, rewind and mute consume queued effects, clear pass history as appropriate, and disconnect active one-shot graphs. `syncContext` suspends DSP when muted, hidden, in a menu or paused, and resumes for audible gameplay. Terminal one-shots suspend the context after their final `onended` callback. A single context and decoded buffers are retained for reuse; mute does not merely turn down oscillators that continue consuming CPU. Sound queues/cooldowns are transient and explicitly cleared on rewind restoration; they are not save data. The checked-in CC0 inputs, processing script and per-file hashes are described in ASSETS.md and data/audio-sources.json.

## Damage and crash effects

`damage-state.js` tracks five bounded visual damage zones independently of HP and handling. Oriented contact normals select the struck zone, with a 160 ms per-zone cooldown. Checkpoint healing scales body damage by the remaining HP deficit. The entire damage object is already included in vehicle snapshots; `impacts` and `nextImpactId` are additionally captured for rewind.

`vehicle-damage.js` caches rest vertices and each static part’s transform into car space. It converts interleaved GLB attributes into independent packed position/normal buffers before editing them. Damage always evaluates a shared deformation field from rest positions, including fitted surfaces, lamp positions and exhaust anchors; rotating wheels, steering, glows and shadow planes are excluded. Geometry/normals update only when the quantized damage signature changes. Player preparation occurs during selection. Surface-projected crack/scuff lines and material darkening are also reversible. Collision dimensions remain conservative, undeformed arcade bodies.

Destroyed NPCs retain their charred meshes and act as fixed-mass obstacles until their existing replacement timers expire. Avoidance and player recovery consider them. `crash-effects.js` uses a shared soft cloud texture, seeded sprite/debris placement, analytical gravity/bounce and absolute effect age for reversible playback. Contact bursts are capped at 24 recent events and last 0.75 seconds; explosions last 3.8 seconds. The render effect clock only advances beyond frozen simulation time on terminal screens so the final blast completes, while pause and rewind remain tied to simulation time. No explosion adds area damage or extra rewards.

## Garage studio (1.5.0)

`customization.js` shares physical wheel/wing assemblies between car factories and `workshop-parts.js`. `garage-preview.js` owns one lazy WebGL context, a cached image per part/tier, and a studio lifecycle bound to the workshop dialog. Both studio and chase instantiate the same factories with saved equipment and validated paint. The studio shares HDR pixel data, never renderer-owned PMREM targets. `garage-presentation.js` calculates exact upgrade comparisons from `upgradedSpec`; the preview equipment is a copy and cannot mutate a profile. `GarageUI` submits only explicit purchase/install/paint actions through ProfileClient. Paint is an optional per-car field, validated by the shared server action reducer, with no SQL schema change. `interior-detail.js` uses `engineTelemetry` for instruments and authors cabin trim; simulation/collider shapes remain unchanged.

## Terrain, water and spatial queries

`terrain.js` is the shared analytic height source for mountains and road-cleared landmark mounds. `resolveTerrain` samples swept movement, resolves a slope normal and transfers impact; terrain collision is applied to player, traffic and patrols after body contacts. `water.js` uses the same `RIVER_POLYGON` as the rendered river and admits only named bridge corridors as water crossings. Police direct/flanking shortcuts must pass a sampled continuous traversal test.

Water entry disables ground contacts, propulsion and capture participation. `waterAt`, `waterAge`, `y`, `pitch` and `roll` drive descent. At the actual water surface the simulation emits a single splash and sound; the renderer shows bounded droplets/foam and disposes them. After three seconds the actor returns to an unoccupied road, with a new NPC identity. Rewind clones the water state, matches actor identities before interpolating, and restores sparse broken barrier records. `bridge-visuals.js` reflects each contact immediately in two instanced batches.

`spatial-index.js` caches immutable footprint bounds by obstacle-array identity/length in a weak map. Use a new array if replacing or moving a footprint; changing `broken` does not alter its bounds. Nearby queries preserve source ordering. `city-map.js` uses a static bounding hierarchy for exact nearest-road projection; regression tests compare results against linear scans. `grass.js` creates capped, static instanced geometry and does not add a frame loop.
