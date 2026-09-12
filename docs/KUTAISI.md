# Kutaisi expedition

[Play the public game](https://nightshift-chase-september.avtandilmghebrishvili.chatgpt.site/). This city is available in version 1.15.0 and later.

## Unlock and travel

1. Clear Tbilisi levels 1, 2 and 3, including the police escape after the sixth checkpoint. A saved Tbilisi career showing level 4 or higher already qualifies.
2. Select **02 / KUTAISI** above the car selector, or use **KUTAISI UNLOCKED** on the finish screen. The server checks the unlock; opening `/?map=kutaisi` on a locked profile returns to Tbilisi with the requirement shown.
3. Kutaisi starts at its own level 1. Select Tbilisi again to continue its existing level. Neither city's level has a gameplay cap.

Cars, paint, fitted parts, spare parts, credits, ordinary boxes and Platinum boxes belong to the same saved garage. Each city has independent levels, achievements/streaks, best scores and race records. Public identity and privacy preference apply to both. The leaderboard's **City** selector switches Progress, High Score, Weekly and Level Times together. Unique player statistics count the same garage once across both cities; ranking denominators count the selected board's participants.

Switching cities first banks the current run using the normal Garage behavior, then reloads the page. A failed save prevents switching. Reloading releases the previous WebGL world, audio and navigation caches; both worlds are never held at once. The private garage key stays the same.

## Places and roads

The playable centre covers roughly 2.7 by 3.2 km, with 1,772 graph nodes and 2,058 road segments. Segments are pieces of streets, not 2,058 unique street names. The OSM snapshot includes Rustaveli Avenue, Tsminda Nino, Tsereteli, Gelati, Pushkin, David and Konstantine and adjoining streets. The asphalt union forms one connected surface.

Landmarks include Colchis Fountain and its gold figures, Lado Meskhishvili Theatre, Bagrati Cathedral, Opera and Ballet Theatre, Okros Chardakhi, Green Bazaar, the synagogue and royal-quarter architecture. The Rioni has a continuous shoreline, bank caps and seven mapped bridge decks. The White Bridge interpretation includes steel framing, blue panels and an original bronze boy holding two hats. Besik Gabashvili Park has a wheel and cable cars; boulevard and botanical-garden areas have planted lawns and collidable trees.

This is an **arcade reconstruction**, not a one-to-one survey or Google photogrammetry. Roads are widened, junctions simplified and traffic is bidirectional. The real pedestrian White Bridge accepts game cars. Building footprints are fitted from selected OSM lots or filled procedurally; facades, heights, river widths and landmark details are interpretations. Stunt service roads and the rooftop annex are original game additions. Regional sites outside this centre, such as Gelati Monastery and Motsameta, are not represented as exact destinations.

Google Maps and the supplied `referensi quCebis Qutaisi` photos informed the layout and visual details. Google tiles, satellite pixels, Street View frames and the reference photos are **not shipped**. Roads and building-derived data are © OpenStreetMap contributors, ODbL 1.0; see [asset provenance](../ASSETS.md).

## Platinum challenges

Use the in-game **ROUTE** selector to follow the same road arrows used for checkpoints. Four smaller street ramps provide ordinary jumps. Two larger challenges have special rewards:

| Challenge       | How to complete it                                                                                                      | One-time reward             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Platinum Skybox | Take the service-road run-up at about 200+ km/h, launch straight and land on the 14 m rooftop; drive through the crate. | 2,500 CR + one Platinum box |
| Rioni Gap       | Approach the marked ramp at about 220+ km/h, cross the water and land upright on the opposite service apron.            | 1,500 CR + one Platinum box |

Speeds are guidance, not a success button: alignment, launch speed, air rotation and the landing matter. Rewind can undo a bad approach; recovery is available if the car survives. Earned challenges are banked through normal run settlement. Closing the browser mid-run loses unbanked rewards. Repeating a completed challenge cannot farm additional boxes.

Each Platinum box rolls **three independent, equally likely part types**, all Platinum; duplicates are allowed. There are 14 types, the same categories as the existing garage. Open it with the separate **PLATINUM** button, inspect the actual fifth-grade assembly and install an owned part for free. Duplicate Platinum parts sell for 1,400 CR each. Platinum cannot be bought as a regular next-tier upgrade. Ordinary boxes retain Bronze 55%, Silver 28%, Gold 13%, Diamond 4% odds.

Platinum's stat contribution is 4.5 tier units versus Diamond's 4, giving a modest improvement without doubling performance. Rims, tires, brakes and spoiler also update the car's exterior. The stock/tuned timing filter includes Platinum-equipped cars as tuned; the build total can reach 70 points. Existing Diamond cars retain their exact performance.

## Shared driving and conditions

Keyboard, touch, auto gas, latched nitro, gyro, drift, damage, police collisions, water recovery and five-second rewind work as in Tbilisi. Police receive the same bounded difficulty curve: SUVs and a helicopter from level 2, tanks from level 3, then later sport interceptors. There is no separate easy-mode physics. Auto lighting uses the same fair dusk/night/day sequence and subsequent deterministic shuffled bags. Manual lighting still works.

## Rebuild and extend

- `data/kutaisi-osm-raw.json` and `data/kutaisi-buildings-raw.json` are archived Overpass responses. `python scripts/build-kutaisi.py` deterministically generates the road graph and landmark/lot anchors.
- `node --input-type=module -e "globalThis.location=new URL('http://localhost/?map=kutaisi'); await import('./scripts/build-road-surface.mjs');"` rebuilds the joined road/sidewalk surface.
- `dist/map-selection.js` owns map IDs, the unlock and course versions. Thin data modules import only the selected city. `kutaisi-city.js` owns its original visual geometry; `kutaisi-district-data.js` and `kutaisi-world-sites.js` provide the matching solids and stunt sites.
- `maps.kutaisi` is additive profile data. The top-level `level` and `community` remain Tbilisi for older clients. `city_rankings` is added by migration 0005; existing tables and rows are retained. Run tickets bind city, course, level and equipment; settlement updates garage, city ranking and times atomically.
- Keep daily/level timing routes deterministic. If a future edit materially changes a timed city's course, introduce a new course ID and retain the old records.
- Run `npm test`, `npm run build` and `npm run check:build`. See [validation](../VALIDATION.md) for browser and actual-physics checks. Do not delete the authored `dist/` directory.

References: [Google Maps, Kutaisi centre](https://www.google.com/maps/@42.269,42.703,15z), [Georgia Travel: Kutaisi](https://georgia.travel/cities-towns/kutaisi), [White Bridge](https://georgia.travel/the-white-bridge), [Kutaisi tourism: Picasso Boy](https://kutaisi.travel/en/7495/picaso-boy-ka-2-2/), [Royal District](https://georgia.travel/kutaisi-royal-district).
