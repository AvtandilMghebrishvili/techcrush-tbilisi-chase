# Career, persistence and API

Rules in `dist/progression.js` are shared by browser and server. Profiles begin at level 1 with 1,000 credits and one box. Fourteen parts have four tiers, giving 56 combinations; the README lists effects, prices and odds.

## Rewards and equipment

A winning run clears six gates and escapes. Settlement grants run earnings, 1,800 + 250 × completed level CR, one box and the next level. Losing/abandoning banks only run earnings. Equipment is per car; inventory and wallet belong to the garage.

Boxes use cryptographic random values on the server for three independent draws. All three rewards are stored atomically before slot animation begins. Skip/reload/retry cannot reroll the same operation. Duplicates count separately. Higher owned parts install free; credit purchases buy the next tier. The old fitted part returns to inventory. Spoilers, tire width and rims also change geometry.

`upgradedSpec()` produces the actual driving parameters. `pursuitTuning(level)` smoothly increases speed, acceleration, observation range, route updates, wave frequency and unit cap. Level 3 enables flank targeting. Growth approaches a bound rather than increasing without limit.

## Storage and recovery

Production uses D1 binding `DB`; local development uses Node's SQLite adapter and the same migration. The `garages` table stores `key_hash` (SHA-256 primary key), JSON `profile`, integer `version` and `updated_at` milliseconds.

Each browser generates a random 256-bit private key. Local storage holds that identity and a retry outbox, not the authoritative profile. Names, emails and passwords are not requested. The API returns only a short hash prefix as the driver label, never the raw key.

The key is a bearer capability: anyone possessing it can use that garage. Backup/restore moves access between devices using the same deployment. Import fetches and validates the existing garage before replacing the local key; pending saves must finish first. Clearing storage without a backup loses access. There is no email recovery or live-chase synchronization.

An unfinished chase lives in memory. Banked career data survives reload. Run cash is rewound together with the simulation and only the chosen timeline is settled. Won runs cannot rewind after rewards are banked; wrecked/captured runs remain rewindable until leaving or restarting.

## HTTP contract

Requests require `Authorization: Bearer <64 lowercase hexadecimal characters>`. Responses are JSON with `Cache-Control: no-store`. Same-origin requests are used, without CORS. Bodies are limited to 8 KiB.

| Endpoint | Behavior |
| --- | --- |
| POST /api/profile | Create if absent, otherwise return existing garage |
| GET /api/profile | Read existing garage |
| POST /api/action | Apply an operation with ID and expected version |

Successful responses are `{ profile, version, driver }`. Example action body:

```json
{"id":"unique-operation-id","version":3,"action":{"type":"upgrade","car":"gt","part":"engine"}}
```

Actions: `select`, `open-box`, `upgrade`, `equip`, `sell`, `settle`. Equipment uses validated part/car IDs; equip/sell also supply tier 1–4. Settlement supplies `runId`, `level`, earned `cash`, and `result` (`won`, `busted`, `wrecked`, `abandoned`).

Prepared statements and a version compare-and-swap protect concurrent writes. The last 128 operation IDs and settled run IDs suppress retries. A stale version returns 409 and refreshes the client; invalid actions/insufficient funds return 400, invalid keys 401, absent profiles 404 and storage failures 503. Transient errors retain the original pending operation ID for a safe retry.

## Limits

This is a casual single-player game. The API validates funds, inventory, current level, bounded cash and concurrency; the browser calculates driving and run outcomes. It is **not an anti-cheat authority**, competitive leaderboard, payment system or multiplayer server. A modified client can fabricate a run result. Credits have no monetary value.

Different people using one browser profile share its garage. Two tabs can access one save; conflicting purchases refresh instead of merging. Backups, data retention and production key-management policies remain the hosting operator's responsibility.
