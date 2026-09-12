# Interface guide

Choose one of four cars and press **Start Chase**. **Your Garage** opens saved customization. On shorter displays, the car details scroll inside the menu while the main actions remain reachable.

## City selection and unlock progress (1.18)

The start menu has two numbered sections: **01 Choose your city** and **02 Choose your car**. They sit side by side on wide screens and stack on phones. The launch area remains visible while scrolling, with Start Chase, Your Garage and Leaderboard. The current city/level and selected car stay beside Start. Press the car's **Change** shortcut to scroll to and focus its selection button; choosing another car updates the shortcut immediately.

Tbilisi is available from the start. **Complete Tbilisi levels 1, 2 and 3**, including each final police escape, to unlock Kutaisi. Being on Tbilisi level 3 means two levels are complete: the menu shows **2 / 3**, two completed steps and one remaining level. After winning level 3 the saved Tbilisi level becomes 4, and Kutaisi becomes selectable with a green **Unlocked** label. An accessible progress bar supplies the same information without relying on color.

City cards show each city's own current endless level. The available-city count excludes upcoming Batumi. Both cities share cars, parts and credits. Unlock status refreshes through the existing profile change callback. Choosing Kutaisi still performs the normal safe city reload. The menu changes no driving physics, rewards, save schema or timing-course IDs, and adds no image downloads, animation loop or network polling.

## Driving screen

The upper-left panel shows level, run earnings, score and six checkpoint marks. The upper-right panel shows pursuit units, heat and reinforcement timing. The central arrow and distance have no background so the road stays visible. Speed and condition sit above the pedals on touch screens; the circular radar, Rewind and Reset Car have separate targets.

| Toolbar control | Action |
| --- | --- |
| Trophy / Ranks | Shared leaderboard, driver name and achievements |
| Sliders / Setup | Pause and open driver settings |
| Camera / C | Switch chase, cockpit, hood and high chase |
| Sun | Cycle automatic lighting, night, day and dusk |
| Speaker / M | Enable or mute sound |
| Pause / P | Pause; choose Resume, Restart or Change Car |

Desktop buttons include labels and shortcut hints. Smaller screens use icons with accessible names. Touch steering, drift and nitro still accept independent fingers; the interface introduces no changes to vehicle physics or saved progress.

## Driver setup

**Driving** contains touch/gyro selection, Auto accelerator and thumb-pad/button steering. **Gyro Tuning** expands to reveal calibration, sensitivity and inversion; Enable Gyro opens it automatically. **Display** contains graphics, touch visibility and fullscreen. Settings save automatically. Closing setup during a chase leaves it paused until Resume.

## Garage

The sticky **Your Build**, **Boxes** and **Upgrades** buttons jump to each section. Select a car, orbit its real 3D preview and choose a paint preset. Inspect a part and compare Bronze, Silver, Gold and Diamond values before purchasing. Existing grade-specific artwork, visible fitted parts and animated performance comparisons are retained. Reward boxes still contain three independent parts.

## Keyboard and motion

Tab follows visible controls, with a clear focus outline. Native dialogs and the pause/result overlay keep focus inside; resuming returns focus to Pause. Reduced-motion preferences make garage jumps immediate. The new SVG icons are inline, with no icon font or media downloads. UI work remains event-driven; menu, pause and hidden-page rendering/audio suspension stay active.

The first Start offers a driver nickname or private guest play. The community dialog follows the same keyboard/touch and idle behavior. See [Community racing](COMMUNITY.md).
