# NIGHTSHIFT — City Chase

A complete browser 3D arcade car chase made with Three.js. Drive a yellow coupe through a city grid, avoid civilian traffic, hit six checkpoints in order, then break contact with the police for eight seconds.

## Play locally

Install Node.js 20 or newer, then run `npm start` in this folder. Open http://127.0.0.1:4173. The checked-in `dist/vendor` directory includes Three.js, so the playable source needs no installation or build step. To refresh the vendor files, use `npm ci` and `npm run vendor`.

## Controls

| Key                  | Action                                          |
| -------------------- | ----------------------------------------------- |
| W / Up               | Accelerate                                      |
| S / Down             | Brake, then reverse                             |
| A / D / Left / Right | Steer                                           |
| Space                | Handbrake / tighter drifting turn               |
| Shift                | Nitro boost; recharges while unused             |
| P / Escape           | Pause / resume                                  |
| R                    | Recover to the nearest street; costs 200 points |
| M                    | Sound on / off                                  |

Touch controls appear on devices with coarse pointers. Rotate a phone to landscape for a wider view. The game pauses when its tab loses focus. Modern WebGL2 support is required.

## Rules and scoring

- Six cyan checkpoint gates must be reached in sequence. The minimap shows a legal street route to the next gate.
- Each gate awards 1,000 points plus a speed bonus of up to 800, restores 10 condition, and refills 25 nitro.
- Driving awards 1.8 points per metre. Near misses above 72 km/h award 150 points, once per traffic vehicle per traversal.
- Two police cars pursue from the beginning; a third joins at checkpoint three. They use legal street routes and track the last observed position when line of sight is blocked.
- After checkpoint six, stay more than 100 metres from every officer, or more than 60 metres with buildings blocking sight, for eight seconds. Renewed contact drains escape progress.
- A clean escape awards 3,000 points plus 20 points per remaining condition percentage.
- Four seconds boxed in near police at low speed ends the run. Zero condition wrecks the car.

## Source layout

- `dist/index.html` — game interface and metadata.
- `dist/style.css` — responsive HUD, menus, keyboard hints, and touch controls.
- `dist/main.js` — fixed-timestep game loop, keyboard/touch input, HUD, Web Audio, minimap, and WebMCP tools.
- `dist/simulation.js` — deterministic physics, static and vehicle collisions, traffic, pursuit, routing, checkpoint and score rules.
- `dist/view.js` — Three.js city, instanced scenery, textured car models, checkpoint gate, skid marks, and follow camera.
- `dist/assets/` — Higgsfield-generated textures and city reference image.
- `server.mjs` — dependency-free local static server.
- `tests/` — mechanics tests and a complete driving run.

## Validation

Run `npm test` for the 12 deterministic mechanics tests. Run `node tests/route-drive.mjs` for a complete route with the same throttle, steering, brake and boost inputs used during play, with traffic and police active. The test must clear all six checkpoints and escape successfully. The smoke controller is only a test utility and is not part of the playable game.

The game uses a 120 Hz fixed simulation timestep and caps catch-up after slow frames. Static geometry is instanced. There are no accounts, network gameplay, purchases, or external gameplay APIs. Score is per run and is not persisted. Google Fonts are optional; local font fallbacks are specified.

## Assets and licenses

Higgsfield generated the building facade, asphalt, golden vehicle paint, and the supplied city visual reference on 11 September 2026, using its `gpt_image_2` model. The three textures are applied to the 3D meshes. The reference guided the visual direction and is included as `dist/assets/city-reference.png`; it is not a fake gameplay background. Full provenance is in `ASSETS.md`.

Three.js is MIT licensed; its license is included in `dist/vendor/THREE-LICENSE.txt`. Project-authored source is licensed under the included MIT license. Generated assets remain subject to the applicable Higgsfield terms; this project does not grant additional rights beyond those terms.

## Hosting

Serve `dist/` from any static HTTPS host. `.openai/hosting.json` records the Sites project created for this game. No build step or environment secrets are required. The source package includes the full runnable static game, source, assets, dependency lockfile, and tests.
