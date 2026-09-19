# Private preview validation — 19 September 2026

## Public release preparation — 19 September 2026

- 253 automated tests passed, including traffic and patrol ramp pass-through,
  player ramp launch/back-face contacts, saved garages, event deadlines and
  two independent profiles proving that global reveal does not grant map access.
- Owner access and simulated time are disabled in the local launcher by default;
  production never accepts these flags. The live schedule is 20 September 15:00
  through 24 September 21:00, Asia/Tbilisi.
- Compact event overview checked at desktop and 390 × 844. Main information,
  prizes, entry, standings and rules disclosure fit without horizontal overflow.
  The upcoming mobile overview fits in one view. Full expanded rules and long
  standings retain intentional scrolling.
- Green opening countdown checked against the real local server. Red closing
  countdown and globally revealed/individually locked Rustavi UI inspected in
  an isolated design fixture; that fixture was removed before packaging.
- Screenshots remain under ignored `artifacts/city-wars-release/`. Local test
  profiles, SQLite databases, raw references and screenshots are not deployed.
- No new renderer or continuous animation. The one-second timer suspends in a
  hidden tab; rankings refresh every 30 seconds only with the event panel visible.

- `npm test`: **238 passed, 0 failed**.
- `npm run build`: completed successfully.
- `npm run check:build`: production links resolve; 34 checked runtime assets
  (42,035,761 bytes) match source; no QA globals or obsolete entry module.
- Browser: local owner profile registered, event chase started, saved score
  appeared at rank 1, and later banked points accumulated. Only the isolated
  preview database was used.
- Browser: Tbilisi → Kutaisi → Batumi → Rustavi transitions retain the same
  test garage and event selection. No browser console errors were observed.
- Browser: corrected Rustavi starting view includes the enlarged hollow diamond
  monument. The event HUD sits in the pursuit panel and does not cover distance
  guidance. Both night and daylight settings were checked.
- Browser: 390 × 844 viewport uses two prize columns without horizontal overflow;
  registration/member controls remain reachable by scrolling. Override reset
  after testing. This does not substitute for testing on physical phones.
- Physics: two-way bridge traversal, lane-edge water support, clear spawn,
  connected roads, collision-safe landmarks, checkpoint routing, drift/pursuit,
  fast/slow rooftop attempts, ramp back-face collision and rewind all pass.
- API: duplicate names roll back; retries and replays do not double-count;
  five distinct artifacts per original city survive multiple runs; unqualified
  secret-map access fails; deadline/grace/late-save behavior is tested; archived
  rankings and ordinary garages remain intact.
- Operations: preview listens only on `127.0.0.1:4191`, stores separate test saves
  and can be stopped/restarted with `scripts/private-preview.ps1`.

The checks establish the tested behavior, not a guarantee of a fixed frame rate
on every device or immunity to modified browser clients. See CITY_WARS.md for
manual winner review and release requirements. The public site and public GitHub
repository were not updated for this owner-only preview.

## 19 September: civic plaza and event entry update

- 245 automated tests passed; production build and asset-integrity verification passed.
- Real server countdown verified in the private browser: STARTS IN, bold green,
  20 September 15:00 through 24 September 21:00 (Tbilisi time). Event starts and
  deadline eligibility share the same constants and are covered by boundary tests.
- First visit automatically opened the event dialog. Reload showed only the side
  notice; it disappeared after 10 seconds, and clicking it opened the event panel.
- Challenge tab stayed anonymous for owner preview access. API tests used two
  separate profiles: the first complete saved hunt revealed its identity to the
  second, without granting the second access to the map.
- English/Georgian rules inspected side by side on desktop and stacked at 390×844.
  Viewport override reset after testing.
- Hall forecourt and relocated monument inspected in the live private scene.
  Placement tests exclude ordinary buildings and trees and match wheel support
  to the new paved surface. No browser console errors observed.
- Private server remains bound to 127.0.0.1:4191; public site/GitHub unchanged.

## 19 September: cockpit visibility

- Calibrated all eight driver seats, including the licensed 458 windscreen and
  Cyber pickup's sloping roof. Gameplay and garage share the same camera rig.
- Driver eye follows the rendered chassis (kerb/plaza support, jumps and banking),
  rather than unadjusted simulation height. Cabin impact shake is bounded to 6 mm
  in either direction so it cannot displace the camera into the dashboard.
- 247 tests passed. Geometry tests project every steering-wheel vertex at three
  aspect ratios and three steering angles, ray-test road/horizon clearance, and
  verify eye position through elevated/rotated chassis poses.
- Browser checks cover Vector gameplay at desktop and 390×844 and original 458
  garage/gameplay. No extra rendering loop, textures or camera settings are added.
  The temporary viewport override is reset after testing.
- Changes remain in the private preview; no public event release is made.
