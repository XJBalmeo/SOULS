# Parry Death — implementation contract (M1.4A, v0.3)

The design is by `souls-architect` (Opus 5.5, 2026-11-13). The Lead implemented it in `js/ParryDeath.js` and the GameScene hooks. The spec is `PARRY_DEATH.md`. **The owner still has to review the key, the timings and the presentation.** Every value below is a config default.

## Ownership
- **`js/ParryDeath.js`** holds `PARRY_DEATH_CONFIG` and `ParryDeathEncounter`. GameScene creates one encounter per run in `create()`. It is not a separate scene: it must use GameScene's camera and clock, so that the normal pause freezes it.
- **Hook:** `takeDamage(amount, source)` calls `onFatalDamage(source)` when HP reaches 0.
  - If `parryDeath.canTrigger()` is true, it calls `trigger(source)`.
  - Otherwise it calls `die()`.
  - `takeDamage` returns early once HP is 0, so a second fatal hit in the same frame does nothing.
- **Guards:**
  - `isPlayerInvulnerable()` returns true while an encounter is active.
  - `hurtPlayer()` adds no knockback or tint while an encounter is active.
  - `HollowArcher.fire()` returns early while an encounter is active.
- **Enemy list:** `GameScene.getEnemySprites()` is the single list used to freeze and resume rats, archers and the Starved. New enemy types register there.

## States
`IDLE → DOWNED → DEATH_APPROACH (DEATH.png frames 1-13, then the 14-15-16 spin looped a random number of frames) → TELEGRAPH (frame 17) → SINGLE_STRIKE (frame 18, the parry window) → frame 19 on a failure`

From the window there are two outcomes:
- `PARRY_SUCCESS → REVIVE → IDLE`
- `NORMAL_DEATH → die()`

`resolve()` runs once per encounter. Phase timing uses the encounter's own `elapsedMs`, which `GameScene.update(delta)` advances. Pausing the scene therefore freezes it, and nothing compares against `time.now`.

## Config defaults (proposals)
| Key | Default | Meaning |
|---|---|---|
| parry input | Right mouse button | Owner 2026-11-14 (was the C key). Not the attack button: someone mashing attack at the moment of death would trip the early-press rule |
| downedMs | 600 | Knight collapses; presses are ignored |
| frameMs | 100 | DEATH.png frames 1-13, 17 and 19 (owner 2026-11-18) |
| spinFrames / spinFrameMs | 14, 15, 16 / 80 | The spin loop (owner 2026-11-18) |
| spinMinFrames / spinMaxFrames | 3 / 30 | Random spin length in frames (0.24-2.4 s); it can stop on any of the three, then frame 17 |
| windowMs | 350 (owner 2026-11-18; was 100) | Frame 18, the strike: the only moment a press counts |
| earlyPressFails | true | A press on frames 1-17 spends the attempt; Death then ends the spin and goes on to frame 19 |
| offsetX / offsetY | 0 / 0 | Where the 512x288 frame's centre sits relative to the knight (0, 0 = knight in the middle of the screen) |
| reviveInvulnerableMs | 1500 | Protection after revival |
| successMs / reviveMs / failMs | 700 / 500 / 600 | Presentation |
| clearRadiusPx / pushbackVelocityX | 96 / 220 | Enemies close by are pushed back and calmed |
| forcedSpinFrames / rng | null | Test seams |

**Anti-hold:** only fresh `keydown` events count, and `event.repeat` is ignored. A key held from before the window can never win.

## Persistence
- **At trigger,** before any input: set `SaveManager.campaign.parryDeathUsed = true`, then call `SaveManager.write()`. `SaveManager` merges the flag monotonically.
- **If the write fails:** a console warning is logged, and the flag stays true in memory for this session. No reload protection is promised.
- **Reload mid-encounter:** Continue resumes at the checkpoint, and the opportunity stays spent.
- **New Game:** resets the flag.
- **Known limit:** if storage fails *and* an older save remains, a reload can bring the encounter back.

## Outcomes
**Success:**
- Full HP and stamina; the HUD bars refill.
- 1.5 s of invulnerability.
- Arrows in flight are cleared, and archers that were drawing lower their bows.
- The enemy that dealt the fatal hit, and any enemy within 96 px, are calmed and pushed back if no wall is in the way. Enemies keep their HP and positions.
- Physics resumes. The scene is not restarted.

**Failure:** the strike lands, Death fades, and `die()` runs. That shows the normal death screen and the checkpoint restore.

## Presentation
- **Knight:** no new knight art.
  - Downed: the owner's NEW_HURT then NEW_DOWN sheets, held on the second down frame (owner 2026-11-14).
  - Parry: attack animation with a white flash.
  - Revive: back to idle.
- **Death** (owner 2026-11-18): the owner's `sprites/DEATHS/DEATH.png`, 19 full-screen frames of 512x288, centred on the knight. Frames 1-18 are drawn below the knight (above the dim), frame 19 above him. On a parry Death holds frame 18 through the freeze and disappears in the white flash. The old Death's Shadow sprites in `sprites/ENEMIES/DEATHS_SHADOW/` are no longer loaded.
- **Knight parry** (owner 2026-11-14): a successful parry plays the knight's own parry animation (NEW_PARRY.png), the same one used against enemies (js/Guard.js).
- **Failed parry** (owner 2026-11-14): Death shows frame 19 (failMs), then Death, the knight and the world fade to black together, then YOU DIED.
- **Prompt** (bottom of the screen): no instructions and no key hint (owner 2026-11-14). On success (owner 2026-11-14): the dim is replaced at once by sprites/DEATHS/crack.png (80 % black with glass cracks); the knight's parry plays and everything holds on its last frame for 1 s (successMs); then a white flash removes the crack screen and the HUD dim, and one of sprites/DEATHS/1.png to 5.png (random) shows for 1 s above the world and below the knight, then fades out over 0.5 s. On failure the game goes straight to the full-screen YOU DIED animation (owner 2026-11-14).
- **Sounds:** reaper_arrive, reaper_telegraph, scythe_swing, parry_clang, parry_fail, revive. They pause with the scene.

## Cleanup
On scene shutdown (restart, Retry, Quit, New Game), `destroy()` runs. It removes the key and pause listeners, stops sounds, and destroys the sprite and prompt.

## Tests
`tests/parrydeath.mjs`: 44 checks. They cover:
- a real arrow kill parried at default timing;
- same-fight revival;
- early, late and held-key failures;
- one encounter per campaign after either outcome;
- duplicate fatal hits in one frame;
- delay bounds;
- pause freezing the clock;
- fullscreen exit;
- Retry mid-encounter;
- reload plus Continue;
- New Game reset;
- unavailable storage.

There is no boss yet. Boss coexistence is tested in v0.5.
