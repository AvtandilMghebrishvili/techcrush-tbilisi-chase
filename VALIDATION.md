# Validation — Tbilisi daylight edition, 11 September 2026

## Automated checks

`npm test`: **24 passed, 0 failed**. Checks cover acceleration/braking/reverse, fixed-step consistency, handbrake and nitro, left/right steering from every camera heading, Georgian keyboard physical keys, rotated building and vehicle collisions, car configuration, police routing/radio/chase, patrol HP/explosion/replacement, checkpoint order, repair, escape/capture/restart states, animated navigation and all static module imports including transitive Three.js loaders.

The OSM-derived map has 373 nodes and 498 segments. Connectivity tests visit every node, check road centers with the player collision radius against building footprints, and verify connected, unobstructed routes between all six gates.

## Complete driving runs

The deterministic controller uses ordinary throttle, steering, braking, nitro and the same R recovery action available to the player, including its score penalty. Traffic and police remain active. It does not grant checkpoints, condition or immunity. Controller recovery and ideal route knowledge mean these runs establish that the game is completable, not an estimate of first-time human difficulty.

| Car          | Result  | Gates | Simulation time | Score  | Condition | Patrol takedowns |
| ------------ | ------- | ----- | --------------- | ------ | --------- | ---------------- |
| 458 Stradale | Escaped | 6/6   | 112 s           | 25,852 | 80%       | 6                |
| 458 Track    | Escaped | 6/6   | 136 s           | 27,271 | 61%       | 6                |
| 458 Touring  | Escaped | 6/6   | 129 s           | 26,882 | 88%       | 6                |

Reproduce with `node tests/route-drive.mjs gt`, `node tests/route-drive.mjs rally`, and `node tests/route-drive.mjs suv`. These results use the final simulation and map.

## Browser inspection

Inspected the initial garage, detailed sports car, TECHCRUSH branding, limestone facades, asphalt, tree billboards, mountain/tower backdrop, checkpoint arrows and driving HUD in local desktop Chromium. The modeled cockpit shows the steering wheel, dashboard and windshield pillars with the road visible ahead. A normal two-second acceleration test reached 95 km/h with full condition. Three seconds of an earlier cockpit drive advanced approximately three seconds of simulation; this is a short functional check, not a GPU benchmark.

The final contact-shadow shader renders without a rectangular white matte. Tree pale-matte removal was inspected in the scene. Browser error/warning logs were empty after loading and driving. The default browser panel was also observed at a narrow desktop width; a physical phone, Safari and low-end GPUs were not tested in this update.

## Issues corrected during the update

- Vendored HDRLoader's transitive imports so loading does not stall on a missing module; added an import-graph check.
- Kept AI, checkpoint guidance, minimap and building collisions on the same connected geographic map.
- Restored the Lagidze connection and adjusted gate positions to avoid awkward checkpoint turns.
- Made traffic retain ram momentum instead of immediately overwriting collision velocity.
- Used patrol recovery, capped police ram damage and 30 condition repair at gates to balance the stronger pursuit.
- Converted the car contact-shadow grayscale to opacity and removed the pale tree background in the material shader.
- Hid close patrol HP sprites when they would obscure the driving camera.

## Limits

This is a simplified playable reconstruction using OSM street center lines, widened roads, approximate buildings, original terrain and the user's visual references. It is not Google Maps photogrammetry or an exact street survey. The three configurations share one detailed 458 model with different appearance and driving characteristics. Photographic tree billboards are flat crossed planes. Detailed models and textures increase loading and GPU cost compared with the earlier stylized edition.

WebGL2 and a modern browser are required. No cross-browser or physical-device performance guarantee is made. Single-player arcade game; no multiplayer or persistent leaderboard. Asset credits and licenses are in `ASSETS.md` and the in-game Credits page.
