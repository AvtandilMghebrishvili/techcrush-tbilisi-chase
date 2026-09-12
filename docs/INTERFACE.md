# Interface guide

Choose a city, choose an available car and press **Start Chase**. Four stock cars are immediately available; four more show their achievement requirements. **Your Garage** opens customization and **Leaderboard** opens shared city rankings. Start and the two secondary actions remain visible while the menu content scrolls.

## City selection and mastery (2.0)

Tbilisi, Kutaisi and Batumi are all open from the first visit. The selected city has a red outline and checkmark; the other two show Play Now. Each city displays its own current level and progress out of five completed levels. **Your Mystery Cars & Rewards** expands the three car milestones and creator-box progress. Complete level 5, then open that city’s car box here or from the finish screen. The car becomes available in both selectors.

The launch area shows saved coins, the selected city/level and the driver profile. The car photo strip scrolls to the selected car. The in-game coin balance sits beside the logo, separate from the level’s unbanked earnings. Cars, parts and currency follow the same private garage between cities. Changing city banks the current run and reloads the page to release the old world.

Setup includes **Steering response** (70–130%), **Drift strength** (65–140%), **Reset to Classic**, music volume and **Reset Music & Sound**. The speaker button mutes effects and music together; preferences persist in this browser. Music can begin only after a click, tap or keypress. Auto lighting is the default unless a fixed mode was saved; every active three-minute cycle starts/ends at night.

## Driving screen

The upper-left panel shows level, run earnings, score and six checkpoint marks. The upper-right panel shows pursuit units, heat and reinforcement timing. The central arrow and distance have no background so the road stays visible. Speed and condition sit above the pedals on touch screens; the circular radar, Rewind and Reset Car have separate targets.

| Toolbar control | Action                                           |
| --------------- | ------------------------------------------------ |
| Trophy / Ranks  | Shared leaderboard, driver name and achievements |
| Sliders / Setup | Pause and open driver settings                   |
| Camera / C      | Switch chase, cockpit, hood and high chase       |
| Sun             | Cycle automatic lighting, night, day and dusk    |
| Speaker / M     | Enable or mute sound                             |
| Pause / P       | Pause; choose Resume, Restart or Change Car      |

Desktop buttons include labels and shortcut hints. Smaller screens use icons with accessible names. Touch steering, drift and nitro still accept independent fingers; the interface introduces no changes to vehicle physics or saved progress.

## Driver setup

**Driving** contains touch/gyro selection, Auto accelerator and thumb-pad/button steering. **Gyro Tuning** expands to reveal calibration, sensitivity and inversion; Enable Gyro opens it automatically. **Display** contains graphics, touch visibility and fullscreen. Settings save automatically. Closing setup during a chase leaves it paused until Resume.

## Map size and zoom (2.3)

Open **Setup → Map & Radar**, near the top of settings, or expand **Minimap Size & Zoom** in **Map + Side Quests**.

- **Minimap size:** 80–160% of the responsive baseline, default 110%. This scales the circular display independently of world coverage. Narrow screens cap its physical footprint so steering, Rewind, Reset Car and nitro retain separate targets.
- **Minimap zoom:** 0.5–2.5×. Lower values show a wider area; higher values show closer streets. The player remains centered, and distant checkpoints/quest markers retain their bearings on the rim.
- **Reset Minimap:** restore size 110% and zoom 1×. It does not alter the full-map zoom, graphics or garage.

The full city map supports **+ / −**, **Fit City**, and **Find Me**, along with mouse drag/wheel and two-finger pinch/pan. With the map itself focused, use arrow keys to pan, +/− to zoom, and 0 to fit the whole city. Zoom ranges from 100% to 300%; panning stops at the map boundary. A tap on a stunt pin chooses its route; dragging a pin does not accidentally select it. The map centers on the player when reopened at the saved zoom.

Preferences use `techcrush-map-view-v1` in this browser and carry across the three cities. Storage failures fall back to working in-memory controls. No server profile or leaderboard migration is required. The full map pauses simulation and the race clock. Map zoom uses a CSS transform of the existing canvas/pin surface, the radar reuses its fixed 384×384 buffer and shared static street atlas, and no map-specific animation loop is added. The settings sample copies the radar only while its visible section is open.

Validation includes five mathematical tests, synchronized sliders, persistence/reload, a live sample, route selection, mouse/keyboard/touch pinch, all three city maps, six viewport sizes and separation between visible driving targets. The complete suite contains 204 tests. Inactive/hidden game rendering remains suspended.

## Garage

The compact **Build & Paint**, **Upgrades** and **Boxes** tabs show one section at a time. Select a car, orbit its real 3D preview and choose paint. Select a part photograph to compare all grades supported by that car, then buy, equip, sell or fuse. Grade-specific artwork, visible fitted parts and animated comparisons remain. Reward boxes contain three independent parts. See [Garage](GARAGE.md).

## Keyboard and motion

Tab follows visible controls, with a clear focus outline. Native dialogs and the pause/result overlay keep focus inside; resuming returns focus to Pause. Reduced-motion preferences suppress optional garage transitions. The new SVG icons are inline, with no icon font or media downloads. UI work remains event-driven; menu, pause and hidden-page rendering/audio suspension stay active.

The first Start offers a driver nickname or private guest play. The community dialog follows the same keyboard/touch and idle behavior. See [Community racing](COMMUNITY.md).
