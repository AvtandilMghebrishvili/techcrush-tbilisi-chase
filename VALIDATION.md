# Validation — 11 September 2026

## Automated mechanics

`npm test`: **12 passed, 0 failed**. Covers acceleration and speed limits, braking and reverse, left/right steering, reverse steering, timestep consistency, handbrake, nitro depletion and recharge, high-speed static collisions, embedded and vehicle overlap resolution, street routing and building occlusion, police pursuit, ordered checkpoints and reinforcements, escape, wreck and capture, pause, recovery, and restart.

`node tests/route-drive.mjs`: **successful escape**, all **6/6 checkpoints**, **3 police cars** active, **116.3 seconds** simulated, **21,896 points**, **86% condition**. The controller drives through the normal simulation inputs, with traffic and police enabled; it does not teleport or grant checkpoint completion.

## Browser checks

Tested the local playable game in the Codex browser at 1280×720 and 390×844. Verified city and texture loading, start screen, active chase rendering, scoring after checkpoint one, steering, collision damage, keyboard P to resume, pause modal, and the responsive layout. Browser console reported no errors or warnings during the checked run.

Validated the registered WebMCP status, start, drive, and pause actions against visible state. Invalid driving values and an invalid pause value were intentionally rejected without changing the paused run.

## Limits

These checks cover a desktop Chromium browser and a simulated phone viewport, not physical mobile hardware or every GPU/browser. Touch buttons are implemented with pointer capture and release handling. WebGL2 is required. Single-player, arcade physics, finite city grid; no multiplayer or persistent leaderboard.
