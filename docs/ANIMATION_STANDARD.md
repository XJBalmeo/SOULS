# Animation standard

Existing hero/rat sheets use 100x100 frames; tile grid is 16px, distinct from character frame size. Preserve current character scale; larger bosses may define custom frames. Export transparent PNG with explicit frame width/height/count/spacing/margin, source file, facing, pivot/foot anchor, fps or per-frame duration, loop mode, collision body and attack windows. Avoid frame-to-frame size/pivot drift. Use integer pixel alignment and test mirrored sprites. For attacks specify telegraph, active hit frames, recovery, damage hitbox and SFX event; ensure one hit per intended strike. Preview at game scale, verify actual Phaser frame indices, and test transitions/death. Use PixelLab for candidates, Aseprite/LibreSprite for cleanup/export. Never assume generated sprite sheet is ready without inspection. Store editable sources or generation metadata and provenance.

Parry Death: specify knight downed/parry/revive and Death approach/strike/dissipate animation contracts; identify telegraph and single strike frame, align downed pivot and test at game scale. Reuse poses only when compatible. See PARRY_DEATH.md.

## Measured baseline (M1.5 initial standards, v0.1, 2026-11-13)
Measured from PNG headers and `GameScene.js`. These are the reference contract for new characters.

| Key | File | Frames (100x100, 1 row, no spacing) | Rate | Loop |
|---|---|---|---|---|
| idle | sprites/HERO/NEW_IDLE.png | 2 | 2 fps (500 ms) | yes |
| run | NEW_RUN.png | 8 | 12 fps | yes |
| jump | NEW_JUMP.png | 6 | 10 fps | no |
| roll | NEW_ROLL.png | 8 | 15 fps (`heroConfig.roll.frameRate`) | no |
| attack | NEW_ATTACK.png | 8 | 15 fps; hitbox active in middle third of frames | no |
| climb | NEW_CLIMB.png | 4 | per-frame durations | yes |
| crouch | NEW_CROUCH.png | 1 | 10 fps | no |
| rat_walk | sprites/ENEMIES/FAMINE/RAT_WALK.png | 6 | 10 fps | yes |
| rat_run | RAT_RUN.png | 6 | 15 fps | yes |
| rat_attack | RAT_ATTACK.png | 7 | 12 fps | no |

- **Body boxes:** per-state hitboxes in `heroConfig.hitboxes` inside the 100x100 frame, with `y + h = 100` so feet sit on the frame bottom (foot anchor = bottom edge of frame). New characters must keep feet on the bottom row of the frame.
- **Paths:** all lowercase folder `sprites/`; uppercase file names (`NEW_RUN.png`). Paths are case-sensitive on web hosts and the test server enforces exact case.
- **Legacy:** `HERO_*.png` sheets (older 7-frame attack/roll) are unused by code; keep until the owner decides.
- **Sources:** only `sprites/HERO/LEDGE.ase` exists as an editable source. Other sheets have no source or provenance file. Record source and license for every new sheet in `docs/ASSET_LICENSES.md`.
- Production validation: see "v0.3 production standards" below.

## v0.3 production standards (M1.5)
These rules apply to every new character sheet. The knight and rat are the owner's art and stay as they are.

### Frames and layout
- **Frames:** 100×100 for regular enemies, so the scale matches the knight and rat. Bosses and special encounters may use larger square frames; Death's Shadow uses 128×128.
- **Sheets:** one row per animation, left to right. File name `NAME_ACTION.png` in uppercase, inside `sprites/ENEMIES/<CHAPTER>/`. Death's Shadow lives in `sprites/ENEMIES/DEATHS_SHADOW/` because it appears in every chapter.
- **Anchor:** feet on the bottom row of the frame, so LDtk spawns place the body bottom at `entity bottom` and the sprite centre 50 px above it. Floating characters keep their hem about 7 px above the frame bottom.
- **Facing:** drawn facing right. Code mirrors the sprite with `setFlipX` and mirrors the body offset too: `x = 100 - offset - width`.

### Palette
- Every material uses exactly four tones: highlight, main, shadow and deep shadow. Pure black `#000000` is used only for voids (eye sockets, mouths, the reaper's face), as on the knight.
- There are no semi-transparent pixels. Fades are done at runtime with alpha or by an ordered-dither dissolve between frames.
- **Amber is reserved for attack warnings** (the Starved's eyes, the archer's arrowhead, Death's scythe). Don't use it anywhere else, so it always means "danger now".

### Animation timing
- Attack warnings last at least 500 ms. Frame durations live in the enemy's config object, so they can be tuned without touching art.
- Every attack follows the same pattern: a warning frame (telegraph), then the dangerous frames, then a recovery the player can punish.

### Pipeline and checks
- **Generator:** `tools/art/enemy_sprites.py` draws every v0.3 sheet from vector parts with automatic four-tone shading (light from the upper left). Rerun it with `python tools/art/enemy_sprites.py sprites/ENEMIES/FAMINE`. It finishes with a **palette audit**: no colour outside the declared ramps, and no semi-transparent pixels. Any failure exits non-zero.
- **PixelLab / Aseprite:** not available in this environment, so no external generator or export was used. If the owner later redraws sheets in Aseprite, keep the same frame sizes, anchors and four-tone ramps, and run the audit on the exported PNG.

### v0.3 sheets
| Animation | File | Frames | Timing |
|---|---|---|---|
| starved_walk | STARVED_WALK.png | 6 | 6 fps loop |
| starved_windup | STARVED_WINDUP.png | 4 | 150 ms each (600 ms warning) |
| starved_lunge | STARVED_LUNGE.png | 3 | 80 / 220 / 200 ms |
| starved_ground | STARVED_GROUND.png | 4 | 300 / 300 / 150 / 150 ms |
| starved_death | STARVED_DEATH.png | 4 | 120 / 160 / 160 / 400 ms, then fade |
| archer_idle | ARCHER_IDLE.png | 4 | 3 fps loop |
| archer_draw | ARCHER_DRAW.png | 5 | 120 / 120 / 160 / 200 / 200 ms (800 ms warning) |
| archer_release | ARCHER_RELEASE.png | 2 | 100 ms each |
| archer_reload | ARCHER_RELOAD.png | 4 | 150 / 150 / 150 / 300 ms |
| archer_death | ARCHER_DEATH.png | 4 | 100 / 120 / 140 / 400 ms, then fade |
| arrow | ARCHER_ARROW.png | 16×3 image | — |
| reaper_float | DEATHS_SHADOW/REAPER_FLOAT.png | 4 (128 px) | 5 fps loop |
| reaper_raise | REAPER_RAISE.png | 3 | 140 / 140 / hold (glint) |
| reaper_strike | REAPER_STRIKE.png | 3 | window / 160 / 400 ms |
| reaper_parried | REAPER_PARRIED.png | 4 | 220 / 140 / 140 / 140 ms |
| reaper_fade | REAPER_FADE.png | 4 | 100 ms each |
