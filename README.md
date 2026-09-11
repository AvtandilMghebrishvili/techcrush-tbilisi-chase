# TECHCRUSH NIGHTSHIFT — Tbilisi Chase

A complete browser 3D arcade car chase made with Three.js. Choose a car, race through a Georgian-themed city, avoid civilian traffic, hit six checkpoints in order, then break contact with the police for eight seconds.

The expanded city has an 8×8 block grid, mostly low-rise buildings with Higgsfield-generated Old Tbilisi facades, Georgian flags, and a stylized tower inspired by Mtatsminda. Its playable area is about 67% larger than the original. The layout and landmark are fictional interpretations.

TECHCRUSH garage signs now appear along the first avenue, with faceted mountain ranges and a stylized Kartlis Deda monument on the distant ridge. Animated cyan arrows follow the streets and turns to the next checkpoint and disappear once the escape phase begins.

The header, favicon, and garage signs use the user-supplied TECHCRUSH portrait logo and original lettering. The supplied files are included unchanged in `dist/assets`; the lettering's surrounding screenshot interface is excluded at display time.

## Cars and cameras

Choose the yellow Rustaveli GT (180 km/h), teal Mtatsminda Rally (169 km/h, sharper handling), or red Caucasus 4×4 (155 km/h, stronger body). Each has a distinct model and driving characteristics. Pause and select **CHANGE CAR** to return to the garage and begin a new run.

Press **C** or the camera button to cycle through chase, cockpit, hood, and high chase views. The cockpit includes a steering wheel and live speed display.

## Play locally

Install Node.js 20 or newer, then run `npm start` in this folder. Open http://127.0.0.1:4173. The checked-in `dist/vendor` directory includes Three.js, so the playable source needs no installation or build step. To refresh the vendor files, use `npm ci` and `npm run vendor`.

## Controls

| Key        | Action                                          |
| ---------- | ----------------------------------------------- |
| W / Up     | Accelerate                                      |
| S / Down   | Brake, then reverse                             |
| A / Left   | Steer left                                      |
| D / Right  | Steer right                                     |
| C          | Cycle four camera views                         |
| Space      | Handbrake / tighter drifting turn               |
| Shift      | Nitro boost; recharges while unused             |
| P / Escape | Pause / resume                                  |
| R          | Recover to the nearest street; costs 200 points |
| M          | Sound on / off                                  |

Controls use physical key positions, including when the Georgian keyboard layout is active. A and D turn left and right relative to the forward-facing driving camera; steering follows normal reversed vehicle behavior when backing up. Touch controls appear on devices with coarse pointers. Rotate a phone to landscape for a wider view. The game pauses when its tab loses focus. Modern WebGL2 support is required.

## Rules and scoring

- Six cyan checkpoint gates must be reached in sequence. The minimap shows a legal street route to the next gate.
- Each gate awards 1,000 points plus a speed bonus of up to 800, restores 20 condition, and refills 25 nitro.
- Driving awards 1.8 points per metre. Near misses above 72 km/h award 150 points, once per traffic vehicle per traversal.
- Two police cars pursue from the beginning; a third joins at checkpoint three. They use legal street routes and track the last observed position when line of sight is blocked.
- Patrols now accelerate faster, refresh their routes every 0.55 seconds, share sightings within a 260-metre visual range, and alternate close pursuit with interception. Speed rises from 38 to 41.25 m/s as checkpoints are cleared. When every patrol loses sight, their shared target stops updating. After a ram, a patrol slows for 3.2 seconds. Police collision damage is capped at 12 condition before the chosen car's armor multiplier, while traffic and wall collision rules remain unchanged.
- Patrol cars have 100 HP and visible health bars. Meaningful rams deal 22–44 damage, with a 0.9-second impact cooldown. Three to five hits destroy a patrol, trigger fire and smoke, and award 750 points. A replacement appears after five seconds on a street at least 110 metres away.
- After checkpoint six, stay more than 100 metres from every officer, or more than 60 metres with buildings blocking sight, for eight seconds. Renewed contact drains escape progress.
- A clean escape awards 3,000 points plus 20 points per remaining condition percentage.
- Four seconds boxed in near police at low speed ends the run. Zero condition wrecks the car.

## Source layout

- `dist/index.html` — game interface and metadata.
- `dist/style.css` — responsive HUD, menus, keyboard hints, and touch controls.
- `dist/main.js` — fixed-timestep game loop, keyboard/touch input, HUD, Web Audio, minimap, and WebMCP tools.
- `dist/simulation.js` — deterministic physics, static and vehicle collisions, traffic, pursuit, routing, checkpoint and score rules.
- `dist/view.js` — Three.js city, instanced scenery, textured car models, checkpoint gate, skid marks, and follow camera.
- `dist/config.js` and `dist/controls.js` — map/car specifications and keyboard input mapping.
- `dist/scenery.js` — low-rise city, flags, balconies, and tower.
- `dist/landmarks.js` and `dist/route-guide.js` — TECHCRUSH signs, mountains, Kartlis Deda, and animated street navigation.
- `dist/cockpit.js` and `dist/effects.js` — vehicle interior, patrol health labels, explosions, and cleanup.
- `dist/assets/` — Higgsfield-generated textures and city reference image.
- `server.mjs` — dependency-free local static server.
- `tests/` — mechanics tests and a complete driving run.

## Validation

Run `npm test` for the 23 deterministic mechanics and regression tests. Run `node tests/route-drive.mjs` for a complete route with the same throttle, steering, brake and boost inputs used during play, with traffic and police active. Append `rally` or `suv` to test the other cars. The controller also uses the ordinary R recovery action with its score penalty if pinned. Each run must clear all six checkpoints and escape successfully. The controller is only a test utility and is not part of the playable game. See `VALIDATION.md` for results.

The game uses a 120 Hz fixed simulation timestep and caps catch-up after slow frames. Static geometry is instanced. There are no accounts, network gameplay, purchases, or external gameplay APIs. Score is per run and is not persisted. Google Fonts are optional; local font fallbacks are specified.

## Assets and licenses

Higgsfield generated the modern building facade, Old Tbilisi facade, asphalt, golden vehicle paint, and the supplied city visual reference on 11 September 2026, using its `gpt_image_2` model. The textures are applied to the 3D meshes. The reference guided the visual direction and is included as `dist/assets/city-reference.png`; it is not a gameplay background. Full provenance is in `ASSETS.md`.

Three.js is MIT licensed; its license is included in `dist/vendor/THREE-LICENSE.txt`. Project-authored source is licensed under the included MIT license. Generated assets remain subject to the applicable Higgsfield terms; this project does not grant additional rights beyond those terms.

## Hosting

Serve `dist/` from any static HTTPS host. `.openai/hosting.json` records the Sites project created for this game. No build step or environment secrets are required. The source package includes the full runnable static game, source, assets, dependency lockfile, and tests.
