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
`IDLE → DOWNED → DEATH_APPROACH (float in + random hover) → TELEGRAPH → SINGLE_STRIKE (parry window)`

From the window there are two outcomes:
- `PARRY_SUCCESS → REVIVE → IDLE`
- `NORMAL_DEATH → die()`

`resolve()` runs once per encounter. Phase timing uses the encounter's own `elapsedMs`, which `GameScene.update(delta)` advances. Pausing the scene therefore freezes it, and nothing compares against `time.now`.

## Config defaults (proposals)
| Key | Default | Meaning |
|---|---|---|
| parryKeyCodes / label | KeyC / "C" | Not Z: someone mashing attack at the moment of death would trip the early-press rule |
| downedMs | 600 | Knight collapses; presses are ignored |
| approachMs | 1200 | Death floats in |
| delayMinMs / delayMaxMs | 600 / 2000 | Random hover before the warning |
| telegraphMs | 500 | Scythe raised, amber glint and rising ring |
| windowMs | 300 | The strike: the only moment a press counts |
| earlyPressFails | true | A press during the approach or warning spends the attempt |
| reviveInvulnerableMs | 1500 | Protection after revival |
| successMs / reviveMs / failMs | 700 / 500 / 600 | Presentation |
| clearRadiusPx / pushbackVelocityX | 96 / 220 | Enemies close by are pushed back and calmed |
| forcedDelayMs / rng | null | Test seams |

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
  - Downed: last crouch frame, darkened.
  - Parry: attack animation with a white flash.
  - Revive: back to idle.
- **Death's Shadow:** original sprites in `sprites/ENEMIES/DEATHS_SHADOW/` (float, raise, strike, parried, fade), 128×128 frames.
- **Prompt** (bottom of the screen): "Death comes for you. Press C as the scythe falls." During the window it shows a large "C". On success it shows "DEATH IS DENIED"; on failure, "Too soon." or "Too late."
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
