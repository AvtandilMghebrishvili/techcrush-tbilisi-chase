# Testing

Tests use Node's built-in test runner. They import simulation and geometry modules directly without requiring a browser or GPU. The recorded gameplay validation is in [VALIDATION.md](../VALIDATION.md); it distinguishes automated driving, browser inspection and controlled rendering fixtures.

## Automated suite

```sh
npm test
```

The current suite contains **44 tests**. The [CI workflow](../.github/workflows/ci.yml) runs `npm ci` and the suite on Ubuntu and Windows with Node.js 24 for pushes and pull requests. It does not deploy a site. For one focused file, use e.g. `node --test tests/stunts-rewind.test.mjs`.

| File                     | Main coverage                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `simulation.test.mjs`    | Driving, collisions, checkpoint and end-state rules                                        |
| `upgrade.test.mjs`       | Car variants, keyboard steering, checkpoint routes, police damage and explosion effects    |
| `pursuit.test.mjs`       | Pursuit/roadblock roles, contacts, drift and breakable trees                               |
| `polish.test.mjs`        | Turbo transitions, recovery, road surfaces and camera clearance                            |
| `navigation.test.mjs`    | Route guidance, pursuit speed and shared radio observations                                |
| `stunts-rewind.test.mjs` | Ramp flight, rollover recovery, full-world rewind, history branching and reinforcement cap |
| `assets.test.mjs`        | Local module imports, including transitive Three.js loaders                                |

Test names in the files provide the precise assertions. Tests do not prove realistic appearance, stable FPS on every GPU, or enjoyable first-time difficulty.

## Full-route driving controller

```sh
node tests/route-drive.mjs gt
node tests/route-drive.mjs rally
node tests/route-drive.mjs suv
```

Run each command separately. The controller uses regular throttle, steering, handbrake, turbo and R recovery, with traffic, police and collisions enabled. It prints the final simulation snapshot and exits unsuccessfully if the run does not end in `won`. It can simulate up to 480 seconds at 120 Hz and may take several minutes of CPU time per run.

It knows the ideal route and uses ordinary recovery, including the score penalty. It grants no checkpoints, health or immunity. It does not intentionally exercise stunts or rewind, which have separate tests. The latest recorded runs completed all six gates with all three trims; their scores and remaining HP are in [Validation](../VALIDATION.md#full-driving-runs).

For diagnosis, set the optional `TRACE` environment variable to `1` before running a controller. It prints position, target, heading and path samples. These longer runs are not part of routine push CI; repeat them for changes affecting routes, physics, pursuit balance or recovery.

## Browser review

Start `npm start` and open http://127.0.0.1:4173/. Use ordinary controls to verify:

1. **Load and garage:** assets finish loading, all three trims select correctly, Start works, and there are no module/asset failures in browser developer tools.
2. **Driving:** W accelerates, S brakes then reverses, A/D turn the expected way, and releasing input behaves correctly. Repeat with a Georgian keyboard layout.
3. **Turbo and drift:** Shift changes acceleration, charge, exhaust, FOV and audio together; empty nitro must recharge before reuse. Space with steering produces a controllable slide and trails.
4. **Contacts:** buildings stop the car; slow tree contacts deflect/stop it; hard hits break a tree. Patrols and civilians separate instead of passing through each other.
5. **Chase:** pursuit, interception and roadblocks react to the player; further units arrive over time. Damaged patrols explode and replacements arrive. Checkpoint repairs, scoring, escape and capture remain coherent.
6. **Flight/recovery:** drive up a marked ramp, adjust airborne roll/pitch and land. A rollover loses HP and restores the car upright after a delay if it survives. R recovers at the documented score cost.
7. **Rewind:** drive at least five seconds, hold Q, release at an earlier moment and continue driving. Confirm score, HP, checkpoints, traffic and police restore together. Try rewind after a wreck/capture and at the oldest history boundary.
8. **Presentation:** compare chase/cockpit/hood/aerial views, check camera clearance at walls, route arrows, minimap and both sides of TECHCRUSH signs. Inspect the bridge approaches, river and expanded districts.
9. **Focus and layout:** pause/resume, switch tabs, resize the window and inspect touch controls. Reducing the viewport on desktop is not a substitute for testing a physical phone.

Record browser/version, device/GPU, commit, steps and observed results with any issue. Distinguish real driving from controlled test fixtures. Avoid reporting frame rate or mobile compatibility that was not measured.

## Before a release

Run the suite for the release commit, run full routes if mechanics/maps changed, and inspect the final hosted artifact in a browser. Verify the public source includes all local runtime assets and the lockfile. Update `VALIDATION.md` with new evidence rather than silently replacing historical results.

[Back to README](../README.md)
