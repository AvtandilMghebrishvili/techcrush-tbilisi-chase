# Finish screen, sharing and level conditions

> Current 2.0 rules: all three cities start open; classic cornering and adjustable driving feel; a 180-second night-first Auto cycle; four new earned cars; visual result cards. See [version 2.0 details](BATUMI.md). Earlier measurements and release descriptions below retain their original context.

A successful level requires six checkpoints and eight seconds of escaping the police. The result overlay opens immediately with the level, score and a large **clear time**. The timer counts active wall time, including rewind; pauses, menus, loading and hidden tabs are excluded. Checkpoints play a short two-note cue and a completed level plays a distinct four-note finish. Enable **Sound** in the toolbar to hear them.

After the server saves the finish and reward, the screen fetches **Overall position** and **Level time rank** once. Overall ranks use career progress; time ranks compare the current level/course across all cars and builds. They are separate measures. Equal displayed times share a time rank. The full leaderboard has car/stock filters for closer comparisons. Positions may change as other people finish. A network error leaves the saved result and continuation buttons usable, with a manual ranking retry. Guest/private drivers see a prompt to choose a public name instead of a fictitious rank.

One earned box reveals immediately after settlement. Equip a stronger reward, sell it or keep it for fusion, then choose **Next · Level N** or **Garage · Fuse & Upgrade**. The next button names the upcoming lighting condition. Rewards settle once; restarting, sharing or refreshing the rankings does not award extra currency or boxes.

## Sharing

**Share to Facebook** opens Facebook's share composer with the result URL. The player confirms the post; the game never publishes on their behalf. **Copy Result Link** copies the same link. No Facebook SDK or account permission is loaded by the game.

`/result/<run UUID>` serves the saved level, score, duration, car, build points and rewind count, plus a Play link and server-rendered Open Graph metadata. Opening it does not initialize WebGL. Later races cannot rewrite the finish. The current public driver name is displayed. Only listed profiles are exposed; hiding the driver also hides their result pages on subsequent reads. A social platform may retain a previously generated preview in its own cache. Preview presentation remains controlled by Facebook.

The additive `0003_massive_mephistopheles.sql` migration creates `race_results`. The garage update, fastest-time upsert and immutable result insert execute in one guarded transaction/batch. Replayed or conflicting reports cannot create extra rewards or alternative shared results. No private garage key, inventory or full profile appears in the page.

## Routes and conditions

Current courses `tbilisi-1.16` and `kutaisi-1.1` retain wider roads, full arch-footprint clearance and a stable hash to shuffle six district destinations and their visiting order. Candidate pools are prepared once and layouts use a bounded 32-level cache. Level 1 keeps its familiar route. Every player sees the same layout for a given level/course, so reloading cannot reroll a faster route.

Auto lighting starts at dawn, night or day using a shuffled three-level bag. The first three levels are dawn/night/day. The full morning/noon/dusk/night/dawn cycle lasts **240 active simulation seconds**, and rewinds with the world. Manual Day/Night/Dusk choices remain available; these are casual community rankings, not locked competition settings.

Some levels receive one 24-second light shower, with a fade in/out. It uses 144 GPU-animated line segments, one 4,608-byte static buffer set, one draw call, no added media, shadow pass, reflections, splash simulation, interval or independent animation loop. Manual lighting disables automatic showers. The exact local rendering measurement is in [Performance](PERFORMANCE.md); it is not a universal phone performance guarantee.

## Roadside calibration and saved progress

Trees and bridge rail openings test the rendered asphalt union, including widened junctions. A one-time calibration moves linked lamp/sign/bench collision points and their visible group together onto dry roadside space outside building footprints. Their immediate breakage and rewind behavior use those calibrated positions.

Existing keys, cars, grades, credits, boxes, levels and community scores remain intact. Old timed results remain accessible under **Level Times → Course → Archive · 1.13**; the new course is the default. Already-open 1.13 clients can still settle their original course without mixing their times into the new table.
