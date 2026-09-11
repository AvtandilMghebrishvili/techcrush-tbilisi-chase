# TECHCRUSH — Tbilisi Chase

A complete browser 3D arcade chase through a simplified reconstruction of central Tbilisi. Choose a sports car, dodge traffic, clear six checkpoints, destroy pursuing patrols, then break contact for eight seconds.

The expanded daylight edition connects Rustaveli, Baratashvili, the Mtkvari banks, Europe Square, Rike Park and Abanotubani. It adds a driving deck for Baratashvili Bridge, a glass-wave Peace Bridge, Rike's twin steel tubes, lawns and paths, bath domes and the blue Chreli Abano facade, Metekhi, Narikala and moving cable cars. Streets have continuous asphalt, markings, crossings, tiled sidewalks, benches, bins, planted trees and 22 additional two-sided TECHCRUSH billboards. A detailed Ferrari 458 model and modeled cockpit, original Georgian patrol sedans, 1980s/1990s traffic, HDR sky and textured mountains remain.

This is a reference-guided arcade reconstruction, not a one-to-one scan. Central streets and Baratashvili Bridge use cached OpenStreetMap geometry. Missing southern/eastern connections and the river outline are manually approximated from landmark positions and the user's aerial photographs; their provenance is in `data/reference-streets.json` and `ASSETS.md`. Roads are widened and directions/closures adapted for play. The supplied reference photos and Google Street View image are not redistributed as textures.

## Run locally

Requires Node.js 20+ and a modern WebGL2 browser. Run `npm start` in this folder, then open `http://127.0.0.1:4173/`. No installation, API keys or build step are required to play: all game modules, models and textures are checked in. Google Fonts are optional, with local fallbacks.

For development run `npm ci`. Refresh Three.js with `npm run vendor`. Rebuild the optimized sports car with `node scripts/prepare-car.mjs`. Rebuild the road graph with `python scripts/build-map.py`, then its joined asphalt and sidewalks with `node scripts/build-road-surface.mjs`; source OSM responses are archived in `data/`. `node scripts/prepare-tree.mjs` downloads the CC0 source specified in `data/tree-source.json` and builds both detail levels. Large original tree files are cached locally; runnable optimized GLBs are included.

## Cars and controls

The three configurations share the same detailed 458 base model. These are fictional game trims, not manufacturer performance claims. Legacy internal IDs are retained for compatibility; all three are sports cars.

| Configuration       | Game top speed | Character                                   |
| ------------------- | -------------- | ------------------------------------------- |
| 458 Stradale (`gt`) | 180 km/h       | Red street car, fastest straights           |
| 458 Track (`rally`) | 169 km/h       | Yellow track car, spoiler, sharper handling |
| 458 Touring (`suv`) | 162 km/h       | Silver-blue GT, stronger body               |

| Key                    | Action                                               |
| ---------------------- | ---------------------------------------------------- |
| W / Up                 | Accelerate                                           |
| S / Down               | Brake, then reverse                                  |
| A / Left, D / Right    | Steer left / right                                   |
| Space + steering       | Start a drift; countersteer to regain grip           |
| Shift                  | Rechargeable turbo with exhaust flames               |
| C                      | Chase / modeled cockpit / hood / high chase          |
| P / Escape             | Pause / resume                                       |
| R                      | Recover to nearest street, costs 200 points          |
| Hold Q / rewind button | Slowly rewind up to 5 seconds; release to resume     |
| A / D while airborne   | Apply left / right roll; countersteer to reduce spin |
| W / S while airborne   | Adjust pitch down / up                               |
| M                      | Sound on / off                                       |

Physical keys also work with Georgian keyboard layouts. Steering reverses naturally when backing up. Touch controls appear on phones; landscape gives a wider driving view. The game pauses when its tab loses focus. Pause and choose CHANGE CAR to return to the garage.

## Rules

