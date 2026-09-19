# Rustavi private map

Rustavi is a reference-informed, compressed arcade reconstruction. It is not a
photogrammetric or exact-scale digital twin. Real street topology is adapted to
the game's vehicle sizes and existing chase physics.

## World contents

- Civic square with the enlarged hollow diamond **რუსთავის ახალი ძეგლი** at the
  starting area, city hall and theatre interpretations.
- Horses monument, Shota Rustaveli memorial and industrial chimneys.
- Mtkvari river, physical banks and mapped bridge crossings.
- Highway and connected urban streets linking old and new districts.
- Actual Rustavi International Motorpark circuit outline and pit lane, with an
  opened access gate for arcade driving, pit building and grandstand.
- Service Agency / driving academy area with marked parking bays, slalom cones,
  stop line and a physically driveable hill-start ramp.
- Steelworks rooftop launch and a one-time Platinum Skybox reward; four further
  street ramps; existing TECHCRUSH sponsor and cash banners.
- The same cars, tuning, police scaling, traffic, sound, collisions, rewind,
  checkpoints, day/night cycle and saved garage as the other cities.

The extracted street graph has **1,902 nodes and 2,587 segments**. It is connected
and includes 44 Motorpark/pit segments. Thirteen mapped bridge pieces support
crossing the river. Road and building placement use shared clearance geometry;
landmarks are shifted when needed to avoid roads or each other. Such shifts,
widened lanes and compressed distances are deliberate gameplay adaptations.

## Sources

- Owner-supplied photos: `Challenge/` (kept private and excluded from Git).
- Owner's [Google Maps reference](https://maps.app.goo.gl/8WoMZVod2EyBEhKx7), used
  to inspect the civic square and compare the satellite street layout.
- [OpenStreetMap](https://www.openstreetmap.org/copyright): public OSM API
  snapshot dated 19 September 2026 supplies redistributable road/river geometry.
  Adaptations remain under ODbL 1.0. No Google tiles or Street View photos ship
  as game textures.
- [Rustavi International Motorpark](https://rim.ge/) for track context.
- [Service Agency](https://www.sa.gov.ge/contact) for the exam site context.
- [Rustavi municipality](https://rustavi.gov.ge/contact/) for civic context.
- [Rustavi Drama Theatre reference](https://georgiantravelguide.com/en/rustavi-drama-theater)
  for theatre location and appearance.

The landmarks are original procedural meshes built from these visual references.
They reuse the existing material, night-light and batching systems. The four
prize WebPs are optimized copies of the actual packaging photographs supplied
by the owner; their brands retain their own rights.

## Rebuilding

Normal builds do not access a mapping service. The compact source snapshot is
`data/rustavi-osm-raw.json` (about 1.6 MB), containing road/river ways only.
Raw XML and failed temporary downloads are archived under ignored `artifacts/`.

```powershell
python scripts/fetch-rustavi.py   # Optional: refresh the cached OSM source
python scripts/build-rustavi.py
node --input-type=module -e "globalThis.location=new URL('http://localhost/?map=rustavi'); await import('./scripts/build-road-surface.mjs')"
npm test
npm run build
npm run check:build
```

The generator selects a bounded connected network, simplifies near-collinear
segments, keeps bridges from source tags and projects about half-scale distances.
`rustavi-district-data.js` defines landmark placement and collision footprints;
`rustavi-city.js` creates visual geometry. `rustavi-world-sites.js` shares stunt
positions between rendering, navigation and physics. Never delete `dist/`: it
contains authored game source. Only `dist/client` and `dist/server` are generated.

## Validation

Automated tests check connected routing; dry street and bridge support; physical
bridge driving in both directions; road/building and landmark clearance; legal
checkpoint routes; a clear starting lane; drift and pursuit behavior; high-speed
rooftop collection; failed slow approaches; high-end ramp collision; and rewind
of the reward. Browser checks cover private startup, a saved event run and its
ranking, night/day rendering, map changes and compact mobile event cards.

Performance uses the existing static batches, spatial collision queries, bounded
route caches, resource disposal and inactive-tab suspension. No extra persistent
renderer, service worker or manual asset cache is introduced. Hardware-specific
frame rates are not guaranteed by these tests.


## Civic district and navigation revision — 19 September 2026

The private preview now includes Heroes Square as a separate place from the original New Monument square. Its position follows OSM memorial node 9995976090 and square way 1329069774. The uploaded aerial references define the white octagonal plinth, four curved fins, turquoise glass core, long planted median, cream/red apartment wings, benches and lamps. City Hall has five recessed arches, side wings, cornice, pediment, clock, Georgian flag and patterned forecourt. These are original, game-scale 3D interpretations, not a photographic or survey-accurate reconstruction.

Source geometry: https://www.openstreetmap.org/way/1329069774 and https://www.openstreetmap.org/node/9995976090. The project's existing OSM snapshot is used; no third-party map tiles or the owner's original photographs are shipped as game textures. The Heroes approaches use narrower lanes, and the divided carriageways are offset outward with tapered joins to retain the photographed median within the half-scale game world. The square surface, traffic island and collider use shared authored coordinates. Ordinary building placement reserves this neighbourhood. More residential roads connect the district to the rest of the city.

Private starting points (loopback server must be running):

- http://127.0.0.1:4191/?map=rustavi&preview=heroes
- http://127.0.0.1:4191/?map=rustavi&preview=hall
- http://127.0.0.1:4191/?map=rustavi (original monument)

The alternate spawns are restricted to loopback hostnames; owner-only preview links require the private server's previewAccess flag. Public hosting and GitHub remain unchanged.

### Navigation

Open **MAP + SIDE QUESTS**. Click/tap a place to pin its nearest street. Cyan checkpoint guidance stays active while a separate yellow route follows the pin or selected stunt. **CLEAR PIN** removes only the secondary guidance; **RESUME DRIVE** keeps the pin. Rustavi has direct landmark buttons. Zoom and drag never set a new pin; on a focused map, arrow keys pan and Enter pins its centre.

The circular minimap rotates with the vehicle: forward is always up, with north moving around the rim. The full planning map remains north-up; its player triangle shows the car's actual heading. Distance and arrows share cached street routes. The full map redraws on interaction and pauses the chase; no new animation loop, WebGL context, timer or persistent route cache was introduced. Both 3D guidance ribbons reuse fixed mesh pools. Civic meshes use spatial static batching, tree instances, and the existing bounded light system.

Validation for this revision: all 243 automated tests passed. The production build and asset-integrity check passed. Browser checks covered both new starting locations, the five City Hall arches, the monument and planted medians, custom pins, landmark shortcuts, zoom/drag without accidental re-pinning, simultaneous cyan/yellow guidance, and cockpit readability at 390 × 844. The full map had no horizontal overflow at that width. The preview listener was verified as 127.0.0.1:4191, returning HTTP 200. These checks do not claim survey accuracy or a measured frame-rate guarantee on every device.

## City Hall open plaza revision

The hall now fronts a 116 × 90 game-metre paved civic square. The new hollow
diamond monument was relocated onto the hall's entrance axis, 42 metres from its
centre. Heroes Square's turquoise memorial stays in its original island. Generic
buildings, trees, sponsor props, grass and lamps reserve the civic forecourt. A
single repeated procedural paving texture reproduces the circular pattern of the
owner's photograph; existing street connections remain driveable as a level
shared-space approach. Tire-height support follows the visible paving. This is an
authored game layout requested by the owner, not a claim of survey accuracy.
