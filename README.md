# TECHCRUSH — Tbilisi Chase

## [▶ PLAY ONLINE — open to everyone](https://nightshift-chase-september.avtandilmghebrishvili.chatgpt.site/)

Play directly in your browser — no installation or sign-in required. Share the link with friends; each browser gets its own saved garage.

Menus, pause screens and finished chases now stop continuous rendering and audio processing. Garage previews update when you interact with them. [Performance improvements and measurements](docs/PERFORMANCE.md).

**[▶ WATCH / DOWNLOAD THE 46-SECOND GAMEPLAY TRAILER (1080p MP4)](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/releases/download/v1.6.0/TECHCRUSH-Nightshift-Action-46s-1080p.mp4)**

Actual game footage: city flyovers, police chases, jumps, crashes, car selection, reward boxes, visible garage upgrades and cockpit driving. [Video guide and download instructions](docs/TRAILER.md).

[![Tests](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/actions/workflows/ci.yml/badge.svg)](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/actions/workflows/ci.yml)

[Download complete source](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/archive/refs/heads/main.zip) · [Releases](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/releases)

![Illustrated TECHCRUSH Tbilisi Chase cover](dist/assets/tbilisi-cover.png)

_Illustrated key art. The browser game uses the 3D environment shown during play._

A single-player browser 3D chase through central Tbilisi. Clear six checkpoints, dodge mixed traffic, ram patrols and break contact for eight seconds. Complete levels to earn credits and three-part reward boxes, then build a faster car in your saved garage.

## Play and save

Each browser receives a separate anonymous garage with **1,000 credits and one welcome box**. Progress is saved on the server without signing in. Share the game URL so friends start their own careers. Garage's **Back up private garage key** and **Restore garage** buttons transfer your progress to another device. Keep that backup private: it grants access to your garage.

People sharing one browser profile share its garage; use separate browser profiles for separate saves. A live chase is held in memory. Earned credits are banked when a level ends or you use the in-game Garage/Restart controls. Closing the tab mid-chase discards that unfinished run, while previously banked progress remains saved.

## Cars and controls

Choose the restored detailed **Original 458** or three additional unbadged models with different bodies, cabins and handling. The 458 uses the attributed licensed asset; Apex, Vector and Veyra are original procedural designs.

| Car          | Shape                                   | Stock top speed | Stock turbo ceiling |
| ------------ | --------------------------------------- | --------------: | ------------------: |
| Original 458 | Restored detailed roadster and interior |        230 km/h |            302 km/h |
| Apex R       | Rounded rear-engine coupe               |        209 km/h |            281 km/h |
| Vector V12   | Low angular V12 wedge                   |        241 km/h |            313 km/h |
| Veyra W16    | Wide grand-touring hypercar             |        270 km/h |            342 km/h |

Ceilings are on-road values; acceleration time, charge, turns and collisions affect actual speed. Installed parts increase these values.

| Control               | Action                                         |
| --------------------- | ---------------------------------------------- |
| W / Up                | Accelerate                                     |
| S / Down              | Brake, then reverse                            |
| A / D or Left / Right | Steer left / right                             |
| Space                 | Handbrake and drift                            |
| Shift                 | Turbo with exhaust flames and motion effects   |
| C                     | Chase, cockpit, hood, high chase cameras       |
| Q, held               | Rewind up to five seconds; release to continue |
| R                     | Recover on a clear road, with a score penalty  |
| P / Escape            | Pause or resume                                |
| M                     | Sound on/off                                   |
| Enter                 | Start from the garage                          |

Physical key codes support Georgian keyboard layouts. Mobile now defaults to **auto gas + thumb steering**: slide to turn, pull down to drift, and **tap NITRO once to burn the tank**. All three work together. Manual GAS, arrow buttons and **gyro / tilt steering** are available in **CONTROLS**. [Mobile setup and performance guide](docs/MOBILE.md).

Portrait and landscape layouts include gas, brake/reverse, drift, turbo, rewind, recovery and camera switching. Auto accelerator can be switched off; braking overrides it. Auto graphics reduces rendering cost on touch devices, and Battery saver / High detail are selectable. A WebGL2 browser and internet connection are required.

## City lighting

