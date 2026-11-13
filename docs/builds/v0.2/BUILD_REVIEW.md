# Build review — Famine v0.2 Combat & Survival

- **Active milestone:** M1 — Famine
- **Build / status:** v0.2 Combat & Survival — **REVIEW**
- **Branch / commit / PR:** `famine/v0.2-combat-survival`, branched from `famine/v0.1-foundation` (bcef7ab). The build commit is the branch head. No PR opened and nothing merged.
- **Launch:** `npm start`, then open http://localhost:8000.
- **Tests:** `npm test` (smoke + survival).

## Tasks
- **M1.3 (combat):** shared enemy damage (`damageEnemy`, one hit per enemy per sword swing); enemy bites register once per rat strike; placeholder hurt and death feedback.
- **M1.4 (checkpoint and saves):** versioned save (`js/SaveManager.js`, `docs/SAVE_CONTRACT.md`), seeded and stored room layout with stable room-instance IDs, chapter-start checkpoint, full HP/stamina and enemy reset on restore, Continue, New Game confirmation.
- **M1.2 save-dependent items:** Continue, Retry from Checkpoint, confirmation prompt.

**Owner decisions applied (2026-11-13):**
1. The chapter start is the only checkpoint until v0.4.
2. Once physical checkpoints exist, activating one refills HP and stamina. Nothing to implement yet.
3. Death shows "You have fallen" for about 2 s, then respawns automatically.

## Acceptance criteria (v0.2 row)
| Criterion | Result | Evidence |
|---|---|---|
| Sword/roll/stamina/HP regression | PASS | smoke: move, jump, sword −15, roll −25 |
| Per-strike enemy damage | PASS | survival: a 3-HP rat takes exactly 1 damage per swing (3→2→1→dead); repeat hits in the same strike are ignored |
| Normal death | PASS | survival: a real rat bite at 20 HP kills the knight; input and pause are locked; the death screen shows (`screenshots/01-death-screen.png`) |
| Checkpoint restore: full HP/stamina, regular enemies reset | PASS | survival: respawn at 100/100, the killed rat is back, same layout, controls work (`02-respawn.png`). Pause → Retry does the same (`03-pause-retry.png`) |
| Stable map layout | PASS | the layout is saved as 5 room instances (`famine-room-0..4`); death, Retry, Continue and reload rebuild it identically |
| Continue | PASS | after a full page reload, Continue restores the same campaign and layout (`04-menu-continue.png`) |
| New Game confirmation | PASS | a prompt appears when a save exists, with Cancel as the default; Cancel keeps the save; Begin Anew replaces it (`05-new-game-confirm.png`) |
| Reload tests | PASS | Continue after reload; unreadable save → Continue disabled with an explanation, and the save is copied to `souls.save.v1.unreadable` before New Game replaces it (`06-corrupt-save-hint.png`) |
| Save safety | PASS | a stale tab can't overwrite another campaign; `parryDeathUsed` merges monotonically; validation rejects bad saves; unavailable storage → play continues in memory |

## Automated tests
- `npm run test:smoke` gives **48/48 PASS**.
- `npm run test:survival` gives **46/46 PASS**. Results are in `docs/builds/v0.2/survival-results.json`.
- `npm test` runs both and exits 0, over several runs.

**Independent QA (souls-qa, Sonnet 5.5):** no blocker or major defects. The probes are `tests/qa-probes/v02-edge1..3.mjs`. They covered death during attack, roll and knockback; double damage in one frame; pause or fullscreen exit during the fall and the death screen; spamming Retry; 8 deaths in a row; falling out of the world; HUD state after respawn.
- QA flagged heap growth across restarts. The Lead re-measured it with forced GC (`tests/qa-probes/v02-heap.mjs`): 30.2 / 34.5 / 31.1 / 36.9 / 30.4 MB over 20 restarts. **No leak.**

## Architecture review
`souls-architect` (Opus 5.5) returned APPROVE WITH CHANGES on the save contract. All six changes are applied and tested:
- stale-tab guard
- monotonic flag merge
- no overwrite when the backup fails
- duplicate-ID and chapter validation
- checkpoint reset when the layout is regenerated
- documented seed format

## Human playtest
**PENDING.** Owner, please check:
- how death feels (the fall, the 2 s screen, respawn)
- Continue after closing the browser
- the New Game prompt
- Retry from the pause menu
- that combat still feels the same

## Known issues
None of these block the build.
- Death uses a placeholder: a red tint, a fall and fade, and a text screen. The hero has no hurt or death animation sprites yet (an art task).
- If fullscreen is left during the death screen, the respawn happens behind the "paused" overlay. Cosmetic.
- If Esc and a lethal hit land in the same frame, the pause menu can open over the dead knight. Resume and Retry both recover correctly.
- Rat HP is unchanged at 1. The damage system supports any HP; rebalancing is a design decision.
- Chapter-transition saving isn't exercised yet, because Level_4 has no exit until the boss build (v0.5).
- Not tested: death while on a rope or vaulting; death during a double jump.

## Asset provenance
No new art or audio. Death text uses the Knight Warrior font (see ASSET_LICENSES.md).

## Timing knobs
`DEATH_CONFIG` at the top of `js/UIScenes.js`:
- `fallMs` 700
- `fadeMs` 500
- `screenMs` 2000

## Routing summary
- Lead: Opus 5.5.
- Architect: `souls-architect`, Opus 5.5 (T3 save contract).
- QA: `souls-qa`, Sonnet 5.5 (T2).
- No fallbacks needed.

## Next ready tasks (after approval)
v0.3 Parry Death & Enemies:
- M1.4A Parry Death, with a souls-architect state-machine design first.
- M1.5 production standards.
- M1.6 two new enemies (proposed: Starved and Hollow Archer). These need owner approval of the concepts before art starts.

## Owner decision
- **Decision:** APPROVED
- **Review date / reference:** 2026-11-13. The owner first requested changes: remove the main-menu key hints; P/menu leaves fullscreen; Resume re-enters it (commit 8088ded). The owner then said "lets proceed with the full plan in v0.3", which is recorded as approval.
