# Mobile driving

Open the [public game](https://nightshift-chase-september.avtandilmghebrishvili.chatgpt.site/) in a browser with WebGL2. Use Safari or Chrome directly if a social app's built-in browser does not provide motion sensors. An internet connection is required for loading assets and saving your garage.

## Start with two-thumb arcade controls

Choose a car, then tap **START CHASE**. Landscape leaves more space for the road; portrait is supported too. The display respects screen cutouts and home-indicator areas.

| Control                  | Action                                                    |
| ------------------------ | --------------------------------------------------------- |
| Auto accelerator         | Default on mobile; frees your thumbs for steering/actions |
| Thumb pad                | Slide to steer; pull into the lower strip to drift simultaneously |
| GAS, held                | Accelerate in manual mode (turn Auto accelerator off) |
| BRAKE, held              | Slow down, then reverse                                   |
| Left / right, held       | Optional button steering, selectable in Controls          |
| DRIFT, held              | Handbrake; combine with steering                          |
| NITRO, tapped once       | Burn the remaining tank without holding the button         |
| REWIND, held             | Move back through up to five seconds; release to continue |
| RESET CAR                | Recover on a clear road with the existing score penalty   |
| Camera button at the top | Cycle chase, cockpit, hood and high chase                 |
| Pause button             | Pause / resume                                            |
| SETUP                 | Pause the chase and open driver setup                     |

Use the **left thumb to steer + pull down to drift**, and the **right thumb to tap NITRO**. Auto accelerator keeps driving; the separate DRIFT button also works with steering. Nitro can launch from rest and boost through a handbrake turn. Its button shows charge, BURNING and RECHARGING. Repeated taps do not refill the tank. At empty it stops and never restarts automatically: recharge, then tap again. BRAKE still controls braking/reverse; the committed fuel burns without forward boost fighting the brake.

Touches have independent ownership. Lifting the nitro finger leaves steering/drift held; lifting steering centers it without canceling the burst. Pointer cancellation releases held controls. Pause, app switching, rewind, recovery and leaving a run cancel the burst. Rotation pauses the chase; resume explicitly. Desktop Shift retains its held behavior.

Version 1.8 enables Auto accelerator once for existing mobile users. Choose manual GAS afterward if preferred; input style and preferences persist. Graphics preferences are preserved.

## Gyro / tilt steering

1. Open **SETUP** (the sliders icon) or **DRIVER SETUP** and tap **ENABLE GYRO**.
2. Allow Motion & Orientation access if your browser asks. Permission is requested only by tapping the button.
3. Hold the phone in your normal driving position. The first valid reading sets the center. **CENTER STEERING**, or **CENTER** beside the touch arrows, makes the current position straight ahead.
4. Close setup, resume and tilt left/right. **Auto accelerator** is on by default; disable it for manual GAS. BRAKE always takes priority.

Use the sensitivity slider to choose **12–40 degrees to full steering lock**. A smaller angle turns faster; the default is 24°. A small dead zone and time-based filtering suppress hand jitter. **Reverse gyro direction** is available. The mapping follows portrait, upside-down portrait and both landscape directions. After rotating the screen, hold the phone comfortably so the next reading sets the new center.

The physical keyboard, touch arrows and active thumb pad override gyro steering. Select **TOUCH STEERING** to turn gyro off. Gyro must be enabled again after reloading; sensitivity, inversion, accelerator, touch style and graphics preferences are saved locally.

If permission is declined, the sensor is missing, or no data arrives within five seconds, button steering remains available. A stale reading returns steering to neutral after one second and switches to buttons after three seconds without readings. Open the game directly in Safari / Chrome and check the site's motion permission before retrying. Gyro requires HTTPS (localhost is suitable for development). Motion readings are processed locally and are not sent to the save API.

The implementation uses the browser's [Device Orientation API](https://www.w3.org/TR/orientation-event/). See [permission and user-activation requirements](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static) for browser details. The game does not request a compass or location.

## Display and performance

Open **SETUP → DISPLAY** for graphics, touch visibility and fullscreen. **GYRO TUNING** contains centering, sensitivity and direction; enabling gyro opens it automatically. Driving options stay at the top.

Version 1.8 keeps these quality settings unchanged. Production code is bundled/minified, assets load concurrently and the hidden phone cover waits until needed. All shipped art/model/audio bytes match the original source. [Loading measurements](PERFORMANCE.md#mobile-loading-180).

- **Auto:** lighter graphics on touch devices; normal detail on desktop.
- **Battery saver:** no dynamic shadow maps, a bounded render resolution and shorter tree visibility. Lighting, gameplay collisions and destruction remain active.
- **High detail:** dynamic shadows, higher resolution and longer tree visibility. Touch devices retain the lighter tree mesh, saving the 12 MB detailed-tree download.

Phone rendering is capped at 800,000 pixels in Auto/Battery saver, with pixel ratio at most 1.15. High detail is capped at 2.4 million pixels. These are rendering limits, not a guarantee of a particular frame rate. The garage preview uses a separate small renderer; drag with one finger to orbit and pinch with two fingers to zoom. Menus and reward dialogs scroll independently.

**FULLSCREEN / LANDSCAPE** requests fullscreen and, where supported, landscape orientation. Unsupported requests leave normal browser play available. On iPhone, **Share → Add to Home Screen** can give the game a standalone window. Android browsers may offer **Install app** or **Add to Home screen**. This is a shortcut to the online game, not an offline edition. When supported, a screen wake lock prevents dimming during an active chase and is released when paused or hidden.

## Saves and compatibility

Each browser has its own anonymous saved garage. To continue desktop progress on your phone, privately transfer the garage backup using **Back up private garage key** and **Restore garage**. Never share that key publicly. See the [garage guide](GARAGE.md).

Automated checks cover touch combinations, steering axes, calibration, stale sensors, permission denial, sensor timeout, saved preferences, pinch zoom, narrow layouts and desktop keyboard behavior. Browser checks use Chromium mobile emulation and synthetic motion readings. Physical iPhone/Android sensors, Safari, device heat and real-phone frame rates have not yet been measured; use button steering if a device's gyro is unavailable.
