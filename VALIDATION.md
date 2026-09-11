# Validation — pursuit and handling update, 11 September 2026

## Automated checks

`npm test`: **36 passed, 0 failed**. Checks cover acceleration/braking/reverse, fixed-step consistency, left/right steering and Georgian physical keys, real lateral drift and countersteer recovery, smooth turbo spool/release and empty-tank lockout, building collisions, oriented bumper/door impulses, police-to-police separation, solid trees and breaking, patrol roles and forward roadblock planning, radio observation limits, HP/explosion/replacement, checkpoint order, repairs, escape/capture/restart, clear-road recovery, navigation and all static module imports.

The camera test checks rotated walls between clear endpoints and clearance above roofs. The joined asphalt test checks actual triangles, upward normals and street coverage. The OSM-derived map has 373 nodes and 498 segments; connectivity checks visit every node and verify unobstructed routes between all six gates. The rendered asphalt is one connected polygon with 35 block islands.

## Complete driving runs

The deterministic controller uses ordinary throttle, steering, braking, turbo and the player's R recovery action, including its score penalty. Traffic, solid trees and all police roles remain active. It grants no checkpoints, health or immunity. Ideal route knowledge and recovery mean these runs establish that the game is completable, not first-time human difficulty.

| Car          | Result  | Gates | Simulation time | Score  | Condition | Patrol takedowns | Broken trees |
| ------------ | ------- | ----- | --------------- | ------ | --------- | ---------------- | ------------ |
| 458 Stradale | Escaped | 6/6   | 171.8 s         | 28,699 | 25%       | 7                | 4            |
| 458 Track    | Escaped | 6/6   | 162.9 s         | 26,097 | 60%       | 5                | 5            |
| 458 Touring  | Escaped | 6/6   | 193.7 s         | 31,967 | 22%       | 9                | 10           |

Reproduce with `node tests/route-drive.mjs gt`, `node tests/route-drive.mjs rally`, and `node tests/route-drive.mjs suv`. All used the final simulation and map; later edits affected only camera, cosmetics and documentation.

## Browser inspection

Inspected the new 3D tree, original police sedan and 1980s civilian sedan in a temporary model review page, then the actual game. Checked continuous street surfacing, detailed sports car, TECHCRUSH branding, tree canopies, turbo flames and animated edge streaks, drift indicator, cornering and checkpoint guidance in desktop Chromium. The model review page is removed from the deliverable.

A normal 1.6-second turbo acceleration reached 141 km/h with 70% charge remaining. A subsequent handbrake turn produced 17 degrees of lateral slip at 99 km/h. A separate ordinary drive registered a broken tree. Browser error/warning logs were empty after driving. The follow camera now clips its entire boom against buildings, including the smoothed camera path, instead of jumping upward into a facade.

## Issues corrected

- Replaced overlapping road rectangles with a joined asphalt polygon and world-aligned UVs; curbs and sidewalks follow its boundary.
- Replaced flat tree cards with optimized geometry sharing solid trunk locations with the simulation. Strong impacts topple trees and leave stumps.
- Replaced circular car contacts with oriented bodies and iterative mass-weighted separation for every vehicle pair.
- Added three-to-six coordinated pursuers, interceptors and roadblock units with corner braking, obstacle awareness and reverse recovery.
- Added original patrol sedans and multiple civilian body styles instead of only sports cars.
- Eliminated abrupt speed loss on turbo release and repeated empty-tank pulses. Added spool, recharge delay, exhaust flames, FOV, edge streaks and synthesized audio.
- Added sustained lateral drift with countersteering, smoke and connected rear-tire marks. Reset clears smoke.
- Recovery chooses an unoccupied road position; camera collision checks the complete line back to the car.

## Limits

This is a simplified arcade reconstruction using OSM street center lines, widened roads, approximate buildings, original terrain and visual references. It is not Google Maps photogrammetry or an exact street survey. The three player configurations share one 458 base model; other vehicles are original procedural geometry. Trees use two geometry detail levels; detailed assets increase loading/GPU cost.

WebGL2 and a modern browser are required. Physical phones, Safari and low-end GPUs were not tested in this update. Short browser drives are functional checks, not a frame-rate benchmark. Single-player game without multiplayer or a persistent leaderboard. Asset provenance is in `ASSETS.md` and the in-game Credits page.
