# Bonus feedback and cornering

Animated notices appear beside the score, with the newest at the top. They show the amount actually awarded, including the current level coefficient. At most three are visible for 2.6 seconds of active play; reduced-motion settings remove the movement. Compact phone layouts keep the direction cue and thumb controls clear. Secondary credit lines are hidden on compact screens; the running credit total remains visible.

| Action                                  | Feedback                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Destroy a patrol through your collision | 750 base points and 350 base credits, scaled by level                     |
| Pass close to a traffic car safely      | 150 base points, scaled by level                                          |
| Finish a scored drift                   | Total points already earned during that drift; this is not a second award |
| Land a jump upright                     | The actual distance-based landing points                                  |
| Reach a checkpoint                      | The actual time-dependent points and level-scaled credits                 |
| Complete the escape                     | The actual health-dependent escape points and credits                     |
| Wreck city traffic                      | 120 base credits, scaled by level; no invented point award                |

Near passes require forward speed above 72 km/h, relative speed of at least 32.4 km/h, and approximately 0.18–3.2 metres of clearance beyond the projected vehicle bodies. The cars must cross alongside one another. Following close behind, a recent collision, falling into water and teleporting cannot count. One nearby traffic car cannot repeatedly award points at each road junction; it must separate by more than 35 metres before another pass can qualify. Rewind restores both the score and pass eligibility.

Version 2.0 restores the pre-1.17 classic cornering response, removing the added corner-scrub penalty. Speed still affects turn rate. Space / DRIFT releases rear traction, and mobile thumb drift can be combined with a committed nitro burst. Setup offers bounded steering and drift tuning with a classic reset. These shared rules apply to all three cities and eight cars.

The timed courses are `tbilisi-2.0`, `kutaisi-2.0` and `batumi-1.0`; older courses remain archived. Every ten cumulative banked patrol takedowns earns a TECHCRUSH box. Crossing the threshold during a chase shows a notice; finish or use the in-game Garage action to bank it. Rewind can undo an unbanked takedown.

The feed uses the existing HUD update and a maximum 16-event queue / three DOM rows. It has no timer, polling or independent animation frame loop. Paused/hidden gameplay pauses the finite CSS animation. Checkpoint progress dots are updated only when their state changes. No texture, vehicle model, render resolution or audio quality was reduced.
