# Validation — Georgian city update, 11 September 2026

## Automated mechanics

`npm test`: **19 passed, 0 failed**. Covers acceleration and speed limits, braking and reverse, steering, timestep consistency, handbrake, nitro, static and vehicle collisions, routing and occlusion, police pursuit, ordered checkpoints, escape, wreck and capture, pause, recovery, and restart.

New regression checks project the player's motion into the Three.js camera at four cardinal headings: A moves screen-left and D screen-right. They also verify physical keys with a Georgian layout, car statistics and selection, expanded streets and tower plaza, patrol HP/collision cooldown, a real vehicle ram, one explosion per destroyed patrol, replacement at full health away from the player, and explosion cleanup.

Full runs use normal throttle, steering, braking and boost inputs with traffic and police enabled. The controller does not teleport or grant checkpoints.

| Car              | Result  | Checkpoints | Simulated time | Score  | Condition | Patrol takedowns |
| ---------------- | ------- | ----------- | -------------- | ------ | --------- | ---------------- |
| Rustaveli GT     | Escaped | 6/6         | 153.3 s        | 24,198 | 62%       | 1                |
| Mtatsminda Rally | Escaped | 6/6         | 127.2 s        | 22,400 | 100%      | 0                |
| Caucasus 4×4     | Escaped | 6/6         | 139.0 s        | 22,331 | 73%       | 1                |

Reproduce with `node tests/route-drive.mjs`, `node tests/route-drive.mjs rally`, and `node tests/route-drive.mjs suv`.

## Browser checks

Tested in desktop Chromium at 1280×720 and a 390×844 phone viewport. Verified car previews and selection, starting with the selected SUV, new facades, Georgian flags, tower, cockpit speed display and steering wheel, keyboard C camera changes, hood and high chase views, pause, and return to the garage. Corrected cockpit wheel occlusion during visual review. Console checks returned no errors or warnings.

Verified registered WebMCP status, car selection and camera controls against visible state; invalid car/camera inputs were rejected. The previous version's start, drive, pause, scoring, damage, and responsive checks remain covered by the mechanics suite and full driving runs.

## Limits

Checks cover desktop Chromium and a simulated phone viewport, not physical mobile hardware or every GPU/browser. WebGL2 is required. This is a single-player arcade game with a finite fictional city, without multiplayer or a persistent leaderboard.