The top **AUTO / NIGHT / DAY / DUSK** button cycles lighting modes. Auto starts at dusk, reaches night after about two minutes, then returns through dawn and daylight over a ten-minute cycle. The moon, occupied windows, street lamps and stronger player headlights appear after dark. Pause freezes the automatic cycle and rewind rolls it back with the chase. Your lighting choice is a local display preference; it does not alter your garage or difficulty.

The racing loading gauge follows asset preparation and shader warm-up. It adds no artificial wait. Lighting reuses existing assets, caps real street lights at three without additional shadows, and uses two instanced batches for nearby lamp glow. Garage previews keep their own studio lighting in every mode.

## Driving audio

Press **M** or the top-right **SOUND** button to enable sound. The four cars have separate V8, flat-six, V12 and W16-inspired engine profiles. Throttle changes the engine load; acceleration raises RPM, automatic shifts drop it, and boost adds intake air and a release sound. These are game-designed hybrid voices, not recordings of the named production cars.

Nearby traffic and patrols make a stereo pass-by whoosh based on relative speed and which side they pass. Wood cracks, metal impacts, stone debris, glass, heavy crashes and explosions follow actual contacts. Tires, drifting, wind, nearby sirens and the helicopter complete the mix; cockpit view softens exterior sound. Pause, rewind and mute silence the mix without replaying old collision sounds afterward.

## Career and garage

The garage now has an interactive **3D studio preview** of the selected car, free saved paint colors, tier-specific rims/tires/brakes/spoilers, and a detailed inspector with animated before/after comparisons. Preview any quality for free, then buy the next grade or install an owned part. The same exterior is used in the chase. [Garage guide and controls](docs/GARAGE.md).

Completing a level grants **one box**, **1,800 + 250 × completed level CR**, and the next level. Separate run earnings are **150 CR per checkpoint, 350 CR per player-caused patrol takedown, 120 CR per civilian wreck and 800 CR for escape**. NPC-only crashes do not give free player rewards.

Each box draws exactly three independent parts. Duplicates count separately. Per-slot tier odds are **Bronze 55%, Silver 28%, Gold 13%, Diamond 4%**; all 14 part types are equally likely. There are no real-money purchases.

| Part               | Benefit                                |
| ------------------ | -------------------------------------- |
| Engine             | Top speed and acceleration             |
| ECU tune           | Acceleration                           |
| Turbocharger       | Boost power and speed                  |
| Nitro tank         | Longer boost duration                  |
| Intercooler        | Faster recharge, shorter cooldown      |
| Gearbox            | Acceleration and speed                 |
| Sport tires        | Grip and steering                      |
| Forged rims        | Acceleration and speed; visible wheels |
| Rear spoiler       | Handling and speed; visible wing       |
| Brake kit          | Stronger braking                       |
| Body reinforcement | Less collision damage                  |
| Suspension         | Softer landings and handling           |
| Race exhaust       | Boost power and speed                  |
| Carbon panels      | Acceleration and speed                 |

Install an owned better part free, or buy the next tier for **600 / 1,500 / 3,600 / 7,800 CR**. Replaced parts become spares. Sell them for **75 / 180 / 420 / 960 CR**. Equipment belongs to the selected car; money and loose parts are shared within its garage.

The garage shows photographic-style part artwork, colored rarity labels, category filters, current-car statistics and the exact benefit of the next paid tier or a free spare installation. Each car keeps its own equipment.

Each level changes checkpoint locations and visiting order across connected city roads. A circular radar preserves distant checkpoint bearings; the open center HUD shows distance along the road route. Thick, translucent TECHCRUSH arches mark each gate.

Each level increases police speed, acceleration, observation range and decision frequency. Waves arrive sooner and unit limits grow. **Level 2 adds larger SUVs and a helicopter; level 3 adds tracked blockade tanks and flanking.** SUVs have 145 HP; tanks have 220 HP, greater mass and slower steering. Active tanks are capped at two on levels 3–6 and three thereafter. The helicopter has rotating rotors and a searchlight, shares actual sightings, searches its last observed position, and can be evaded behind buildings or outrun. Escape requires losing both ground and air contact. Growth is bounded for playability.

## City and action

