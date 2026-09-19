# Tbilisi landmark refresh

The September 2026 refresh adds a compact riverside district, Heroes Square flyover, Freedom Square monument, King David and Axis Towers, and repairs Narikala's foundations.

These are original procedural models guided by photographs, adapted to the game's compressed arcade city. They are not a survey, a one-to-one street reconstruction, or Google imagery pasted into the game.

## Visiting the landmarks

Open **Map + Side Quests** and look for **FREEDOM SQUARE (F)**, **HEROES FLYOVER (H)**, **KING DAVID (K)**, **AXIS TOWERS (A)**, **BANK OF GEORGIA (B)** and **NARIKALA (N)**. Clicking the map sets the existing yellow secondary route while checkpoint directions remain active. The riverside district joins the old core at several street endpoints; the flyover has two graded entrances and a separate street below.

## Compact district revision

Following the owner's annotated red/green map, Heroes Square (0, 1050), King David (-280, 850), Axis Towers (110, 670) and Bank of Georgia (-729, 397) occupy the riverside gap beside the original core. Two bank boulevards, connected neighbourhood streets and three new bridges join both sides of Mtkvari. These are compressed gameplay locations, not geographic coordinates. Every bridge uses the same deck dimensions for rendering and vehicle support, with matching bank openings and breakable edge rails.

Axis has a reserved open forecourt and a street only four metres from its podium; ordinary frontage lots cannot obstruct it. The quiet northern loop stays accessible because it hosts a previously released CITY WARS artifact. The exact segment beside that artifact is retained; the former remote landmark district and its extra frontage lots have been removed.

Flyover panels withstand scrapes and low-speed impacts, but fracture around 180 km/h for a square midspan impact and up to 280 km/h at a glancing angle; entry panels need half that impact, with an 85 km/h minimum. Vehicles can leave the broken edge and land below. The panels use one additional instanced draw call in the existing bridge update, react in the contact frame, and restore with rewind or a new run.

Tbilisi's five released artifact positions and orientations are now explicit stable data in `dist/tbilisi-event-sites.js`. Their banner IDs, road approaches, event collection rules and saved progress are preserved. Fixture checks compare all four cities against the previous public release. No profile migration or leaderboard reset is needed.

## Models and reference sources

| Landmark       | Reproduced features                                                                                                              | Visual reference                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Narikala       | Connected stepped stone curtain walls, crenellations, round turrets, embedded foundations and supported upper cable-car terminal | Existing Tbilisi scene and terrain                                                                                      |
| Heroes Square  | Curving concrete flyover, separated deck, piers, guardrails and central memorial with planted island                             | [CRP construction photographs](https://www.crp.ge/?full=project&lang=eng&page=full&project=38)                          |
| Freedom Square | Stepped stone base, fluted white column, gilded horse/rider/lance silhouette and historic city-hall frontage                     | [Freedom Monument photos](https://madloba.info/tbilisi/monuments-and-statues/freedom-monument/)                         |
| Axis Towers    | 37 storeys, opposite two-degree floor rotations, pale horizontal bands and dark glazed twin                                      | [Axis official description](https://axistowers.ge/en/company/about-us)                                                  |
| King David     | Two unequal rounded glass towers, white floor ribbons and roof crowns                                                            | [King David official site](https://kdr.ge/), [building photographs](https://korter.ge/en/king-david-residences-tbilisi) |

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

The Bank of Georgia now has a cleared 206 × 176 m surroundings reservation, an open
forecourt and a 30 m scenic road loop connected to the riverside esplanade.
