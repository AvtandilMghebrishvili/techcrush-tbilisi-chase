# Changelog

## 1.2.0 — 2026-09-12

- Circular, clipped radar with bearing-correct edge markers and an air-support marker. Remove the dark center navigation panel and measure road-route distance.
- Use illustrated TECHCRUSH cover art on the mission card and garage showcase.
- Redesign the garage with a 14-part photographic-style atlas, rarity borders and labels, category filters, stock comparisons, and separate paid/free upgrade previews. Preserve all existing saves and reward odds.
- Change six legal checkpoint positions and visiting order per level. Replace rectangular gates with thick translucent branded arches and two-sided wordmarks/logo badges.
- Add larger 145-HP police SUVs from level 2 and 220-HP tracked blockade tanks from level 3. Give them distinct mass, clearance, acceleration and steering; cap tanks to preserve a mixed pursuit fleet.
- Add level-2 air support with animated rotors, searchlight, height-aware building occlusion, shared sightings, last-seen searching, roof clearance and limited pursuit speed. Rewind restores its observations and position.
- Add regression coverage for twenty levels of clear routes, fleet progression, bounded tanks, air visibility/escape/rewind, circular radar and every upgrade preview.

## 1.1.1 — 2026-09-11

- Restore the detailed Original 458 as a fourth selectable car; preserve existing garages, credits and installed parts when migrating profiles.
- Rebuild the three newer body meshes with fitted headlights, glass, mirrors, fenders, spoilers and model-specific exhaust outlets.
- Rotate every steering wheel about its fixed local shaft; keep front-wheel pivots centered. Use per-model cockpit eye positions.
- Replace flat headlight road patches with soft spotlights.
- Share solid, unbreakable bridge rail segments between rendering and physics, preserving road-width junction openings.
- Remove decorative bridge human figures, retaining the Mother of Georgia landmark.
- Make benches, bins, planters and street signs breakable; give props and falling trees an immediate visible impact response with rewind restoration.
- Recover surviving rollovers automatically after 0.8 seconds, including upside-down states without an existing flip timer.
- Add regression coverage for the actual licensed GLB, centered steering, fitted lights/exhaust, profile migration, immediate prop contact and repeated bridge-rail impacts.

## 1.1.0 — 2026-09-11

- Clear full building footprints from roads, correct the clock-building wing collision and connect three driveable bridges; Peace Bridge is an explicitly fictional driving adaptation.
- Prevent high-speed wall tunneling; break street, bridge, flag and sign poles with rewind support.
- Three distinct original sports-car models, higher speeds and visible equipment changes.
- Career levels with faster, more responsive police, larger waves and coordinated flanking.
- Server-saved anonymous garages, 14 parts × four tiers, three-slot boxes with duplicate drops, currency, installation, upgrades and salvage.
- D1/SQLite persistence, generated migration, private-key backup/restore, versioned writes and idempotent retries.
- Add collision, economy, upgrade-physics and persistence tests. CI now builds the Worker; remove static-only Pages workflow.
- Expand English documentation for saves, API, deployment and development.

## 1.0.0 — 2026-09-11

First complete public GitHub source release. This packages the expanded game previously developed through multiple private Sites deployments; the Sites deployment version number is independent of this source release version.

### Game

- A connected central Tbilisi street network with Rustaveli, Baratashvili and its bridge, Europe Square, Rike Park, Peace Bridge and Abanotubani.
- Reference-inspired Georgian architecture, Kartlis Deda, mountain terrain, flags, street furniture, detailed trees and two-sided TECHCRUSH branding.
- Three selectable 458 sports-car trims, modeled cabin and four camera views, procedural patrol sedans and mixed modern/classic civilian traffic.
- Responsive steering, reverse, grip/drift, rechargeable turbo, exhaust flames, smoke, skid marks and synthesized audio.
- Solid vehicle contacts, breakable trees, police damage/explosions/replacements, shared sightings, interception and roadblocks.
- Six checkpoints, scoring, repairs, escape/capture rules and timed reinforcements growing to twelve units.
- Four stunt ramps, airborne roll/pitch, landing rewards, rollover damage and upright recovery.
- Hold-to-rewind controls restoring up to five seconds of world state, including score, HP, patrol identities and broken trees.
- Keyboard and touch controls, pause on focus loss, route arrows, local minimap and chase HUD.

### Project and validation

- Complete browser source, vendored libraries, runtime assets, preparation scripts, source data and dependency lockfile.
- English setup, architecture, development, testing, deployment, contribution and asset documentation.
- Automated tests on Windows and Ubuntu; manually triggered GitHub Pages publishing configuration.
- 44 automated checks and recorded successful six-checkpoint driving runs for all three trims. Detailed scope and limitations are in [VALIDATION.md](VALIDATION.md).

The environment is an arcade approximation, not a one-to-one satellite scan. Physical phone and Safari validation, multiplayer and a persistent leaderboard are outside this release.
