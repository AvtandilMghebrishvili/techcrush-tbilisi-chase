# TECHCRUSH: CITY WARS

## Release status

**Public release approved for the 20–24 September event.** Production uses real
server time and individual artifact eligibility. Local owner bypass is off by
default. Existing garages and ordinary rankings are preserved.

Open **http://127.0.0.1:4191/** on the development computer.
If the preview is stopped, run `./scripts/private-preview.ps1` in PowerShell from
the project directory. Use `./scripts/private-preview.ps1 -Stop` to stop it.
The server binds only to `127.0.0.1`, never the LAN or the internet. It uses
`.sites-runtime/city-wars-preview.sqlite`, separate from ordinary local and
production saves. Restarting does not erase test progress. Port 4173 is untouched.

The local preview now uses ordinary player access and real time. The launcher
explicitly disables owner access unless called with `-OwnerAccess`. Only that
explicit local-only mode accepts `TECHCRUSH_PREVIEW_TIME` for deadline tests and
injects a temporary city bypass; no URL can enable it. The production worker never
enables owner testing. Local test scores do not reach the public leaderboard.

## Schedule and rules

| Setting            | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| Event ID           | `city-wars-2026-09`                                           |
| Starts             | Sunday, 20 September 2026, 15:00 Asia/Tbilisi (11:00 UTC)     |
| Ends               | Thursday, 24 September 2026, 21:00 Asia/Tbilisi (17:00 UTC)   |
| Winner metric      | Cumulative banked event points, separately per city           |
| Ties               | Earliest time the total was reached, then normalized username |
| Cars and parts     | The player's existing saved garage                            |
| Multiple city wins | Allowed; the organizer decides physical prize allocation      |
| Level              | Displayed for information, never the event ranking sort key   |

The server stamps eligibility when a run starts. Before joining, ordinary runs do
not add to the event. After joining, every chase is automatically an event run
until the deadline. Select **CITY WARS → PLAY**. Points from completed, wrecked, busted and deliberately
banked unfinished event chases accumulate. A new run does not reset the total.
Existing level multipliers and the TECHCRUSH Cyber 2x reward bonus still apply.

The countdown is visible on entry and during an event chase. Driving stops at the
deadline and the current run is submitted. There is a 30-second delivery grace
for that final save, with no extra driving time. Late starts, late play and saves
arriving beyond the grace are excluded from event totals. Ordinary career saves
are still retained. If the browser was closed or offline at the deadline, the
unbanked run may not qualify. Use **GARAGE / END RUN** before leaving the game.

Existing career leaderboards remain separate. Event standings show participants,
city entrants, top 100, and the current player's rank even outside the top 100.
They remain readable after the event, without resetting historical scores.

## Identity and subscription

Event handles contain 3–20 Unicode letters, numbers, underscores or hyphens.
They are normalized with NFKC and lowercase before transactional uniqueness
checks. A handle is fixed once registered. It belongs to the existing private
garage key, not a new password account. Players should keep their garage backup
to recover the same identity on another device. Clearing storage without a
backup loses access to that profile; a username alone cannot restore it.

Registration requires acknowledging the event rules and TECHCRUSH subscription.
After registration, every new run on that saved profile automatically belongs to
CITY WARS until the event deadline. There is no regular/event mode toggle. The
server enforces enrollment even when a client omits the event field; reloading or
changing city cannot switch back to regular play. A pre-enrollment chase is banked
before joining. At the deadline, regular play returns and event standings remain
archived. The participant name and enrollment status are plain text. A prominent
PLAY button starts a chase with the selected car or resumes a paused chase, without
an extra menu step. The unlocked challenge uses a separate, secondary link.
Joining opens at the scheduled event start. Before then, JOIN EVENT and event
race entry are disabled and explain the opening time. They activate automatically
when the server-synchronized countdown reaches zero; the API also rejects early
registrations. Existing registered profiles and their progress remain intact.
**Subscription is self-declared, not verified by YouTube.** The exact channel URL
is still awaiting the owner's answer; the Subscribe destination is hidden until
that URL is supplied. Winners require manual eligibility review. Registration
does not subscribe on the player's behalf.

## Prizes and hidden mission

