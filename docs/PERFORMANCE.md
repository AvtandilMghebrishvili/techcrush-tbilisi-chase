# Rendering and audio lifecycle

Version 1.7.1 fixes unnecessary CPU use after playing. The principal reproduced issue was **continuing work while idle**, rather than demonstrated unbounded heap growth.

## Changes

- The city owns one coalesced frame request while driving or rewinding. Menus and pause screens render on demand; the result screen stops after the last explosion/impact has expired. HUD/minimap updates stop with it.
- Car selection, camera/lighting changes, resize and dialog transitions invalidate the retained image. A resumed loop starts with a fresh clock, keeping the existing 120 Hz simulation and capped frame delta.
- The garage's second WebGL renderer redraws on model/equipment changes, orbit, pinch, wheel zoom, inspection angle and resize. It does no continuous work while still or closed.
- Audio is lazy-created when enabled. Muting, pausing, returning to a menu or hiding the page suspends the AudioContext, rather than only setting gains to zero. Final collision/explosion sounds may finish before suspension. Interrupted sources, filters, gains and panners disconnect immediately.
- Turbo SVG strokes animate only during visible, active boost. Gyro listeners are attached only during gameplay or motion setup; they detach in other menus, pause and background. Returning re-centers from a fresh reading. Screen wake locks release when inactive.
- Navigation/page-hide cancels pending frames. Returning to a cached page redraws without automatically resuming a chase. Hidden/closed reward animations finish their already-saved result and stop their timer; upgrade counters stop while hidden.

The shared city, car templates, decoded sounds and bounded part-art cache remain allocated for reuse while the page is open. Retaining these resources avoids re-downloading/recompiling on every restart; it is not continuous CPU work. Closing the tab lets the browser release the page. Other tabs, browser extensions and browser GPU-process activity are outside the game's lifecycle.

## Measured before and after

Local headless Chrome 153.0.8010.36 on Windows, desktop viewport 960 × 540, default desktop graphics, same machine and isolated in-memory save database. Each sample waits for settling, then measures about three seconds using Chrome DevTools Protocol `Performance.getMetrics` (`TaskDuration`) and instrumented renderer-call counters. The game-over sample waits for destruction effects to finish.

| State | Before: world / garage frames in ~3s | After: world / garage frames | Before: main-thread task time | After: main-thread task time |
| --- | ---: | ---: | ---: | ---: |
| Start menu | 181 / 0 | 0 / 0 | 1,963 ms | 1 ms |
| Paused chase | 181 / 0 | 0 / 0 | 2,980 ms | 1 ms |
| Stationary garage | 0 / 181 | 0 / 0 | 175 ms | 1 ms |
| Garage closed, back to menu | 181 / 0 | 0 / 0 | 2,083 ms | <1 ms |
| Settled wreck/result screen | 179 / 0 | 0 / 0 | 3,029 ms | 1 ms |

The initialized AudioContext was `running` in all four previously played idle states before the fix, and `suspended` in each afterward. This is over 99% less **measured idle main-thread task time** in this controlled run, not an overall computer CPU percentage or an in-game FPS claim. Timing varies by hardware, browser, graphics driver and measurement overhead.

Six additional start → pause → garage → close cycles, after warming resources and collecting garbage at each sample, retained exactly 4,206 world geometries / 84 textures and 67 garage geometries / 5 textures throughout. Live transient effect and one-shot voice counts returned to zero every time. Retained JavaScript heap stayed between 59.33 and 59.67 MiB. No accumulating geometry/texture leak appeared in this bounded test; a longer soak on physical devices may reveal other issues.

## Validation and reproduction

`npm test` includes lifecycle scheduling and audio graph tests, alongside driving, collision, pursuit, rewind, upgrade and mobile-input regressions. Browser checks verify acceleration, pause/resume, mute/unmute, visibility suspension, finite crash effects, Q rewind from the stopped result screen, garage angle/orbit changes and repeated reuse. Existing multi-touch, gyro permission/fallback, pinch zoom and phone-layout checks also pass. A separate mobile lifecycle check verifies repeated gyro enable, listener detachment in menus/pause, fresh neutral calibration on resume, restored steering and no AudioContext creation on muted starts.

To inspect in Chrome DevTools:

1. Open the game directly, start a chase, enable sound and drive briefly.
2. Pause and record a Performance trace for several seconds. After the final UI frame, there should be no recurring game rendering/HUD work. Resume and verify immediate driving/audio response.
3. Repeat for an untouched garage, the closed-garage menu and a settled game-over screen. Trigger an interaction to verify that demand rendering wakes.
4. Switch tabs during gameplay. Return: the game should remain paused, with no held throttle/boost. On mobile, resume and establish a fresh neutral gyro position.
5. Repeat several garage/run cycles. Compare heap snapshots after garbage collection and WebGL object counts at the same warmed scene/camera state; do not mistake the first-time asset/shader cache for a leak.

Test instrumentation and synthetic visibility/orientation fixtures are local only. They do not alter production saves or ship public debug controls. Physical iPhone/Android sensor, battery and thermal tests remain separate from Chromium emulation.
