# Asset provenance — daylight edition, 11 September 2026

## Sports car

`dist/assets/ferrari.glb`: Ferrari 458 model by [vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6), provided through the [official Three.js car example](https://threejs.org/examples/webgl_materials_car.html), attributed under CC BY 4.0. The [WorldCoder provenance table](https://huggingface.co/datasets/shuolucs/WorldCoder-Bench) also identifies this file as CC BY 4.0. The original Sketchfab detail endpoint was unavailable during this update.

`dist/assets/sports-car.glb` is the decoded, welded and simplified derivative: approximately 307,393 triangles versus 358,788 originally. The original input is retained for reproducibility. Custom paint, track spoiler, animation and fictional game tuning are applied at runtime. All three trims share this base model. Vehicle names/marks are not project-authored assets and do not imply manufacturer endorsement.

The police sedan and civilian modern sedan, classic 1980s/1990s sedans, wagon and hatchback are original unbranded geometry in `dist/patrol-car.js`. Georgian police panels, emergency lighting, push bar, mirrors, wheel details and chrome trim are authored in code. Occasional sports cars in traffic use the credited 458 asset.

## Solid 3D trees

`tree-near.glb` and `tree-far.glb`: [Tree Small 02](https://polyhaven.com/a/tree_small_02) by Rico Cilliers / Poly Haven, [CC0](https://polyhaven.com/license). Original geometry and 1K maps are downloaded by `scripts/prepare-tree.mjs` using the manifest in `data/tree-source.json`. Derivatives have 123,246 and 20,943 triangles; leaf islands are expanded after simplification to retain canopy coverage. Wind, distance switching, trunk collisions, falling and stumps are runtime additions. These replace the earlier flat tree cards; `plane-tree.png` below is retained only as a historical asset.

`ferrari_ao.png` is the contact-shadow texture from the same example. Its grayscale is interpreted as shadow opacity by the renderer. The original image is unchanged.

## Sky and mountain materials

`daylight.hdr`: [Kloofendal 48d Partly Cloudy](https://polyhaven.com/a/kloofendal_48d_partly_cloudy), Greg Zaal / Poly Haven, CC0, 1K. Used for sky and environmental lighting; it is not a photograph of Tbilisi.

`hills-diff.jpg` and `hills-nor_gl.jpg`: [Aerial Rocks 02](https://polyhaven.com/a/aerial_rocks_02), Rob Tuytel / Poly Haven, CC0, 1K. Mapped to original Tbilisi-inspired terrain geometry.

## Street geography

`dist/road-data.js`, `dist/road-surface-data.js` and OSM responses in `data/`: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Overpass snapshot: 2026-09-11. Adaptations: local metre coordinates, simplified junctions, selected connected roads, widened lanes, bidirectional game traffic and reopened construction roads. The road surface unions those widened roads into continuous asphalt with sidewalk differences. Derived data is downloadable from the credits page; original responses are included in the source archive.

## Higgsfield images

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
