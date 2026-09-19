# City facade sponsors and Robotics monuments

All four cities carry large Robotics and TECHCRUSH facade banners. The supplied
ROBO BATTLE 2026 artwork keeps its complete aspect ratio and readable logos. Some
banners fold across a roof edge with an additional fabric margin, so the fold
does not crop the actual poster. TECHCRUSH uses its supplied avatar and original
typeset promotional copy.

## Placement and artwork

Placement is deterministic and follows each city's drivable road length. Tbilisi
has 78 facade banners; Kutaisi, Batumi and Rustavi each have 78 too (three times
the previous 26). Each city has three repair sites: levels 1–4 activate one,
levels 5–9 activate two, and level 10 onward activates all three. Brands alternate across the selected sites.
One site is near the starting district; subsequent sites maximize coverage.

Banner faces point toward the street and fit the selected building. Landmark
facades are excluded. Gear sites have an open approach from the road and avoid
the carriageway, buildings, trees, existing sponsor boards, protected stunt areas,
water and mountains. They are about seven metres tall, larger than the cars.

The eight rounded teeth and central hole are traced from the supplied logo. Its
dominant interior pixel color is **#F2394B**. The monuments turn slowly and use
emissive material plus a colored pedestal rim to remain visible at night.

## Finding and collecting repairs

Open **Map + Side Quests → GRA / SPONSORS**. Pink GRA pins locate ROBO BATTLE
posters, cyan TC pins locate TECHCRUSH facade banners, and gold gear pins locate
full repairs. Tap any pin for yellow waypoint guidance. Checkpoint arrows remain
active. The overlay is off by default to keep the driving map uncluttered.

Driving into a gear restores the player's HP to **100%** and removes body dents
immediately. Each monument grants one repair per run, with a short collection
animation and reward sound. A car already at full health does not consume it.
NPCs cannot consume repairs. Rewind restores both the monument and its previous
health state; starting a new run restores all monuments. Repairs award no money,
score or event artifacts and do not change existing prize rules.

## Performance and ownership

- One 1280-pixel WebP poster (about 225 KiB), shared by every Robotics facade.
- One shared 1024-pixel canvas for all TECHCRUSH facades.
- Shared gear, pedestal and rim geometry/materials across the selected city.
- Placement uses the existing spatial index; it is computed once per map load.
- Gear animation runs in the existing renderer and is skipped beyond 500 metres.
- No extra animation loop, interval, point light, shadow map or persistent cache.
- Scene and asset-scope disposal own all textures and geometry on city switches.
- Existing career data, event artifacts and cash-banner IDs are unchanged.

`scripts/build-robotics-art.py` reproduces the optimized poster and traced logo
data from the owner-supplied JPGs in the ignored `Challenge` folder. It requires
Pillow. The game uses only the resulting small runtime assets, not the originals.

See `tests/city-branding.test.mjs` for all-city clearance, density, facade-fit and
logo geometry checks.

## GREX pulse and branded supplies

The owner-supplied GREX artwork appears on all rooftop secret crates and the special
supply card. Its green dinosaur silhouette is traced into one shared extruded mesh
with its real eye opening and sampled color **#E1FE28**. Three roadside monuments
per city glow through emissive material; they use no extra lights or render loop.
The texture is a shared 768px WebP of approximately 5.4 KiB.

Each monument can be used once per run. Contact costs **50 HP** (it can wreck a car
with 50 HP or less), destroys existing patrols including tanks, and brings down the
helicopter. Normal takedown awards apply. After **8 seconds of simulation time**,
patrols return on separated, collision-checked roads around the player and converge
on their position. Reinforcements are suppressed during that window. Rewind restores
health, rewards, monuments, police, helicopter and the return deadline together.
The map's sponsor overlay labels this risk before a driver chooses the waypoint.

Repair pedestals state "Gift from Georgian Robotics Association". Full map icons
and a compact location legend cover city landmarks, with descriptions and yellow
waypoint navigation. Event artifact identities and placements remain untouched.

## Driving and cable cars

Water falls retain horizontal launch momentum above the waterline; drag starts at
contact with the water, and the splash uses the actual landing position. Bridge
panels use shared incidence-aware rules in every city: midspan square impacts need
about 180 km/h and glancing impacts approach 280 km/h. Entry panels need half that,
with an 85 km/h minimum and protection against shallow scrapes.

Tbilisi and Kutaisi cable-car cabins and cables use the same sagging path. Cabins
stay attached by their hanger, smoothly reverse at stations, and carry small square
GRA/TECHCRUSH posters below the windows. Geometry/materials are shared and disposed
with the city. No new timers or background rendering are introduced.