Rustaveli, Baratashvili, Rike/Europe Square and Abanotubani connect across the Mtkvari. Landmarks include Baratashvili and Metekhi bridges, an arcade driving adaptation of the pedestrian Peace Bridge, bath domes, Chreli Abano, Rike's twin tubes, Metekhi, Narikala, cable cars, mountains, the TV tower and Mother of Georgia. Continuous asphalt, markings, crossings, sidewalks, trees, furniture, Georgian flags and double-sided TECHCRUSH signs complete the streets.

Shared footprints keep buildings off roads and make visible wings solid. High-speed collision substeps prevent thin-wall tunneling. Bridge railings are solid and unbreakable, with openings at road junctions. Cars exchange impulses; hard impacts break trees, while poles, benches, bins, planters and street signs react immediately to contact. Decorative human figures have been removed; Mother of Georgia remains a landmark. Patrol HP takes several hits before explosion and replacement. Traffic includes original 1980s/1990s sedan, hatchback, wagon and van variants.

Hard contacts visibly crumple the struck front, rear, side or roof, with panel creases, scuffs and projected glass cracks. Headlights and exhaust mounts follow the same deformation; wheel and steering pivots remain fixed. Checkpoint repairs reduce body damage, and rewind restores it. Destroyed patrols and traffic leave solid, charred wrecks until replacement. Sparks, material fragments and a layered fire/smoke burst accompany the heavier impact and explosion sounds.

Four ramps launch cars into controllable rolls and pitch. A surviving overturned car automatically recovers upright after 0.8 seconds. Steering wheels turn around their own fixed shafts, exhaust effects remain attached to each model's outlets, and soft headlights replace flat road-light decals. Rewind restores position, HP, nitro, police, traffic, checkpoints, earned money and broken props together. Discarded future rewards cannot be banked again.

This is a reference-guided arcade reconstruction, **not a one-to-one scan**. Cached OpenStreetMap geometry is combined with documented manual connections and widened surfaces. User reference photos and Google Street View screenshots are not redistributed as textures. See [asset/map provenance](ASSETS.md).

## Run locally

Requires **Node.js 24+**:

```sh
git clone https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase.git
cd techcrush-tbilisi-chase
npm start
```

Open **http://127.0.0.1:4173/**. Checked-in assets and Node's built-in SQLite allow local play without dependency installation. The server applies checked-in migrations and saves garages in the ignored `.sites-runtime/garages.sqlite`. Stop with Ctrl+C.

For development and production builds:

```sh
npm ci
npm test
npm run build
```

Authored browser modules remain in `dist/`. Build output goes into `dist/client/`, `dist/server/` and `dist/.openai/`. **Do not delete the whole dist folder.** The career edition requires its save API and database; static-only GitHub Pages cannot host the complete game.

## English documentation

| Guide                                      | Contents                                      |
| ------------------------------------------ | --------------------------------------------- |
| [Getting started](docs/GETTING_STARTED.md) | Local play, saves, troubleshooting            |
| [Architecture](docs/ARCHITECTURE.md)       | Simulation, rendering, modules                |
| [Career and API](docs/CAREER.md)           | Progression, storage, recovery, concurrency   |
| [Development](docs/DEVELOPMENT.md)         | Assets, roads, migrations, browser tools      |
| [Testing](docs/TESTING.md)                 | Unit checks, route controller, browser review |
| [Deployment](docs/DEPLOYMENT.md)           | Access, Sites, Worker/D1 self-hosting         |
| [Gameplay trailer](docs/TRAILER.md)       | Watch, download and share the 46-second video |
| [Mobile driving](docs/MOBILE.md)         | Touch, gyro, calibration, fullscreen and phone graphics |
| [Validation](VALIDATION.md)                | Observed results and limitations              |
| [Changelog](CHANGELOG.md)                  | Release changes                               |
| [Assets](ASSETS.md)                        | Attributions and licenses                     |

The public repository includes code, runtime assets, preparation scripts, map source data, tests, schema/migrations and the dependency lockfile. It excludes player saves, private keys, caches and personal reference photos. Public source access does not grant write access.

Project code is MIT. Third-party assets, OSM data, generated textures and TECHCRUSH branding retain their respective terms. See [LICENSE](LICENSE), [ASSETS.md](ASSETS.md) and the in-game Credits page.
