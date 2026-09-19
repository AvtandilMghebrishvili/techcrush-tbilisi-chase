# Tbilisi landmark refresh

The September 2026 refresh adds a playable northern/western city extension, Heroes Square flyover, Freedom Square monument, King David and Axis Towers, and repairs Narikala's foundations.

These are original procedural models guided by photographs, adapted to the game's compressed arcade city. They are not a survey, a one-to-one street reconstruction, or Google imagery pasted into the game.

## Visiting the landmarks

Open **Map + Side Quests** and look for **FREEDOM SQUARE (F)**, **HEROES FLYOVER (H)**, **KING DAVID (K)**, **AXIS TOWERS (A)** and **NARIKALA (N)**. Clicking the map sets the existing yellow secondary route while checkpoint directions remain active. The northern extension connects to the existing Merab Kostava endpoint; the flyover has two graded entrances and a separate street below.

## Models and reference sources

| Landmark | Reproduced features | Visual reference |
| --- | --- | --- |
| Narikala | Connected stepped stone curtain walls, crenellations, round turrets, embedded foundations and supported upper cable-car terminal | Existing Tbilisi scene and terrain |
| Heroes Square | Curving concrete flyover, separated deck, piers, guardrails and central memorial with planted island | [CRP construction photographs](https://www.crp.ge/?full=project&lang=eng&page=full&project=38) |
| Freedom Square | Stepped stone base, fluted white column, gilded horse/rider/lance silhouette and historic city-hall frontage | [Freedom Monument photos](https://madloba.info/tbilisi/monuments-and-statues/freedom-monument/) |
| Axis Towers | 37 storeys, opposite two-degree floor rotations, pale horizontal bands and dark glazed twin | [Axis official description](https://axistowers.ge/en/company/about-us) |
| King David | Two unequal rounded glass towers, white floor ribbons and roof crowns | [King David official site](https://kdr.ge/), [building photographs](https://korter.ge/en/king-david-residences-tbilisi) |

Reference photographs are used for inspection only and are not shipped as game textures. The game reuses its existing asphalt, vegetation and masonry assets alongside a small original window canvas.

## Implementation

- `dist/tbilisi-civic-layout.js`: shared map coordinates, append-only road extension, graded flyover path and district terrain envelope. All archived road/node IDs remain intact.
- `dist/tbilisi-civic-data.js`: matching landmark collision volumes and safe supporting piers. Axis uses rotated floor volumes; King David uses rounded footprints.
- `dist/tbilisi-civic.js`: statically batched landmark meshes and a continuous asphalt deck. Existing day/night materials light the windows without additional light pools or render loops.
- `dist/fortress-foundations.js`: samples wall/turret footprints against the actual terrain and embeds the foundations below its surface, removing floating sections.
- `dist/elevated-roads.js`: graded support, deck landing and falling. Road routing and arrows retain elevation; vehicles below the deck do not collide with cars or rails above it. NPCs use the same deck support with bounded falling recovery.
- `dist/tbilisi-road-surface-data.js`: rebuilt ground asphalt/sidewalk polygons. Elevated asphalt is rendered separately.

Existing player profiles, garages, unlocks, CITY WARS rules and artifact progress are unchanged. The original six checkpoint districts and timing course remain intact; new destinations can be reached using map waypoints.

## Verification

Tests cover archived graph IDs, connectivity, terrain-contact foundations, both flyover directions, grade separation, airborne landings, NPC falls, clear road centerlines and actual throttle/steering traversal without impacts. The existing save, event, lifecycle, mobile, collision and world suites also run. Browser review uses the actual game renderer for all five landmarks and day/night lighting.

The new static landmark geometry joins existing spatial batches; trees reuse the existing instanced LOD system. No background animation loop, persistent media cache or new high-resolution image download is introduced.
