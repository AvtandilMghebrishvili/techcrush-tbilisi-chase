# Drift, rewards and fusion

## Open a level-clear box immediately

Clear six checkpoints and lose the police. The server saves your run and opens **one of the newly earned boxes in the same operation**. Three independent rewards then appear, with these choices:

- **Equip · Stronger** installs a higher-rarity part on the car used for the chase. The old part returns to your inventory. Comparison text shows the actual improvement.
- **Sell** exchanges that reward for its normal salvage value.
- **Continue** keeps any undecided rewards in your inventory for later use or fusion.

Identical drops are independent. Installing the first may make another equal drop a spare. A claimed drop cannot be sold or installed twice. Network retries reuse the operation ID. Closing the animation cannot discard rewards; they are already saved. Extra streak/quest boxes remain in the garage. Existing welcome boxes remain available.

## Five fusion stars per car part

Install a part first. Collect spare copies of **the same part and its currently installed rarity**, then press **Fuse** in that part's garage card. All fourteen parts support Bronze through Platinum.

| New star      | Additional spares consumed | Total spares consumed | Total extra base-part effect |
| ------------- | -------------------------: | --------------------: | ---------------------------: |
| + / ★         |                          5 |                     5 |                         +30% |
| ++ / ★★       |                         10 |                    15 |                         +50% |
| +++ / ★★★     |                         15 |                    30 |                         +70% |
| ++++ / ★★★★   |                         20 |                    50 |                         +90% |
| +++++ / ★★★★★ |                         25 |                    75 |                        +110% |

The installed part is retained and is not included in the spare count. Bonuses are relative to that part's base contribution, **not the entire car and not compounded**. For example, a Diamond engine normally adds 8 m/s top speed; Diamond+ adds 10.4 m/s, and Diamond++ adds 12 m/s. Other equipment contributions are unaffected.

Fusion is permanent tuning of **that car's part slot**. Replacing a Silver+ engine with a Gold engine retains the star, resulting in Gold+. The replaced Silver part returns as a normal spare; it does not duplicate the tuning. Another car has its own star progress. This makes collecting duplicates useful without discarding work when a better rarity drops.

For numerical stability, suspension's total landing-damage reduction is capped at 90%. Collision damage, flips and water recovery still apply. Platinum uses 4.5 effective base grades versus Diamond's 4, before stars. Paint and exterior rarity upgrades continue to use the existing detailed models; stars add performance tuning and a visible garage badge rather than new oversized body parts.

## Driving and pursuit

Space/handbrake releases rear traction progressively even with high-grip upgraded tires. Centre the steering to regain traction; reapply handbrake and steering for another turn. Drift requires forward motion (entry above 8 m/s, approximately 29 km/h). It sustains down to 6 m/s, with steering held, to avoid flicker near the entry threshold. Reverse and straight braking do not initiate a drift.

Space keeps controlling the car after clicking the camera or other toolbar buttons during a chase. Keyboard Shift and mobile one-tap Nitro can accompany a handbrake turn. Mobile thumb steering, pull-down drift and independent pointers remain supported.

Patrol target speed starts from the selected car's upgraded **normal** top speed and gains **20% of that base per extra level**. This is linear: ×1.0, ×1.2, ×1.4, and so on. A physical ceiling of **145 m/s** prevents runaway speed in endless levels. Corners, roadblocks, collisions, tank/SUV differences and ram recovery lower actual speed. Acceleration and tactical pressure scale separately.

Kutaisi begins with **six patrols**, with its first time-based reinforcement after 23 seconds at level 1. Tbilisi begins with four, with a 29-second interval. Later levels shorten intervals and increase counts, up to **22 retained units**. Faster police still use legal road/bridge routes and the existing water-fall/respawn behavior. Difficulty is deliberately higher; fast cars, armor, nitro and breaking line of sight matter.

## City and side-quest map

Press **MAP + SIDE QUESTS** beside the circular radar. Both cities show their full street network, river, numbered checkpoints, player position and street ramps. **S** selects the rooftop Skybox and **R** selects the river jump; each has a separate clickable marker and challenge card. The card identifies recommended speed, distance to the launch and whether its one-time box has been collected. Kutaisi challenges reward Platinum boxes.

Selecting a challenge sends arrows to its ramp approach, then the lip and landing/roof target. **Resume checkpoint route** returns to the main chase. Opening the map freezes the chase and timer; it does not leave a background rendering loop running.

## Four-minute lighting

Auto repeats morning → day/noon → dusk → night → dawn every **240 active simulation seconds**. Pausing freezes it and rewind restores its time. Level 1 starts at dawn; later levels use a deterministic shuffled dawn/night/day offset, so the same course has the same starting condition for everyone. Manual Day/Night/Dusk stays fixed. Lights, moon, windows and the existing brief shower effect are retained.

## Save and ranking compatibility

No database reset is required. Existing profile keys, city levels, cash, inventories, paint and parts survive. `cars[carId].stars[partId]` is optional; missing values mean zero. The server validates duplicate counts, caps stars, and commits inventory/equipment/cash changes with the existing versioned, idempotent API.

New driving rules use **Tbilisi course 1.16** and **Kutaisi course 1.1**. Prior time tables remain in the Course archive. The descriptive build-points field now adds installed grades and fusion stars, at most 140; it is not a claim that unlike builds have equal performance. Stock filters still require zero installed grades/stars.

## Suggested next community event

A weekly city time trial with a fixed loaner car would give new players and upgraded veterans equal equipment. A shared course seed, no-fusion event build and a separate weekly table could award a cosmetic community badge. This is a proposal, not an enabled mode in this release.
