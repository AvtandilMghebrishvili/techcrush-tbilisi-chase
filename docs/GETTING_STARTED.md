# Getting started

Use Node.js **24+** for local hosting, a WebGL2 browser and hardware acceleration. The hosted game supports keyboards and mobile touch/gyro controls; see [mobile setup](MOBILE.md). Python is needed only to regenerate maps.

Clone the repository or choose GitHub's **Code → Download ZIP** and extract it. In the folder containing package.json, run `npm start`, then open **http://127.0.0.1:4173/**. Choose a car, open the welcome box in Garage, fit parts and start. [Controls](../README.md#cars-and-controls).

Local play needs no dependency installation: assets are checked in and Node provides HTTP and SQLite. The server applies `drizzle/*.sql` once and saves to `.sites-runtime/garages.sqlite`. Stop with Ctrl+C. For development, run `npm ci`, `npm test` and `npm run build`. Refresh after browser edits; restart after backend edits.

## Sharing and saves

Send friends the hosted game link, not localhost. Each browser gets a separate saved garage. To resume on another device, use **Back up private garage key**, then **Restore garage** there. The backup works against the same deployment/database. Keep it private.

Clearing browser storage or ending incognito browsing can discard the identity key; restore it from your backup. Different people on one computer need separate browser profiles for separate garages.

A run is banked when you complete a level or leave/restart with the game's buttons. Closing or refreshing during a chase discards that unfinished run. Previously saved levels, money and equipment remain. Interrupted save requests are retained for **Retry save** in Garage.

## Folder layout

| Path | Purpose |
| --- | --- |
| dist/*.js, *.html, *.css | Authored browser source; tracked |
| dist/assets, dist/vendor | Runnable assets and Three.js |
| dist/client, dist/server, dist/.openai | Generated deployment output; ignored |
| server/, server.mjs | API, Worker entry, local SQLite server |
| db/, drizzle/ | Schema and generated SQL migrations |
| data/, scripts/ | Map/model inputs and preparation tools |
| tests/, docs/ | Tests and English documentation |
| .sites-runtime/ | Ignored local saves and caches |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank page after opening index.html | Use npm start; ES modules require HTTP |
| Unknown node:sqlite module | Install Node.js 24+ |
| EADDRINUSE | Stop the earlier server on port 4173 |
| Garage unavailable | Run the save API and database; static files alone are insufficient |
| Save pending | Restore connectivity and retry; preserve browser storage |
| Missing models | Fully extract assets/vendor directories |
| Low frame rate | Open Controls → Graphics → Battery saver; enable GPU acceleration |
| Gyro unavailable | Use touch buttons; open the HTTPS game in Safari/Chrome and allow motion access |
| No sound | Press M; sound starts muted |
| Paused after changing tabs | Intentional; resume when back |
| Friends cannot open localhost | Publish the full app using the hosting guide |

`private: true` in package.json prevents accidental npm publishing; the GitHub repository is public. See [Deployment](DEPLOYMENT.md).
