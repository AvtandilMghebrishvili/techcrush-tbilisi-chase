# Vehicle fleet and fitted upgrades — 2.5

The Original 458 retains its licensed model. All other models are original game
geometry and are not official reproductions or manufacturer-endorsed vehicles.

| Saved ID | Vehicle | Body/class | Stock speed |
|---|---|---|---|
| classic | Original 458 | Heritage sports car | 230 km/h |
| gt | Apex R | Rounded rear-engine coupe, oval lamps | 209 km/h |
| rally | Vector V12 | Low wedge, V-shaped lights, factory wing | 241 km/h |
| suv | Veyra W16 | Wide luxury hypercar, C-shaped intake trim | 270 km/h |
| falcon | Falcon RS | Tall rally hatch, twin lamps, factory wing | 263 km/h |
| rioni | Rioni GT | Long hood, rearward cabin, wide grille | 277 km/h |
| coast | Coast X | Open speedster, roll hoops, slim lamps | 288 km/h |
| creator | TECHCRUSH Cyber | Faceted electric pickup, covered bed, light bars | 302 km/h |

Cyber replaces the YouTuber car under the same `creator` ID. It remains unlocked
at level 15 in any city, preserves earlier legitimate ownership and accepts all
previously installed signature parts. Original vehicle speeds are unchanged.
Cyber's stock top speed is 5% above Coast X; acceleration is 38 m/s², handling
1.08 and damage scale 0.62. The common tuned ceilings remain 145 m/s normal and
45 m/s additional boost. Electrical boost retains the existing controls, charge
and motion effects; there are no combustion exhaust outlets or flames. Its voice
uses a continuous single-speed motor whine, with combustion recordings muted.

## Rewards

New Cyber chases earn 2× points and coins. Points are multiplied in simulation so
the HUD, feedback and final result agree. Credits are independently reconstructed
from verified counters by the save server. This includes patrol/traffic wrecks,
checkpoints, roadside rewards, escape/clear cash and newly earned stunt/daily/
achievement cash. Cash banners therefore yield 8,000 and ordinary decorations
50 coins for Cyber, under the same per-run count limits. Other cars keep 4,000/25.
Boxes, drop odds, inventory sales and buying costs do not multiply.

The server stamps `rewardVersion: 1` on new run tickets and derives the bonus
from the ticket's car. It does not trust a client-supplied multiplier or the car
currently selected in the garage. Already active old-version tickets retain
their original rate. Settlement retries cannot pay a second time. Historical
scores/times are retained rather than rewritten; the time leaderboard already
records the car/build for each clear.

## Exterior and cabin consistency

`vehicle-designs.js` defines the coupe/hatch/GT/speedster shapes.
`cyber-pickup.js` creates a separate faceted pickup body. `car-models.js` samples
each procedural shell for lamps and fittings. All factories are shared between
the actual chase, garage studio and generated menu thumbnails.

`customization.js` owns one rear-wing assembly and one replacement wheel kit per
car. A new wing replaces factory aero, including its supports. Higher grades
change span, height, end plates and finish; they never add a second whole wing.
The mount uses that model's deck height and length. Replacing a kit disposes its
owned geometry/materials. Wheels retain their hubs and rolling radius, calipers
stay outside wheel rotation, and the original 458 keeps stock wheels at grade 0.

EV drivetrain labels adapt to motors, controller, battery and inverter while
keeping the same inventory IDs and numerical upgrade rules. No save conversion
or destructive migration is needed. Internal part illustrations remain workshop
representations; installed external wheels/tires/brakes/spoilers are visible on
the vehicle itself.

## Validation

`tests/fleet.test.mjs` covers kit replacement/repeated grades, finite geometry,
wheel support/steering hubs, class silhouettes, no electric exhaust, continuous
EV telemetry, bounded tuning, 2× rewards in all cities, old ticket compatibility,
preserved equipment and retry safety. The complete suite has 217 passing tests.
Local Chrome checks exercise actual garage preview/equip, saved equipment across
city reloads, new run tickets, driving, cockpit, matching fitted aero and
390×844 mobile layout. These are desktop/emulated mobile checks, not
physical-phone FPS measurements.
