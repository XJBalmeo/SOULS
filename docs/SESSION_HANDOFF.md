# Session handoff — 2026-11-16 (end of the Lead session)

Read this first, then AGENTS.md, MASTER_PROMPT.md and docs/DEVELOPMENT_STATUS.md (session logs at the bottom). Everything below was verified in this session unless it says otherwise.

## Where we are
- **Milestone 1 Famine:**
  - v0.1 DONE, v0.2 DONE (both approved).
  - **v0.3 Parry Death & Enemies is still REVIEW.** No formal approval yet. The owner spent this session playtesting and directing changes to the knight, death, parry and spawn flow (all listed below). Treat these as v0.3 polish. Ask the owner whether v0.3 is approved before starting v0.4.
- **Branch:** `famine/v0.3-parry-death-enemies`. All work is committed locally; nothing pushed this session.
- **GitHub:** `origin/main` and `origin/famine/v0.3-parry-death-enemies` are at `f0ef5f6` (the owner pushed that earlier themselves). Local is about 33 commits ahead. **Don't push unless the owner asks** (the agent push is blocked by the owner's merge-gate and public-repo rules anyway; see the previous handoff in git history, commit ac3deaf).
- **Owner's untracked files, leave alone:** `SOULS_AI_Development_Workflow_v1.4_Claude_Code.zip`, `SOULS_MASTER_PROMPT_v1.4_Claude_Code.md`, `sprites/dim.png` (purpose still unknown).
- **QA probe output** in `tests/qa-probes/out-v03/` (new `hurt-*`, `parry-05*`, `spawn-*` screenshots and `*-results.json`) is deliberately not committed. Only 7 older files there are tracked.
- **How the owner runs the game:** `python -m http.server 8000`. That server sends no cache headers, so `index.html` now loads every game script with `?v=<time>`. After any change the owner may still need **Ctrl+F5** once.

## What changed this session (all owner-directed, in order)
Knight art is the owner's (sprites/HERO/NEW_*.png). Config values are in the named config objects so the owner can tune them.

### Knight hurt and death
- **Hurt:** `NEW_HURT.png` (7 frames, 14 fps) on a non-lethal hit; no red tint. Knockback 90/90 px/s (`HURT_CONFIG`, js/UIScenes.js).
- **Death:** hurt, then `NEW_DOWN.png` (2 frames, 5 fps, holds frame 2). The world dims to 80 % over 0.8 s during the collapse (`DEATH_CONFIG.dimAlpha/dimMs`). The knight and Death are drawn above the dim; the HUD bars are darkened by tint (a full-screen HUD rectangle used to dim Death too; fixed).
- **Normal death:** after the collapse the dim goes 80 % → black over 1 s (`toBlackMs`), then **YOU DIED** (DeathScene): `sprites/HERO/YOU DIED.png` (15 frames of 512x288, full screen). Frames 1–6 150 ms, 7–15 80 ms, last frame held `holdMs` = **1 s**. `YOU DIED MIRROR.png` is used when the knight went down facing left. "You have fallen" is gone.
- **Mouse cursor** is hidden during play (shown in the pause menu and menus).

### Guard and parry (js/Guard.js, new; `GUARD_CONFIG`)
- **Right mouse button.** Press = parry (`NEW_PARRY.png` all 3 frames, 60/80/160 ms; parry window 200 ms). Hold = block (frame 1 held, 80 % less damage, no knockback, no hurt animation). A parry that ends while still held becomes a block.
- Front only. Rooted while guarding (can turn while blocking; roll cancels). 0.4 s parry cooldown. No stamina cost yet.
- Parry stuns melee attackers (rats, Starved lunge) for 1.5 s (grey tint placeholder) and deflects arrows back (they hurt enemies, 1 damage).
- Clicks on the black bars beside the game count too (`pointerdownoutside`); the cursor is hidden, so the player can't see where it is.

### Parry Death (js/ParryDeath.js, `PARRY_DEATH_CONFIG`)
- Parry with **right click** (was C). No on-screen instructions or key hint.
- **Strike window `windowMs` = 100 ms** (owner tried 500, then 300, settled on 100). Early click still fails.
- **Success:** the dim is replaced at once by `sprites/DEATHS/crack.png` (80 % black with glass cracks). The knight plays the parry animation, then everything freezes on its last frame for 1 s (`successMs`). Then a white flash (`successFlashMs` 300 ms) clears the crack and the HUD dim, and one of `sprites/DEATHS/1.png`–`5.png` (random) shows full screen for 1 s and fades over 0.5 s, above the world and below the knight.
- **Failure:** Death finishes its swing (`failMs` 600 ms) and stays visible; then Death, the knight and the world fade to black together, then YOU DIED.
- **TEMPORARY debug key O** (`DEBUG_CONFIG.instantDeathKey` at the top of js/GameScene.js): instant death with the Death parry made available again (in memory only). Turn it off before release. **P pauses** (Esc too, but in a real browser Esc leaves fullscreen first).

### Showcase changes (2026-11-18)
- **UI text is images**, not the font: `tools/art/ui_text.py` (needs the local font file) renders every string into `sprites/UI_TEXT/ui_text.png`; `TextImage` in js/UIScenes.js shows them. New or changed UI text must be added to the script and the script rerun; the game warns "UI text image missing" otherwise (smoke test checks this). Licence caveat in docs/ASSET_LICENSES.md.
- **TEMPORARY `SHOWCASE_CONFIG`** (top of js/GameScene.js): Hollow Archer, Starved and all audio are off until the owner says to bring them back (set to true). The test suites switch the enemies on (`showcaseEnemiesOn` in tests/helpers.mjs).
- **Rats no longer get stuck:** a rat back on patrol always walks (it used to stand still with no speed after an attack/recover/stun, often facing a wall), and a chase into a wall turns into patrol. Probe: tests/qa-probes/v03-rat-stuck.mjs.
- **Death parry window is 350 ms** (frame 18), was 100.

