# Validation — expanded Tbilisi, stunts and rewind, 11 September 2026

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
