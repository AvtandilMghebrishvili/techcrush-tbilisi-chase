# Roadside rewards and compact launch menu

Each city contains 48 TECHCRUSH boards with the Georgian subscription message “გამოიწერე! რას ელოდები? :დდ 😂”. The front and back read correctly. All sites are on dry roadside ground, clear of road lanes and building footprints.

## Earning coins

- Starting a new chase chooses exactly **three cash boards** from the 48 sites. They advertise **4,000 coins** each. The choice derives from the server-issued run identifier, so a reload cannot change the rewards of an already-issued ticket.
- Drive into a cash board to break it. The collision frame shows the reward in the existing bonus feed and increases run cash. Gold dots mark remaining cash boards on the radar; gold ₾ pins mark them on the full map.
- Other player-destroyed trees, poles, boards, street furniture and breakable rails award **25 coins per object**, up to **100 paid ordinary objects / 2,500 coins per run**. This modest reward has no level multiplier. The three 4,000-coin bonuses are separate from that cap.
- Linked supports are one object. A patrol breaking a decoration awards no player money. A broken object cannot pay again unless rewound, which also removes the original payment.
- Leaving, restarting or finishing banks run cash through the existing save system. The server validates the three selected board IDs, rejects duplicates and calculates payouts itself. Old clients without these optional counters continue to work. No profile reset or SQL migration is required.

As elsewhere in the game, validation checks plausibility; browser simulation is not a fully authoritative anti-cheat server.

## Police collisions

Normal patrols and SUVs cause up to **10 HP** in a solid hit; tanks cause up to **15 HP**. Lighter contacts cost proportionally less. Armor still reduces this damage and the existing 0.8-second player contact cooldown prevents one overlap from applying damage every physics tick. Cars have a base 100 HP, so these caps represent 10% and 15% before upgrades.

## Launch menu

The car picker shows stock studio photographs captured from the actual game models. Swipe horizontally, use the arrow buttons, or use keyboard focus to choose an available car. Requirements remain visible on locked cars. The full garage keeps its interactive 3D preview, current paint and fitted upgrades. City cards, reward details and launch actions have shorter labels; no heading or button needs a tiny clipped car name.

`render-car-previews.mjs` is an optional authoring tool. It starts a temporary localhost asset server, captures all eight models through an installed Playwright/Chrome runtime, writes the WebP files and closes both server and browser. Set `PLAYWRIGHT_MODULE` to the installed module entrypoint if Playwright is not available by package name. Regeneration is not required to run or build the game.

## Performance and checks

Two shared billboard textures, existing prop collision indexing and the existing bounded bonus feed handle this feature. No new live car-preview renderer or continuous menu loop is introduced. Eight static car photographs add about 90 KB combined. The hidden/pause rendering lifecycle stays in place.

Tests cover all three cities' dry, clear billboard sites; deterministic selection; linked contact payment; rewind; ordinary-object caps; server settlement and replay rejection; compatibility with old metrics; and patrol/tank damage limits. Browser QA covers real board contact and banking, every map, the mobile car carousel, gold map markers, and stopped rendering on pause.

Release verification: **199 automated tests passed**. The production asset check confirmed all 30 runtime assets were byte-identical to source. Chrome QA covered 1366 × 768, 390 × 844 and 844 × 390, verified all eight photographs loaded, checked car-name overflow and carousel controls, completed a 4,000-coin physical banner smash and server settlement, confirmed three gold map pins, and confirmed rendering stopped while paused. These are functional checks, not physical-phone performance benchmarks.
