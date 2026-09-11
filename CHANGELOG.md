# Changelog

## 1.6.0 — 2026-09-12

- Add a ten-minute automatic dusk/night/day cycle driven by simulation time, with a moon, subtle stars/clouds, warm occupied windows, streetlight halos and soft pools of light. Pause and rewind preserve the cycle.
- Add an Auto / Night / Day / Dusk control with a local display preference. Raise player headlight output after dark and retain daytime illumination for the garage studio.
- Reuse the existing HDR and facade assets. Limit street illumination to three shadowless local lights and two instanced effect batches of at most 64 lamps. Broken lamp bulbs, glows and illumination turn off on contact and return on rewind.
- Restyle the menu, car choices, garage, parts inspector, reward dialog, pause screen, touch controls and HUD with graphite surfaces, red TECHCRUSH accents and racing typography. Keep compact navigation and distinct part-grade colors.
- Replace the plain loading message with milestone-based preparation progress and a racing-strip gauge; warm shader programs before dismissing it. No artificial loading delay or added media downloads.
- Add narrow-screen header rows, readable single-column upgrade comparisons and a compact rewind control above the touch buttons. Respect reduced-motion preferences.

## 1.5.1 — 2026-09-12

- Reduce cockpit street chevrons from 3.7 m to at most 2 m wide, with separate hood, chase and aerial sizes and a projected-width limit for narrow screens.
- Fade nearby first-person guidance smoothly, keep a raised visible face, and animate brightness without bobbing or size pulsation. Update route samples every moving frame instead of stepping every 200 ms.
- Reduce the transparent direction/distance HUD, remove oversized cockpit overrides, stabilize number widths and adjust compact-screen placement.
- Add navigation regressions for frame updates, pause, finite rewind positions and projected sizes across all four camera modes.

## 1.5.0 — 2026-09-12

- Add an interactive studio with selected-car orbit/zoom, front/rear/wheel/interior views and explicitly labeled no-cost preview fits.
- Save free per-car preset/custom paint through the existing versioned, idempotent server API. Preserve all previous garage progress.
- Add 56 original 3D part-grade assemblies with distinct machining and material finishes, cached studio renders, detailed explanations, direct inspector purchase/install actions and animated exact before/after statistics.
- Fit tier-specific forged rims, tread/slick tires, stationary calipers and body-mounted wing assemblies to all four player models; keep stock Original 458 wheels and Vector wing.
- Refine cabins with a true body opening, footwell, headliner, upholstery/bolsters, model-specific instruments, trim and a Vector flat-bottom wheel. Preserve the original licensed cabin and shaft-centered steering.
- Use shared engine telemetry for cabin instruments; improve cockpit camera framing and raised, tilted, smaller street guidance without the nearest obstructing arrow.
- Suspend the world render behind the garage and stop the studio loop on close.

## 1.4.0 — 2026-09-12

- Add directional, bounded body deformation to all player cars, patrols and traffic: compressed panels, local creases, scuffs and projected glass cracks. Keep lamps/exhaust aligned and exclude rotating wheel/steering parts.
- Safely separate interleaved GLB position/normal attributes before deformation; preserve shared templates and restore exact rest vertices on repair/rewind. Prepare player damage geometry before driving.
- Keep charred wrecks solid until existing replacement timers expire; nearby traffic/patrol avoidance and recovery now account for wrecks. Prevent repeated wreck rewards.
- Add same-step material fragments and sparks; replace geometric fire blocks with soft fire/smoke sprites, brief light, bent metal fragments and gravity/bounce. Expand explosion duration to 3.8 seconds.
- Add one player destruction burst that finishes behind the game-over screen. Pause and rewind retain authoritative effect timing.
- Strengthen metal crumple and explosion sounds with layered transients, descending bass, filtered blast air and debris. Preserve the existing sound toggle.
- Add seven regression cases for deformation, original-asset isolation, repair/rewind, solid wrecks, single destruction events and deterministic effect cleanup.

## 1.3.0 — 2026-09-12

- Replace the single oscillator engine with four per-car hybrid voices: recorded engine texture, combustion harmonics, load-sensitive intake and smooth RPM/gear changes. Use the same gear telemetry in the HUD.
- Add immediate contact-driven wood, metal, stone, glass, landing and explosion effects, using eight compact CC0 audio assets with reproducible preparation and provenance.
- Add relative-speed stereo pass-by sounds for traffic and patrols; refine turbo spool/release, tire/road wind, drift, nearby sirens and air-support sound. Soften exterior audio in cockpit view.
- Run audio each rendering frame, deduplicate contact cues, bound effect voices, and clear transient sounds during pause, mute and rewind. Preserve the existing M/Sound control and browser gesture requirement.
- Add nine regression tests and validate the real mixer with Chromium audio rendering and a live driving check. No physics, economy or save format changes.

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
