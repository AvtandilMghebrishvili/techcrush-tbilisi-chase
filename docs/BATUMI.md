# Version 2.0: Georgian City Chase

Tbilisi, Kutaisi and Batumi can be selected immediately from the launch menu. Each city keeps its own level, course records, pursuit history and leaderboard. Money, parts and owned cars belong to one garage. Switching cities reloads the world so its WebGL resources can be released.

## Batumi map

The playable street network follows an adapted OpenStreetMap snapshot, projected around 41.640 N, 41.621 E. It has 1,665 connected nodes and 2,137 road segments. Streets are widened, paths made drivable and intersections simplified for arcade chases. Buildings are generated beside the road surface, not traced property by property. This is an original game interpretation, not an exact Google Maps replica.

The Black Sea coast has a boulevard, palms, gardens, the Alphabet Tower, Ali & Nino, a panoramic wheel, lighthouse, Europe Square/Medea, Piazza, Chacha Tower, landmark hotel silhouettes, twin towers and dancing fountains. A distant airport includes a terminal, control tower, runway and aircraft. Landmarks use simplified original geometry and adapted placement where necessary to keep the road clear. The airport is scenery beyond the playable boundary.

Police use the same pursuit, road navigation, collision and water recovery systems as Kutaisi: six initial patrols, escalating roles, level-based speed and bounded population. The roof challenge appears on the quest map and awards a Platinum box. Ordinary ramps and checkpoints share the existing simulation.

Rebuild the archived geography with Python 3 and installed npm dependencies:

```sh
python scripts/build-batumi.py
node --input-type=module -e "globalThis.location=new URL('http://localhost/?map=batumi'); await import('./scripts/build-road-surface.mjs');"
```

See [asset provenance](../ASSETS.md) for ODbL attribution and visual references. Generated road and surface modules are checked in; these scripts are not required to play or deploy.

## Cars and rewards

The original four cars remain available. As of **2.4**, reaching level 10 in **any** city automatically opens Falcon RS, Rioni GT and Coast X everywhere. Reaching level 15 opens TECHCRUSH. Every fifth reached city level grants a Mystery box and a Special box, each containing coins and three high-grade parts. Reaching level 10 means clearing level 9.

Every 10 cumulative banked patrol takedowns still earn a Creator box: three independent parts, each equally likely to be Platinum, Emerald, Ruby or TECHCRUSH. Platinum fits all cars; the three higher grades fit TECHCRUSH only. Store exclusive parts until level 15, or sell extras. Existing fusion and customization remain unchanged.

Schema 6 preserves previously unlocked cars and old earned/unclaimed city-car boxes, then grants missed five-level rewards once per city. New profiles use the level-10/15 rules. [Full reward and migration guide](MILESTONES.md). Keep the private garage key to retain access to your server-saved progress.

## Driving, audio and presentation

- Setup exposes steering sensitivity (70–130%) and drift strength (65–140%), plus Reset Classic. Keyboard and touch/gyro share these values.
- The restored handling removes the recently added extra cornering scrub. Grip, speed, braking and drift hysteresis still affect the car.
- Wheel presentation samples asphalt and kerb height under the tires without changing physics, jump height or the water-fall state.
- Auto is the default lighting mode. Active simulation runs a full 180-second night → dawn → day → dusk → night cycle; pause freezes it and rewind restores it. A saved manual choice remains respected.
- Original loop music defaults on after the first click/key/touch allowed by the browser. M or Sound mutes all audio; Setup controls music volume and resets its playback/settings. Hidden tabs, pause and dialogs suspend playback.
- The launch menu shows each city’s next five-level bonus, mystery rewards, car requirements, coin balance and clearer Play/Garage/Leaderboard actions. Completion panels show graphical reward tiles.

## Visual sharing and runtime cost

Public result pages expose a 1,200 × 630 PNG card, including Georgian player names, city, car, time and score. Share opens the existing Facebook share flow; Save Image downloads the card. The player still decides whether to publish the post. Social networks may cache previews. Private/unlisted results do not expose cards.

PNG cards render server-side only when requested, using native compression and raster glyph artwork; there is no browser screenshot service, font download or new runtime dependency. Batumi uses static geometry batches, instanced palms and the existing active-game animation loop. Street lamps are spatially batched on all maps; per-lamp breakage remains supported. No quality preset was lowered for this update.

## Validation

`npm test` covers migration, independent city scores, milestone idempotency, all eight cars, high-grade limits, public/private result images, Batumi road connectivity and clearances, checkpoint routes, water behavior, drift and tire support. Browser QA exercises every city, car reveals, creator loot/equip, mobile layout, driving, settings, audio lifecycle and stopped rendering on pause. Build with `npm run build`, then validate the artifact with `npm run check:build`.

Release verification on 13 September 2026: **195 tests passed**; the production asset check passed with 22 runtime assets unchanged byte-for-byte. Headless Chrome exercised driving on all three maps, all three city-car reveals, creator loot and grade-8 rim installation, music start/mute/pause/reset, and pause rendering. The built client was checked at 390 × 844: no horizontal overflow, matching 166 × 56 Garage/Leaderboard buttons, visible coin balance, and working return to city selection. No browser exceptions were reported. These are functional desktop/emulated-phone checks, not a claim of measured performance on every physical mobile device.