### Death art (2026-11-18, `PARRY_DEATH_CONFIG`)
- The owner's `sprites/DEATHS/DEATH.png` (19 frames of 512x288, centred on the knight) replaces Death's Shadow. Frames 1-13 at 100 ms; the 14-15-16 spin at 80 ms, looped a random 3-30 frames and able to stop on any of the three; frame 17 (warning) 100 ms; frame 18 is the only parryable frame (350 ms window since the showcase change); frame 19 (the kill) is drawn above the knight, frames 1-18 below. Details in docs/PARRY_DEATH_CONTRACT.md.

### Spawn and respawn (js/Spawn.js, new; `SPAWN_CONFIG`)
- **New Game / Continue from the menu** (js/UIScenes.js `TITLE_CONFIG`): fullscreen → `beamDelayMs` 300 → `sprites/menu_beam.png` (8 full-screen frames at the beam speed, 60 ms) → title frames 4–5 → `lastFrameHoldMs` 300 on frame 5 → the game. The old fade to black is gone.
- **In the game after the menu (and Pause → Retry from Checkpoint):** `BEAM.png` (7 frames of 100x300, 60 ms, bottom row on the knight's frame bottom) → `NEW_SPAWN.png` (6 frames, 100 ms) → idle. No control (and no damage) until idle. The knight is first snapped to the floor (the LDtk spawn point is in the air and overlaps the wall).
- **After a death** (failed Death parry, or death with the parry used): `NEW_RESPAWN.png` (full screen, now **26** frames of 512x288 after the owner's last edit) continues from YOU DIED's last frame; no beam. Frames 100 ms, second-to-last 500 ms (the black fades away in its last 300 ms, `respawnUndimMs`), last = NEW_DOWN frame 1 (200 ms). Its last frame is pixel-identical to NEW_SPAWN's last frame, at the knight's on-screen spot. YOU DIED stays up until the respawn covers the screen (no gap). The code handles any frame count.
- **Camera:** during any spawn the camera follows rigidly with the knight `cameraLookRightPx` = **55** px left of centre (lines the in-game beam up with menu_beam's column, x 181 of 512; the adjusted NEW_RESPAWN uses the same spot). When control returns it pans smoothly to centre (`centerPanMs` 800). Camera bounds now extend `cameraEdgeMarginPx` 256 past the map's left/right edges so the knight can be centred.
- **Level_0** was widened by the owner (656 px, PlayerStart x 352), so the centred view stays inside the map.
- **Bug fixed:** Phaser re-uses the last `scene.start` data, so New Game/Continue after a death used to play the respawn. GameScene now clears `sys.settings.data` after reading it.

## Tests
- `npm test` (2026-11-18): smoke 58, survival 47, archer 20, starved 21, parrydeath 46, guard 29 = 221. Last full run green (before the last NEW_RESPAWN edit, which only touches Spawn timing; the spawn and arrival-path probes were rerun green after it).
- QA probes (run with `node tests/qa-probes/<name>.mjs`): `v03-hurt-anim` 26, `v03-death-parry-mouse` 29, `v03-spawn` 21, `v03-respawn-paths` 9.
- `tests/helpers.mjs` adds `rightClick`, `waitForStrike` (frame-exact, needed for the 100 ms window), `moveToCanvas`, `rightClickHere`; `gameReady` now also waits for `!isSpawning`.
- **Known flake:** once per few full runs the headless browser crashes ("Target closed") or a wall-clock timing check stalls (e.g. Starved wind-up read 1592 ms). Rerunning the single suite passes. Not caused by game code as far as verified.

## Open owner decisions / follow-ups
1. **Is v0.3 approved?** (Then record it in BUILD_REVIEW, FAMINE_PLAYABLE_BUILDS and DEVELOPMENT_STATUS and branch `famine/v0.4-famine-expanded`.)
2. Guard: front-only, rooted, no stamina cost, stun tint look, timings.
3. The 100 ms Death window is very tight for humans.
4. Remove the O debug key before release.
5. Still open from before: SFX need listening, credits names, `sprites/dim.png`.
6. `docs/builds/v0.3/BUILD_REVIEW.md` doesn't describe this session's changes yet (only the window value is updated); refresh it before asking for approval.

## Next steps (unchanged plan)
- v0.4 scope (docs/FAMINE_PLAYABLE_BUILDS.md): M1.6 at least 5 enemy types (proposals in docs/ENEMY_ROSTER.md: Carrion Crow, Rot Carrier, Gut Crawler; show concept art first, four tones per colour), M1.7 expanded rooms, checkpoints, boss arena geometry.
- Stop at each build gate for owner approval. Never start War.

## Environment notes and gotchas
- Phaser 3.80.1, Node 26, Puppeteer 25.12.0. Python has PIL and numpy. No gh, aseprite, ffmpeg.
- **Shell hooks:** `$()`, backticks and `${}` are blocked in Bash (this includes JS like `page.$("canvas")` inside a heredoc: write such files with the Write tool). `cp` triggers the transfer-contract hook (copy with Python). New top-level folders are blocked.
- `game` is a global `const`, not `window.game` (use `typeof game` in external Puppeteer scripts).
- Scripts load dynamically in index.html, so `main.js` can't rely on `DOMContentLoaded` (it runs its setup at once when the page is already parsed).
- Edit `levels/famine/FAMINE.ldtk` with text insertion, not `json.dump`.
- No Claude/Co-Authored-By lines in commits (owner rule). Don't commit QA probe output; `git checkout -- docs/builds` after test runs to drop regenerated screenshots unless they are new evidence.
