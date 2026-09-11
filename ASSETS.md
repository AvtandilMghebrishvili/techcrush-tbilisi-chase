# Asset provenance — daylight edition, 11 September 2026

## Sports car

The selectable Apex R, Vector V12 and Veyra W16 are original unbadged procedural models in `dist/car-models.js`, with separate bodies, cabins, wheel layouts and upgrade geometry. No manufacturer model or trademark is represented by these new meshes. Version 1.1.1 restores the licensed 458 as the fourth selectable car, named Original 458.

`dist/assets/ferrari.glb`: Ferrari 458 model by [vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6), provided through the [official Three.js car example](https://threejs.org/examples/webgl_materials_car.html), attributed under CC BY 4.0. The [WorldCoder provenance table](https://huggingface.co/datasets/shuolucs/WorldCoder-Bench) also identifies this file as CC BY 4.0. The original Sketchfab detail endpoint was unavailable during this update.

`dist/assets/sports-car.glb` is the decoded, welded and simplified derivative: approximately 307,393 triangles versus 358,788 originally. Version 1.0 used this base for all three trims; version 1.1.1 makes it independently selectable with paint, rim/wing upgrades and corrected steering animation. The original input is retained for reproducibility. Vehicle names/marks are not project-authored assets and do not imply manufacturer endorsement.

The police sedan and civilian modern sedan, classic 1980s/1990s sedans, wagon and hatchback are original unbranded geometry in `dist/patrol-car.js`. Georgian police panels, emergency lighting, push bar, mirrors, wheel details and chrome trim are authored in code. Occasional sports traffic now uses the original procedural sports-car geometry.

## Solid 3D trees

`tree-near.glb` and `tree-far.glb`: [Tree Small 02](https://polyhaven.com/a/tree_small_02) by Rico Cilliers / Poly Haven, [CC0](https://polyhaven.com/license). `scripts/prepare-tree.mjs` fetches Poly Haven's current manifest, records it in `data/tree-source.json`, then downloads original geometry and 1K maps. Rebuilding requires network access and may use an updated upstream asset; the checked-in optimized files preserve this release. Derivatives have 123,246 and 20,943 triangles; leaf islands are expanded after simplification to retain canopy coverage. Wind, distance switching, trunk collisions, falling and stumps are runtime additions. These replace the earlier flat tree cards; `plane-tree.png` below is retained only as a historical asset.

`ferrari_ao.png` is the contact-shadow texture from the same example. Its grayscale is interpreted as shadow opacity by the renderer. The original image is unchanged.

## Sky and mountain materials

`daylight.hdr`: [Kloofendal 48d Partly Cloudy](https://polyhaven.com/a/kloofendal_48d_partly_cloudy), Greg Zaal / Poly Haven, CC0, 1K. Used for sky and environmental lighting; it is not a photograph of Tbilisi.

`hills-diff.jpg` and `hills-nor_gl.jpg`: [Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02), Rob Tuytel / Poly Haven, CC0, 1K. Mapped to original Tbilisi-inspired terrain geometry.

## Street geography

`dist/road-data.js`, `dist/road-surface-data.js` and OSM responses in `data/`: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Overpass snapshot: 2026-09-11. Adaptations: local metre coordinates, simplified junctions, selected connected roads, widened lanes, bidirectional game traffic and reopened construction roads. The road surface unions those widened roads into continuous asphalt with sidewalk differences. Derived data is downloadable from the credits page; original responses are included in the source archive.

## Expanded district references

The 19 images in the user's local `referensi quCebis` folder were inspected for street alignment, bridge railings, Rike paths and the twin tubes, Europe Square's oval/flags/floral clock, brick bath domes and the blue bathhouse facade. The folder is deliberately excluded from the distributed source and game; it is reference material, not a texture atlas or scan.

Original geometry in `tbilisi-districts.js` interprets those references. Geographic anchors and architectural identities were cross-checked against [Fuksas — Rhike Park](https://fuksas.com/rhike-park/), [AMDL Circle — Bridge of Peace](https://amdlcircle.com/en/projects/bridge-of-peace/), [Georgia Travel — Rike Park](https://georgia.travel/family-attractions/rike-park), [Georgia Travel — Abanotubani](https://georgia.travel/abanotubani-in-tbilisi), [Chreli Abano](https://chreli-abano.ge/?lan=en) and [Georgian Travel Guide — Baratashvili Bridge](https://georgiantravelguide.com/en/nikoloz-baratashvili-bridge). The twin forms are the music-theatre/exhibition complex, not boat docks.

Live map API requests for the expanded area returned rate-limit/access errors. The game therefore combines the archived OSM streets with explicitly approximate, hand-authored connections in `data/reference-streets.json`. That file includes provenance, road widths, polylines and Europe Square's ellipse. The river shoreline and landmark dimensions are also approximate and adjusted to keep roads connected and playable. There is no claimed 1:1 geographic, facade or traffic accuracy. No Google satellite pixels, Street View frames or Google 3D tiles are shipped.

Masonry joints, bathhouse mosaic, lawn grain, pavement and EU flags are original procedural Canvas textures in the source. Existing CC0 aerial-rock textures cover original hills and muted ground. Tree crowns are widened and varied in color at runtime. TECHCRUSH billboards have two separately oriented front-facing planes, so the original logo and wordmark read correctly on either side.

## Higgsfield images (retained)

Generated through the connected Higgsfield plugin, GPT Image 2, 1K, on 11 September 2026. Generated assets remain subject to the account's applicable Higgsfield terms.

| File             | Generation ID                          | Use                                                                                                                                                       |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limestone.png`  | `1948130f-bf8a-482b-baf0-291215852f7f` | Four-floor repeating limestone facade                                                                                                                     |
| `road-day.png`   | `a0cad2a4-3ecf-476e-a92b-dab7edf06dbd` | Worn daylight asphalt, diffuse and subtle bump shading                                                                                                    |
| `plane-tree.png` | `08475ffc-e484-4b55-9f13-5a32bb602957` | Photographic-style tree billboard. The returned RGB image has a pale matte; the game shader discards pale background pixels. The source PNG is unchanged. |

Historical generated artwork is retained: `building.png` (`dae972ad-71bf-4ba7-be75-5740856a85d7`), `asphalt.png` (`7b3617d5-a2f4-43e1-93d4-d188f56ba0c9`), `paint.png` (`64443110-fc69-4b18-814f-235571110a6f`), `city-reference.png` (`64598333-b303-4873-9776-9210f11a4869`) and `old-tbilisi.png` (`dbd9eba3-f1d8-465b-a565-884a2df51493`). These are not images of current gameplay.

## User assets and original geometry

`techcrush-logo.jpg` and `techcrush-wordmark.png` are unchanged copies of the user's logo and lettering, excluded from the code's MIT license. Surrounding screenshot UI is omitted only at display time.

The supplied Google Street View screenshot of 12 Nikoloz Baratashvili St guided the clock, pale stone, cornices and broad-street appearance. It is not copied into the game. The clock building is an original approximate 3D interpretation; no Google Maps imagery or 3D tiles are redistributed.

The user's Kartlis Deda photo guided the original model in `kartlis-deda.js`: raised bowl, lowered arm with horizontal sword, paneled dress, headdress and silver surface. The mesh is enlarged for skyline visibility, not a scan. The photo is not redistributed.

Georgian flags, tower, mountains, road furniture, TECHCRUSH signs and game effects are authored in the source. Three.js version 0.180.0 is MIT, with `dist/vendor/THREE-LICENSE.txt`. Model-preparation dependencies are development-only and locked in `package-lock.json`.

## Garage and cover artwork — 12 September 2026

`dist/assets/garage-parts-atlas.png` is an original imagegen-generated 1,254 × 1,254 studio atlas. The first fourteen cells depict the actual upgrade categories; CSS selects cells without altering the source image. Rarity colors, counts and benefits are live UI, not baked into the artwork. The prompt is retained in `docs/assets/garage-parts-prompt.txt`.

`dist/assets/tbilisi-cover.png` is the previously generated 1,672 × 941 TECHCRUSH cover, reused unchanged on the mission card and garage. The prompt is retained in `docs/assets/tbilisi-cover-prompt.txt`. It is illustrative key art, not a screenshot or a promise of pixel-identical game rendering. Generated media and TECHCRUSH marks are separate from the MIT-licensed code; use is subject to applicable generation-service terms and the brand owner's rights.

The new SUV variant, tank, helicopter and inflatable checkpoint arches are original procedural Three.js geometry in `patrol-car.js`, `pursuit-vehicles.js` and `checkpoint-arch.js`. No external vehicle model or new map imagery was used for those additions.

## Driving audio — 12 September 2026

The eight files in `dist/assets/audio/` are processed CC0 audio:

- `engine-bed.wav`: loop 0 from [Racing car engine sound loops](https://opengameart.org/content/racing-car-engine-sound-loops), **domasx2**, CC0. The source page describes a remade public-domain sample.
- Metal hits (two), wood hits (two), plank snap, mining/stone impact and glass impact: [Impact Sounds 1.0](https://kenney.nl/assets/impact-sounds), **Kenney**, CC0. Source member names and hashes are in `data/audio-sources.json`.

Run `python scripts/prepare-audio.py` from the repository root with Python 3 and FFmpeg installed to reproduce the derivatives. The script verifies the reviewed download hashes, converts to mono 24 kHz PCM16, removes leading silence from impacts, normalizes peaks and crossfades the engine loop. Output encoding may vary slightly with FFmpeg versions; checked-in assets and their hashes identify this release. Total runtime audio is 188,524 bytes. [CC0 public-domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).

`audio-model.js` and `chase-audio.js` add original synthesis, filtering, playback-rate modulation, stereo positioning and mixing. V8, flat-six, V12 and W16 describe fictional game sound profiles; no claim is made that these are recordings of four specific production cars. Wind, passing air, turbo air, sirens and rotor texture are generated at runtime.

## Damage and destruction — 12 September 2026

`vehicle-damage.js`, `damage-state.js` and `crash-effects.js` are original code. Panel deformation operates on private runtime copies of existing car geometry; the licensed original GLB and other source assets remain unchanged. Glass cracks and scuffs are line geometry projected onto each model. Fire/smoke opacity is an original procedural DataTexture, and debris consists of original bent polygon fragments. No additional downloaded imagery, vehicle models or audio files were introduced. The revised crash/explosion mix continues using the CC0 recordings and original synthesis credited above.
