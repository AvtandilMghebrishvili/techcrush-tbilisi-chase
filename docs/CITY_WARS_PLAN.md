# CITY WARS — private development plan

This update is being tested on loopback only. Do not deploy it to the public game or push unrevealed city sources to the public repository before the owner has reviewed the private playable version.

The private implementation is available at `http://127.0.0.1:4191/?map=rustavi`.
See [CITY_WARS.md](CITY_WARS.md) for implemented rules and preview instructions,
and [RUSTAVI.md](RUSTAVI.md) for the map, references and rebuild workflow.

- Event: 20 September 2026 15:00 through 24 September 2026 21:00, Asia/Tbilisi (UTC+4). Server time is authoritative.
- Existing cars, equipment and career levels are allowed. Event points start at zero and accumulate separately per city. TECHCRUSH's existing 2x multiplier remains active and must be disclosed in rules.
- Unique event usernames are reserved transactionally. Public handles, city scores and levels are displayed; private garage keys are never displayed.
- A player can lead every ranking. Prize distribution is the organizer's decision after review, not an automatic exclusion of repeat winners.
- Five distinct marked sponsor artifacts in each of Tbilisi, Kutaisi and Batumi persist across banked runs. Repeated destruction/rewind cannot duplicate a collection.
- The extra challenge advertises the Suzuki GSX-R1000 1:12 model without naming or picturing the destination. On collecting all 15 artifacts, reveal the Rustavi map and its separate cumulative ranking.
- After the deadline the city is available to everyone. Event scores freeze; normal careers and historical rankings persist.
- Driving stops at the deadline. A 30-second delivery grace accepts an on-time final run without granting extra driving time; late saves still retain ordinary career progress.
- Physical prizes use the supplied product photos. Subscription is self-declared during registration and reviewed by the organizer for prize eligibility; a click cannot prove a subscription.
- Rankings remain provisional: browser-reported runs receive timing/counter/replay validation and an audit record, but are not an authoritative competitive simulation. Do not label them cheat-proof or automatically award physical prizes.

## Rustavi world

Reference-informed compressed reconstruction: central square, theatre/civic facades, the owner's enlarged diamond-shaped new monument at the spawn, horse sculptures, Rustaveli memorial, Mtkvari river and road bridges, Rustavi highway, the international motorpark and a driving-exam service area. Google Maps and supplied photographs are visual references; OSM supplies redistributable road geometry. No Google tiles are shipped as textures. Distances are compressed and roads widened for the existing arcade vehicles.

## Validation

Check map connectivity, road/building clearance, dry road/bridge support, spawn/checkpoint legality, retained resource counts, deadline boundaries, profile migration, artifact uniqueness, duplicate requests, username collisions, per-city score isolation, locked-map access and mobile dialog layouts. Preview uses a separate SQLite file and port, never production players.
