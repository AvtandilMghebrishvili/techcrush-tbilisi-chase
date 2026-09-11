# Validation — TECHCRUSH chase update, 11 September 2026

## Automated mechanics

`npm test`: **23 passed, 0 failed**. The 19 previous physics, controls, cars, collisions, patrol health, explosion and mission checks still pass. Four new tests cover legal street arrow placement around turns, guide animation/checkpoint changes/restart/escape visibility, pursuit of a moving car, and sharing observations without tracking through buildings after contact is lost.

Full driving runs use normal controls with traffic and police active. The controller uses nitro on clear straights and the normal R recovery action, including its score penalty, if pinned. It does not grant checkpoint completion, health, or immunity.

| Car              | Result  | Checkpoints | Time    | Score  | Condition | Patrol takedowns |
| ---------------- | ------- | ----------- | ------- | ------ | --------- | ---------------- |
| Rustaveli GT     | Escaped | 6/6         | 189.4 s | 30,128 | 1%        | 6                |
| Mtatsminda Rally | Escaped | 6/6         | 96.6 s  | 24,230 | 92%       | 5                |
| Caucasus 4×4     | Escaped | 6/6         | 206.2 s | 32,170 | 52%       | 7                |

Reproduce with `node tests/route-drive.mjs`, `node tests/route-drive.mjs rally`, and `node tests/route-drive.mjs suv`.

## Browser review

The subsequent photo-reference statue revision was inspected in front and three-quarter close-up views, then in the actual game skyline and cockpit view. Confirmed the raised bowl, horizontal sword, straight dress and headdress, successful start/driving, and an empty browser error/warning log. The temporary model-review page was removed before packaging. This change affects scenery only; the mechanics results below remain those of the prior tested simulation.

Verified the TECHCRUSH title and garage signs, distant mountains, mounted Kartlis Deda statue, animated road arrows, normal driving and checkpoint progress, and cockpit navigation. Browser console checks returned no errors or warnings. The prior desktop and phone viewport layout checks remain applicable; this update adds no new HUD panels.

During review, corrected transparent road arrows rendering over the cockpit dashboard by placing the interior in the final transparent overlay pass. Balanced the stronger pursuit with patrol ram recovery, capped ram damage, and 20 condition repair per checkpoint. The GT escape remains demanding, as shown by its low remaining condition in the controller run.

## Limits

### Supplied logo follow-up

Verified the supplied portrait logo and lettering in the header and 3D garage signs at desktop size and 390×844. The mobile header fits alongside camera, sound and pause controls. Both copied assets match their supplied originals by SHA-256. JavaScript syntax and local HTTP checks pass; browser console errors/warnings are empty. This follow-up changes branding only; the previously recorded 23 mechanics tests and driving results are unchanged.

Tested with desktop Chromium, not every GPU/browser or physical phone. WebGL2 is required. Mountain and landmark geometry is a fictional stylized interpretation. Single-player arcade game without multiplayer or persistent leaderboard.