| Ranking         | Supplied physical prize photo           |
| --------------- | --------------------------------------- |
| Tbilisi         | Red Ford Mustang GT model car, 1:42     |
| Kutaisi         | Land Rover Defender 110 model car, 1:43 |
| Batumi          | Blue Ford Mustang GT model car, 1:42    |
| Extra challenge | Suzuki GSX-R1000 model motorcycle, 1:12 |

The fourth card displays **EXTRA CHALLENGE**, without naming or picturing its
destination. Each of the original three cities contains five different cyan
TECHCRUSH artifact banners: Fuel Cell, Gear Core, Spark Key, Race Wheel and Aero
Wing. Break all five different banners in each city. Collection can span any
number of banked event runs. Repeated destruction of the same ID does not count
again; rewinding restores the earlier collection state.

The first player to bank all 15 reveals **RUSTAVI** in the fourth prize card,
city selector and event ranking for everyone. Other players still need their own
15 artifacts to enter. The secret is a player-facing reveal, not DRM: developers
can inspect shipped source files. At the event deadline Rustavi becomes
available to everyone, including players who never registered.

## Persistence and review

- Existing profile schema 6 is migrated additively: `maps.rustavi` and
  `events[eventId]` are added without replacing money, cars, inventory, upgrades,
  city levels or previous rankings.
- Migration `0006_numerous_albert_cleary.sql` adds `event_entries`, `event_scores`
  and `event_runs`. It does not drop or reset existing tables.
- Event projection, profile mutation and the immutable run audit are committed in
  the same guarded database batch. Duplicate operation/run submissions cannot
  add points twice. Username conflicts roll back the entire mutation.
- Private garage keys/hashes are never returned in event ranking entries.
- Winner review can inspect each `event_runs` record, including map, score,
  result, metrics and recorded time. Physical awards are never sent automatically.
- Existing plausibility limits validate elapsed time, scores and counters;
  artifact claims must use legal distinct IDs and plausible route time/distance.
  Browser physics is not server-authoritative. This is **not cheat-proof** and
  does not establish one real person per browser profile. Audit suspicious
  winners before awarding the prizes.

## Performance and release checklist

The event has no extra WebGL canvas or render loop. Four optimized WebP prize
photos are lazy-loaded. The one-second countdown stops while the document is
hidden; standings refresh on entry and every 30 seconds only while the event panel
is visible. There is no background standings polling. Existing simulation,
audio and rendering suspension/disposal remain in place.

Before public release: confirm the exact channel URL, inspect the private city,
run `npm test`, `npm run build`, `npm run check:build`, apply the additive
migration through the existing Sites deployment flow, and deploy without the
private-preview environment flag. Never upload the test SQLite database, garage
keys, raw `Challenge/` reference folder or local logs. Reuse the existing public
site and database so players keep their progress. The event dates are constants
in `dist/event-rules.js`; do not change the ID or schedule during live competition
without a planned migration and player communication.

## Announcement, reveal and bilingual rules

On the first visit while the event is upcoming or live, the event dialog opens
automatically after game preparation. A small per-event acknowledgement is saved
to the garage profile; a profile-scoped local fallback prevents repeat prompts
when a save is temporarily unavailable. On later visits, a clickable side notice
appears for 10 seconds. It closes on click, manual dismissal, page hiding or
disposal. No notice appears after the event. The existing menu strip remains.

The fourth ranking is always available as **CHALLENGE**. Migration 0007 adds an
indexed discovery timestamp to event entries. A successful, transactionally banked
15-artifact hunt stamps it once. All ranking responses then reveal **RUSTAVI** to
every player; seeing the ranking never unlocks another player's map. Owner preview
access alone never triggers the global reveal. The migration retains earlier
completed hunts without deleting scores or profiles.

The countdown says **STARTS IN** in bold green before Sunday 20 September, 15:00
Tbilisi time, then **ENDS IN** in bold red until Thursday 24 September, 21:00. Both
use the same condensed italic typeface as the event title. English and
Georgian rules are displayed side by side under **How scores & prizes work**,
stacking on narrow screens. Hidden mission copy only names Rustavi after the
first completed hunt. Civilian and patrol NPCs ignore stunt-ramp collision faces;
the player's solid ramp faces and launch physics remain active.
