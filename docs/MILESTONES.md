# Career milestones (2.4)

All three cities are open from the start and keep their own endless level progress. Cars, credits and parts are shared across them.

| Reach in any one city             | Automatic reward                                          |
| --------------------------------- | --------------------------------------------------------- |
| Level 10                          | Falcon RS, Rioni GT and Coast X: all ordinary reward cars |
| Level 15                          | TECHCRUSH YouTuber Car                                    |
| Level 5, 10, 15, 20… in each city | One Mystery box + one Special box                         |

**Reaching** level 10 means successfully clearing level 9 and entering level 10. You do not need to complete level 10. Unlocks apply to every city immediately; the four starter cars stay available. City levels are not added together for unlocks. Each city earns its own five-level bonus, so reaching level 5 in all three cities earns three Mystery and three Special boxes.

## Open your bonus boxes

Use **Garage → Boxes**, or **Open Bonus Boxes** on a milestone finish screen. The normal level-clear Street box still opens first. Extra boxes remain in your saved garage until used.

| Box     | Coins per opening | Three independent part draws        |
| ------- | ----------------- | ----------------------------------- |
| Mystery | 1,500–3,000       | Gold 50%, Diamond 40%, Platinum 10% |
| Special | 4,000–7,000       | Diamond 65%, Platinum 35%           |

Every opening gives both coins **and** three parts. Coin totals are uniformly drawn from the inclusive integer range. All 14 part types are equally likely, independently of grade; duplicates are possible and count separately. Each milestone pair therefore gives **5,500–10,000 coins plus six parts** after opening both boxes. These amounts are fixed and do not use the chase level cash multiplier. There are no purchases with real money.

The reveal shows your awarded coins and rarity-specific part images. Install a stronger part immediately, sell a spare, or keep it for fusion. All Mystery/Special grades fit any unlocked car. Credits and parts are saved before animation; skipping, closing, or reloading cannot change the draw or erase its inventory.

Street boxes retain Bronze 55%, Silver 28%, Gold 13%, Diamond 4%. Hidden stunt boxes still give three Platinum parts. Every 10 banked patrol takedowns across cities still award a Creator box with three equally weighted Platinum/Emerald/Ruby/TECHCRUSH draws; this no longer unlocks the car for new players. Keep exclusive parts until reaching level 15, or sell them. Emerald and higher fit the TECHCRUSH car only.

## Existing saves and retries

- Already unlocked cars remain unlocked, even below the new thresholds.
- Pre-2.4 city cars earned by clearing level 5, including unclaimed car boxes, remain claimable. Old ten-takedown eligibility also remains honored.
- Every previously reached fifth level is credited retroactively once per city. For example, Tbilisi level 12 plus Kutaisi level 6 yields three Mystery and three Special boxes, plus the level-10 fleet unlock.
- Reopening menus, switching cities, rewinding, reloading and retrying a network request do not duplicate rewards. A three-city high-water mark records awarded milestones without an expanding list or per-level loop.
- Server settlement determines progression and unlocks; box draws, credits, inventory and decrement commit atomically with existing version checks and operation IDs. Competing tabs cannot spend the same box twice.
- Profile schema 6 is additive. Existing garage keys, coins, paint, equipment, fusion, city progress and leaderboard records remain intact. No database table migration or account setup is required.

## Validation

Nine focused tests cover level-10/15 transitions in all cities, fifth-level timing, very high endless levels, legacy migration, preserved early ownership, deferred creator parts, exact rarity boundaries, duplicate parts, immediate equip/replay rejection, and API retry/concurrent-spend behavior. Existing driving, physics, economy and community tests also run. Browser checks use isolated local SQLite fixtures, keeping public player data untouched.
