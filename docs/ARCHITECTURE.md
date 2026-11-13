# Architecture baseline — verified M1.1 (2026-11-13, branch famine/v0.1-foundation)

Verified by static inspection plus a live headless-Chrome run (`npm run test:smoke`). Repo: https://github.com/XJBalmeo/SOULS.

## Runtime
- **Engine:** bundled `js/phaser.min.js` = Phaser **3.80.1** (checked via `Phaser.VERSION`). Arcade Physics, gravity 800, 1280x720 FIT, `pixelArt: true`, `debug: true` with drawing toggled off at runtime.
- **Launch:** any static server from the repo root. `npm start` → `tests/serve.mjs` (zero-dependency, exact-case paths like a Linux host) on http://localhost:8000. `file://` does not work (the LDtk JSON is fetched).
- **Scripts (classic, load order):** `phaser.min.js` → `GameScene.js` → `UIScenes.js` → `main.js`. No bundler or modules; globals `GameScene`, `MenuScene`, `PauseScene`, `SettingsScene`, `CreditsScene`, `SoulsSettings`, `UI`, `game`, `window.gameScene`.
- **Scenes** (array order = render order): `MenuScene` (boot) → `GameScene`; `PauseScene` and `SettingsScene` overlay a paused `GameScene`; `CreditsScene`.
- **Fullscreen is mandatory during play** (owner decision 2026-11-13). The game boots straight to the menu, windowed, with no overlay. New Game requests fullscreen. The DOM overlay `#fullscreen-overlay` (`sprites/pause.png`, hidden by CSS) appears only when fullscreen is left mid-run, and pauses `GameScene`. Clicking it re-enters fullscreen and resumes, unless the pause menu holds the game.
- **Title:** `sprites/title.png`, 5 frames of 177x39. Frames 1-3 loop on the menu. New Game plays frames 4-5 and holds frame 5, then the game starts. Timings and scale are in `TITLE_CONFIG` at the top of `js/UIScenes.js`.
- **Settings:** `localStorage["souls.settings.v1"]` `{masterVolume, musicVolume, sfxVolume, showHitboxes}`, type-checked and clamped on load; corrupt or unavailable storage falls back to defaults with a console warning. Independent from future campaign saves (v0.2).

## Controls (verified)
| Input | Action |
|---|---|
| A/D, ←/→ | move |
| W/↑ | climb up, rope vault |
| S/↓ | crouch, drop through, vault down |
| Space | jump / double jump |
| Z or left mouse | sword attack (15 stamina) |
| X or Shift | roll (25 stamina, i-frames) |
| Esc or P | pause menu (added v0.1). In browser fullscreen, Esc exits fullscreen first → overlay pause |
| Tab | hitbox debug toggle |
| Menus | ↑↓/W S select, ←→/A D adjust, Enter/Space/Z confirm, Esc/Backspace/P back |

## GameScene (js/GameScene.js)
- `preload` loads hero sheets `sprites/HERO/NEW_*.png` (100x100 frames), rat sheets `sprites/ENEMIES/FAMINE/RAT_*.png`, `levels/famine/FAMINE.ldtk`, tiles/ropes/ledges (16px, spacing 1), `FARBACKGROUND_LEVEL1.png`, HUD images.
- `create` resets per-run state (the instance is reused on New Game), builds `heroConfig` (hitboxes/offsets per state), `generateWorld`, animations through `createAnimOnce` (game-wide anim manager), rats, input, HUD (HP/stamina with delayed bars).
- **Rooms:** `generateWorld` builds Level_0, then 3 intermediates from Level_1–3, then Level_4, with doors aligned. `planRooms` takes the order from the save (`famine-room-0..4`), or on first build picks the templates from the campaign seed and saves them (v0.2; see SAVE_CONTRACT.md).
- **Combat:** sword hits go through `damageEnemy` (one hit per enemy per swing, using `strikeId`; `SWORD_DAMAGE` 1; rat HP 1). Rat bites register once per rat strike. Rat attack: `takeDamage(20)` with 1000 ms invulnerability + knockback; range 50, vision 300, cooldown 2000 ms. `takeDamage` is the **only** HP-reduction path.
- **Death (v0.2):** `takeDamage` reaching 0 calls `die()`. Physics pauses, input and pause are locked, a placeholder fall plays, then `DeathScene` appears and calls `restartFromCheckpoint()`. That `scene.restart()` rebuilds the saved map with full HP/stamina and fresh enemies. Retry from Checkpoint uses the same path. Save: `js/SaveManager.js`.

## Fixed in v0.1
- Rat sheets loaded from `Sprites/...` (capital S) → 404 on case-sensitive hosts; now `sprites/...`.
- Scene re-entry: duplicate `anims.create` warnings and a stale destroyed `this.rats` group reused on the second run; now guarded/reset.

## Known limitations / risks
- Unseeded RNG and no room IDs (save/restore needs these; v0.2).
- `BACKGROUND_LEVEL1.png` on disk but unused. `?v=Date.now()` cache-busting re-downloads hero sheets every load (harmless offline; revisit for release).
- Left mouse attacks; a mouse click that resumes the game can carry into an attack if the button is still held.
- Asset loads use `?v=` cache-busting only for some files.

## Parry Death integration notes (M1.4A — not implemented)
Fatal damage must be intercepted inside `takeDamage` (single path today; every future damage source must route through it). Pause is `scene.pause()` from `PauseScene`; the encounter needs its own timers that respect scene pause, and must close the pause menu path or block it during the strike window. Respawn hooks do not exist yet; they will come from M1.4 checkpoints. `parryDeathUsed` must live in the campaign save outside checkpoint snapshots.

## Proposed incremental architecture
Extract only when duplication or a requirement demands it: `SaveManager` (v0.2), shared damage on the existing `takeDamage` path (v0.2), enemy definitions (v0.3+), `AudioManager` (when audio lands, using the persisted music/SFX volumes). No engine migration.
