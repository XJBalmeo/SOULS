# Architecture baseline — verified M1.1 (2026-11-13, branch famine/v0.1-foundation)

Verified by static inspection plus a live headless-Chrome run (`npm run test:smoke`). Repo: https://github.com/XJBalmeo/SOULS.

## Runtime
- **Engine:** bundled `js/phaser.min.js` = Phaser **3.80.1** (checked via `Phaser.VERSION`). Arcade Physics, gravity 800, 1280x720 FIT, `pixelArt: true`, `debug: true` with drawing toggled off at runtime.
- **Launch:** any static server from the repo root. `npm start` → `tests/serve.mjs` (zero-dependency, exact-case paths like a Linux host) on http://localhost:8000. `file://` does not work (the LDtk JSON is fetched).
- **Scripts (classic, load order):** `phaser.min.js` → `GameScene.js` → `UIScenes.js` → `main.js`. No bundler or modules; globals `GameScene`, `MenuScene`, `PauseScene`, `SettingsScene`, `CreditsScene`, `SoulsSettings`, `UI`, `game`, `window.gameScene`.
- **Scenes** (array order = render order): `MenuScene` (boot) → `GameScene`; `PauseScene` and `SettingsScene` overlay a paused `GameScene`; `CreditsScene`.
- **DOM overlay** `#fullscreen-overlay` (`sprites/pause.png`): click-to-start gate (user gesture, also unlocks audio) and shown when fullscreen is left (if the Fullscreen setting is on). Dismissing it resumes `GameScene` unless the pause menu holds it.
- **Settings:** `localStorage["souls.settings.v1"]` `{masterVolume, musicVolume, sfxVolume, fullscreen, showHitboxes}`, type-checked and clamped on load; corrupt or unavailable storage falls back to defaults with a console warning. Independent from future campaign saves (v0.2).

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
- **Rooms:** `generateWorld` = Level_0 (start) + 3 intermediates picked with replacement from Level_1–3 via unseeded `Phaser.Math.RND.pick` + Level_4 (end); doors aligned. No room-instance IDs or seed → layout is not reproducible yet (M1.4, v0.2).
- **Combat:** sword overlap kills a rat outright (rat HP 1, no shared damage system). Rat attack: `takeDamage(20)` with 1000 ms invulnerability + knockback; range 50, vision 300, cooldown 2000 ms. `takeDamage` is the **only** HP-reduction path.
- **Death: none.** At HP 0 the hero keeps playing; there is no death, respawn, checkpoint or game over. (M1.3/M1.4, v0.2.)

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
