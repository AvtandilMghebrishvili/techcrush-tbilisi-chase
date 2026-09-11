# Getting started

TECHCRUSH — Tbilisi Chase is a single-player 3D driving game. The browser runs the complete simulation and renderer. A web server only serves files; there is no game backend, account setup or API key.

## Requirements

- A modern browser with WebGL2 and hardware acceleration. Chromium was used for the recorded browser checks.
- Node.js 20 or newer to use the included local server. Node.js 24 is recommended for development and used by CI.
- A keyboard is recommended. Touch controls are included, but physical phones, Safari and low-end GPUs have not been validated.
- Python 3 is needed only to regenerate the road graph, not to play or run JavaScript tests.

## Download and play

With Git installed:

```sh
git clone https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase.git
cd techcrush-tbilisi-chase
npm start
```

Alternatively choose **Code → Download ZIP** on GitHub, extract it, and open a terminal in the folder containing `package.json`. Run `npm start` there. Open **http://127.0.0.1:4173/** and wait for the garage to load, choose a trim, then start the chase. Press Enter to start, W to accelerate, A/D to steer and C to change the camera. Full [controls and rules](../README.md#cars-and-controls) are in the README.

Playing from this source checkout does not require `npm install`, `npm ci` or a build command. The release already contains Three.js, optimized models, textures and browser modules. Stop the server with Ctrl+C.

The optional `techcrush-tbilisi-chase-web-v1.0.0.zip` release download contains the **contents of `dist/` at the archive root** for a static host. It does not contain Node's local server, developer scripts or tests. Use GitHub's source download for the complete project.

## Development setup

From the project root:

```sh
npm ci
npm test
npm start
```

`npm ci` installs the exact dependency tree from `package-lock.json`. It is needed for the asset preparation scripts and formatting tools. The simulation tests use Node's built-in test runner. Edit the files, then refresh the browser; there is no live-reload bundler. See [Development](DEVELOPMENT.md).

## Folder layout

| Path                    | Purpose                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| `dist/`                 | Editable browser source **and** complete static hosting output; keep it in Git |
| `dist/assets/`          | Runtime models, HDR environment, textures and supplied branding                |
| `dist/vendor/`          | Checked-in Three.js modules, loaders and license                               |
| `data/`                 | Archived road data, manual street connections and tree source metadata         |
| `scripts/`              | Road, model and vendor preparation tools                                       |
| `tests/`                | Simulation, navigation, asset checks and driving controller                    |
| `docs/`                 | English setup, architecture, development, testing and hosting guides           |
| `.github/workflows/`    | Test CI and optional manual Pages publishing                                   |
| `.openai/hosting.json`  | Existing owner's Sites project configuration                                   |
| `server.mjs`            | Dependency-free development server bound to local loopback                     |
| `ASSETS.md` / `LICENSE` | Asset attribution and project code license                                     |

Local caches, `node_modules/`, archives and the creator's reference-photo folder are ignored. They are unnecessary for normal play. Runtime assets and the original car preparation input are included; the larger upstream tree source can be downloaded by its preparation script.

## Troubleshooting

| Symptom                                         | What to check                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Blank canvas after double-clicking `index.html` | Use the HTTP server. ES modules and model loaders cannot reliably run from `file://`.                                               |
| `node` or `npm` is not recognized               | Install Node.js and open a new terminal so its PATH is available.                                                                   |
| `EADDRINUSE`                                    | Another process is using port 4173. Stop the previous local game server, or use a different static server with `dist/` as its root. |
| Models fail to load                             | Confirm the archive is fully extracted and `dist/assets/` is present. In browser developer tools, check for failed requests.        |
| WebGL unavailable or very low frame rate        | Enable hardware acceleration and try a current browser. GPU and memory capabilities affect this detailed scene.                     |
| No engine or siren audio                        | Sound starts muted. Press M or use the sound control after interacting with the page.                                               |
| Car stops when switching apps                   | Focus loss intentionally clears input and pauses the simulation. Resume when back in the game.                                      |
| Cannot reach the local URL from another device  | The included server listens only on `127.0.0.1`. Publish `dist/` with the [hosting guide](DEPLOYMENT.md) for a shareable URL.       |
| `private: true` appears in `package.json`       | This prevents accidental npm package publication. It does **not** make this GitHub repository private.                              |

[Back to README](../README.md)
