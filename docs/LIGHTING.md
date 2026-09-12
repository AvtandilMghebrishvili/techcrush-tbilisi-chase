# City lighting and interface

`city-lighting.js` owns a single `CityLighting` instance per world. `lightingAt(sim.time, mode)` produces a continuous darkness/lamps state; its **240-second loop** starts at dawn, reaches daylight by 30 seconds, holds noon/daylight until 90, blends through dusk to full night at 155, and returns toward dawn after 205. Manual modes fix the state. Only the display preference is stored in `techcrush-lighting` in local storage. Garage saves, physics, pursuit sight and difficulty are unchanged.

The sky is a single inward-facing sphere with the existing HDR, a night gradient, procedural moon and stars. Lighting blends directional/ambient intensity, fog and environment reflections. The existing player headlights increase from 16 to 145 intensity at night. The garage uses the retained raw HDR in its separate renderer, independent of outdoor darkness.

Facade emission masks sample the existing image's dark panes while retaining black mullions and unlit rooms. Five variants reuse the five facade materials; no extra building geometry or per-window lights are created. Street/bridge lamp heads register their breakable prop IDs. Broken props immediately lose bulb visibility, halos, pools and local illumination; rewind restores them from authoritative simulation state.

Performance bounds:

- Exactly three reusable shadowless point lights, with distance falloff. No new shadow maps or postprocessing passes.
- At most 64 nearby lamps in each of two instanced quad batches. Selection refreshes every 0.15 simulation seconds; broken-state filtering happens every rendered frame.
- One sky draw plus two effect draws at night; effect batches are hidden in daylight. No frame-by-frame texture creation or image downloads.
- Five 512 × 512 masks and one 64 × 64 falloff texture are prepared once. Existing environment assets and garage render-loop suspension are reused.

`motorsport.css` styles the established controls rather than replacing their actions. Short entry transitions animate opacity/translation and honor reduced motion. The loading gauge advances at actual setup milestones (city, facade/road assets, hills, cars/trees, saved garage, shader warm-up); it is not a network-byte percentage. `compileAsync` completes before the loading overlay is hidden, with no minimum-duration timer.

## Level starts and showers (1.14)

Auto starts use shuffled dawn/night/day conditions per level, with the same condition for every player on that course. Manual modes remain fixed. Some Auto levels include a short 24-second light shower. It adds no media downloads or continuous background timer. [Behavior and performance](RESULTS.md).