- Six gates award 1,000 points plus a time bonus up to 800, restore 30 condition and 25 nitro. Animated cyan arrows and the minimap follow the connected street graph.
- Driving awards 1.8 points per metre. Near misses above 72 km/h award 150.
- Three patrols begin pursuit. Every 35 seconds another pursuer, interceptor or roadblock unit joins, up to 12. Checkpoints two and four also call reinforcements. They share sightings, anticipate observed travel, route around buildings, slow for corners and nearby cars, and reverse when stuck. Roadblock units park sideways ahead. When every officer loses sight, the shared target stops updating. The HUD shows active units, heat and the next wave.
- Patrols have 100 HP. Rams deal 22–44 damage with a 0.9-second cooldown. Three to five hits trigger an explosion and award 750 points. A replacement enters after five seconds, at least 110 metres away.
- Police speed rises from 40 to 43.5 m/s. Patrols recover for 2.6 seconds after ramming the player. Police collision damage is capped at 8 condition before armor. Oriented vehicle bodies separate and exchange mass-weighted impulses, including police against each other and civilian traffic. NPC crashes can destroy patrols but do not award free player takedowns.
- Tree trunks are solid. A frontal impact of at least 12 m/s breaks a tree, absorbs speed and animates its fall; lesser impacts stop or deflect the car. Fallen trees fade after ten seconds, leaving a stump until restart.
- Tap Space while steering above 40 km/h to start a drift. Hold the turn and throttle to carry the slide, then straighten or countersteer to regain grip. Controlled slides award drift points, tire smoke and skid marks.
- Turbo spools smoothly, drains 25 charge per second, waits 0.85 seconds before recharging at 10 per second, and requires 22% refill after emptying. Release preserves momentum. Exhaust flames, animated edge streaks, camera FOV and synthesized audio respond to boost. Reduced-motion settings disable edge streaks.
- After six gates, lose every patrol for eight seconds: beyond 100 metres, or beyond 60 metres with buildings blocking sight. Escape awards 3,000 plus 20 per remaining condition percentage.
- Four seconds boxed in at low speed ends the run. Zero condition wrecks the car.
- Four marked ramps launch a car approaching their slope above 9 m/s. Steering rolls the airborne car; throttle/brake adjust pitch. Upright landings award 150 plus four points per metre flown. A rollover damages the car, then restores it upright on a nearby clear road after 1.8 seconds if HP remains. Automatic rollover/river recovery has no manual-recovery score charge. Falling into the river costs 20 HP.
- Q records the most recent five seconds at 30 snapshots per second and plays them backward at 0.8 speed. Release resumes the selected moment and discards its future. Position, velocity, air rotation, HP, nitro, score, checkpoints, patrol identities/HP/waves, traffic, explosions and broken trees are restored together. The button remains usable after a wreck or capture. At the oldest recorded moment it holds until release. Rewind grants no extra HP or score beyond the restored state. Losing focus releases rewind and pauses.
- The minimap follows a local 1.1 km square, with river, nearby streets, cyan route/gate and gold ramp markers. Off-screen gate markers remain at the edge.

## Source and validation

`dist/main.js`, `index.html`, `style.css`: UI, fixed 120 Hz loop, keyboard/touch input, HUD, audio, minimap and WebMCP. `simulation.js`, `config.js`, `controls.js`: physics, collisions, pursuit, traffic and rules. `city-map.js`, `road-data.js`: OSM-derived graph, shortest paths and shared rotated collision footprints. `view.js`, `sports-car.js`: renderer, sports models, wheels, cockpit and follow cameras. `realistic-city.js`: streets, facades, clock building, hills and trees. `scenery.js`, `landmarks.js`, `kartlis-deda.js`: Georgian landmarks and branding. `route-guide.js`, `effects.js`: navigation, HP and explosions.

`dist/assets/` and `dist/vendor/` contain the runtime assets. `scripts/` and `data/` contain reproducible preparation inputs. `server.mjs` is a dependency-free local server.

Run `npm test` for automated checks. Run `node tests/route-drive.mjs gt` for a full driving controller using ordinary steering, throttle, braking, nitro and R recovery with traffic and police active. Substitute `rally` or `suv`. The controller is a test utility, not an in-game autopilot. See `VALIDATION.md` for observed results and limitations.

Additional modules: `contacts.js` provides solid oriented contacts; `road-surface.js` and its generated data provide joined asphalt, sidewalks and curbs; `patrol-car.js` builds police and civilian variants; `camera-clearance.js` prevents wall occlusion; `trees.js` and `world-props.js` share solid tree placement and falling animation; `turbo-effects.js` supplies flames and pooled tire smoke.

`district-data.js` supplies shared landmark anchors, river and collision footprints; `tbilisi-districts.js` builds the expanded scenery; `stunts.js` shares ramp definitions between drawing and physics and handles airborne motion; `rewind.js` records, interpolates and branches the simulation timeline. New district meshes are merged by material and spatial tile. Static contacts reject distant lots before transforms, keeping the larger map's physics responsive.

Static boxes and 3D trees are instanced. Trees switch from 123,246 triangles nearby to 20,943 at distance and disappear beyond 420 metres. Fixed sedan parts are merged by material; detailed cars beyond 330 metres are hidden. Models are decoded ahead of time without runtime Draco workers. The directional shadow area follows the player.

## Hosting and rights

Serve `dist/` on a static HTTPS host. `.openai/hosting.json` identifies the existing Sites deployment, whose owner-private access remains unchanged. There are no multiplayer, purchases, game accounts, persistent leaderboard or game-server dependencies.

Project code and Three.js are MIT. OSM data is ODbL. The car, HDRI, terrain textures, generated artwork and supplied branding retain their respective terms. See `ASSETS.md` and the in-game Credits link. The source package includes runnable assets, code, tests, source data and the dependency lockfile.
