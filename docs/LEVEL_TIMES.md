# Shared level times

> Current 2.0 rules: all three cities start open; classic cornering and adjustable driving feel; a 180-second night-first Auto cycle; four new earned cars; visual result cards. See [version 2.0 details](BATUMI.md). Earlier measurements and release descriptions below retain their original context.

Open the gold **LEADERBOARD** button above Garage / Start, or the trophy in the top toolbar. Select **LEVEL TIMES**, enter a level and press **SHOW**. Everyone on the same public game URL reads the same server standings, including players using other computers. Public visibility must be enabled in My Driver. This shows banked results, not a live video or spectator session.

Each level has its own table. Only successful clears count: all six checkpoints followed by the required police escape. The HUD shows active elapsed time and the result screen shows the completed time. Loading, pause, menus and hidden tabs do not count. Slow rendered frames count their real elapsed time. Rewinding never reduces the clock; the time spent reversing and driving again is included, and the row shows the number of rewind attempts. Resetting an overturned car also leaves the clock running.

Times are rounded up to hundredths of a second. Equal displayed times share the same sporting rank; the earlier record/public ID only stabilizes row order. Select the same **Car** and **Stock only** to compare equal equipment. **All upgrades** is an open category: each row identifies the car and the summed installed part grades plus fusion stars (at most 140). That sum is descriptive, not an assertion that different parts provide equal performance. Car and installed grades are captured by the server at the start of the run, so later garage changes cannot relabel a tuned run as stock.

Records began with course `tbilisi-1.13`. The current courses are `tbilisi-1.17` and `kutaisi-1.2`; choose **Course → Archive** to view Tbilisi 1.13/1.14/1.16 or Kutaisi 1.0/1.1 times. Earlier versions did not measure this clock, so historical times are not invented. Existing levels, credits, parts, boxes, names, public IDs and the original progress/score/week standings remain saved. Changing car/route/physics rules in a future release should use a new course ID; old database records stay intact. A normal career clear advances the level as before; this update does not add a lower-level replay mode.

## Storage and validation

`drizzle/0002_workable_wildside.sql` adds `level_records` and query indexes without replacing or rewriting old garage tables/migrations. Each garage has one best record per course, level, car and stock/tuned category. The all-car view selects one fastest eligible record per driver. Hidden profiles are excluded at read time, so turning off public visibility hides existing times too.

Run tickets are server issued. The server validates completion counters, course, elapsed-time bounds and numeric inputs. The optimistic garage update and timed-record insert execute together in a database batch. The insert verifies the winning operation ID, version and run ID; concurrent or replayed settlements cannot sneak in a faster result after losing the garage update. Network retries retain the existing outbox/idempotency behavior. Read APIs expose public identifiers and result metadata, never private garage keys, inventories or profiles.

This remains a casual community leaderboard with client-reported gameplay. It is not an authoritative anti-cheat simulation. Rewind and mobile assists are available to everyone; the recorded rules and equipment filters make the comparison explicit.

## Surface and collision changes

Water support is derived from the same road/sidewalk polygons, bridge decks and 2.6 m bank caps that are rendered. A bumper overhang does not sink the car while a tire contact remains supported. Once all tire contacts and the chassis center are over open water, the existing fall, splash, damage and road recovery apply. The river is still open water between the real supported surfaces.

Vehicle/building contacts now use the oriented chassis width and length rather than a large enclosing circle. Clock-building wings, cornices, bath bases/domes, the cable station and elevated tube-shell clearances use more detailed dimensions and height checks. Rounded dome contacts follow their circular cross-section; curved tube shells use the same 30 longitudinal sections as the mesh. Tiny decorative details and curved surfaces remain practical game collision approximations, not a triangle-perfect rigid-body simulation.

Pathfinding uses a heap and a bounded 96-source typed-array cache. Nearby single-cell collision queries reuse cached lists; water ray crossings use height bands. No texture, model, shadow or render-quality setting was reduced. See [Performance](PERFORMANCE.md) and [Validation](../VALIDATION.md) for measured scope and limitations.

The finish overlay now shows both overall and level-time ranks automatically, with a large clock and a saved result-sharing page. See [Results and conditions](RESULTS.md).
