# Development guide

Run commands from the repository root after `npm ci`. Start the local server with `npm start`, make changes, refresh the browser and run `npm test` before opening a pull request. There is no bundling step or hidden application source outside `dist/`.

## Change vehicles and handling

Edit `CARS` in `dist/config.js`. Each trim defines its stable ID, label, color, speed, acceleration, handling and damage multiplier. Speeds are m/s: `50` gives 180 km/h before turbo. Lower `damageScale` means less damage. The legacy IDs `gt`, `rally` and `suv` currently all select sports-car configurations of the same 458 model.

Core throttle, braking, reverse, grip and drift integration lives in `stepVehicle` in `dist/simulation.js`. Keep steering consistent with `controls.js` and the tests: A/negative steer turns left when moving forward. Turbo is simulation state (charge, spool, recharge delay and lockout); flames/camera/audio should reflect it, not independently decide whether a boost is active.

Edit `dist/sports-car.js` for the sports-car body, paint and wheel setup, `dist/cockpit.js` for its cabin, and `dist/patrol-car.js` for procedural patrol and civilian cars. Match visual dimensions to contact dimensions in `dist/contacts.js`; otherwise cars may overlap visually or collide too early. Different physics trims do not imply different 3D base models.

## Change police and game balance

`dist/simulation.js` owns initial police, roles, wave timing/cap, sightings, route decisions, HP, destruction and replacement. Current waves add one unit every 35 seconds up to twelve, with extra checkpoint reinforcements. Pursuit tests cover separation, roadblocks, limited shared observations and replacement after destruction.

Preserve stable vehicle identities and include new mutable fields in rewind. For tuning changes, use both focused tests and full-route runs; a smarter roadblock or larger police force can make a run impossible even if individual steering tests pass. The controller has ideal route knowledge and uses recovery, so also assess human driving difficulty in the browser.

Checkpoint positions and street routes are in `dist/city-map.js`; collection rewards and final escape conditions are in `dist/simulation.js`. Keep gates on clear, connected roads. Update the [README rules](../README.md#rules) when changing visible game behavior or numbers.

## Extend the map

1. Inspect the archived OSM responses in `data/rustaveli-raw.json`, `data/tbilisi-roads-raw.json` and `data/links-raw.json`.
2. For a manually approximated connection, edit `data/reference-streets.json`, including its name, width, coordinates and provenance. Keep approximations explicit.
3. Adjust shared landmark anchors, reserved lots and river boundaries in `dist/district-data.js` as needed.
4. Regenerate the graph, then the joined surface:

```sh
python scripts/build-map.py
node scripts/build-road-surface.mjs
npm test
```

On Windows, `py -3 scripts/build-map.py` is an alternative if Python's launcher is installed. The Python script uses the standard library. The surface script uses `clipper-lib` installed by `npm ci`.

The outputs are `dist/road-data.js` and `dist/road-surface-data.js`; commit them with their inputs. Inspect crossings, bridge approaches, river banks, building clearance and all six checkpoint routes in the browser. Existing navigation/surface tests check connectivity, coverage and triangle direction, but cannot assess every facade or street visually. Do not modify only the visible street mesh: NPCs and guide arrows would still follow the old graph.

## Add landmarks, trees, signs and ramps

Expanded landmarks are built in `dist/tbilisi-districts.js`. General scenery and older Georgian landmarks live in `realistic-city.js`, `scenery.js`, `landmarks.js` and `kartlis-deda.js`. Shared anchors and solids belong in `district-data.js`, so rendered walls and collision footprints stay aligned. Small sidewalk furniture is currently decorative.

Tree placement and solid trunk parameters are shared through `world-props.js`; `trees.js` handles the model, detail switching, wind, break/fall animation and stumps. Test both a low-speed contact and a high-speed break when adjusting trunk positions or radii.

TECHCRUSH signs use the original images in `dist/assets/`. Two-sided signs use two separately oriented front faces so text is readable from either direction. A single double-sided plane mirrors text on its back. Inspect both sides after changing placements or UVs.

Ramps are defined by `RAMPS` in `dist/stunts.js`, used by both rendering and physics. Place an approach on clear asphalt, with enough run-up and landing room. Airborne position/rotation, landing damage and automatic upright recovery must remain part of the simulation state. Check jumps and rollover recovery with HP remaining and with HP depleted.

## Rebuild assets

| Command                               | Input and output                                                                         | Reproducibility                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run vendor`                      | Installed Three.js → selected modules under `dist/vendor/`                               | Version pinned in `package.json` and lockfile; preserve the license                  |
| `node scripts/prepare-car.mjs`        | `dist/assets/ferrari.glb` → `sports-car.glb`                                             | Original input is checked in; decodes, welds, simplifies and prunes                  |
| `node scripts/prepare-tree.mjs`       | Current Poly Haven manifest/source → `tree-near.glb`, `tree-far.glb` and source metadata | Uses the network and ignored `.sites-runtime/tree-source` cache; upstream may change |
| `python scripts/build-map.py`         | Archived road JSON/manual connections → `road-data.js`                                   | Local source data is included                                                        |
| `node scripts/build-road-surface.mjs` | Current graph/river → `road-surface-data.js`                                             | Regenerate after graph or river edits                                                |

The optimized tree assets included in a release are the stable way to reproduce that release visually. Its large downloaded tree cache is not included. Higgsfield images are already supplied as PNGs with generation references in [ASSETS.md](../ASSETS.md); generation is an external authoring step, not part of the local build.

Add attribution and applicable terms for new assets in `ASSETS.md` and `dist/credits.html`. User reference photos are not runtime textures and are excluded from the repository. Project code is MIT; that does not relicense branding, generated artwork or third-party models.

## Optional browser automation interface

`dist/main.js` feature-detects `document.modelContext.registerTool`. In a compatible host it registers:

| Tool               | Input                                                                         | Purpose                                                |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `get_chase_status` | `{}`                                                                          | Read run state, score, checkpoint progress and camera  |
| `select_chase_car` | `{ "car": "gt" }`                                                             | Select `gt`, `rally` or `suv` while in the garage      |
| `start_chase_run`  | `{}`                                                                          | Start/restart the run                                  |
| `drive_chase_car`  | `{ "throttle": 1, "steer": 0, "seconds": 2, "boost": false, "brake": false }` | Drive for 0.1–5 seconds; keyboard input takes priority |
| `set_chase_camera` | `{ "camera": "cockpit" }`                                                     | Select `chase`, `cockpit`, `hood` or `aerial`          |
| `set_chase_paused` | `{ "paused": true }`                                                          | Pause or resume a live run                             |
| `set_chase_rewind` | `{ "held": true }`                                                            | Hold rewind; call again with `false` to release        |

These are page-local controls, not HTTP endpoints or required game services. The authoritative schemas and phase checks are in `main.js`. Use normal input when validating mechanics rather than mutating checkpoint or HP values.

[Back to README](../README.md)
