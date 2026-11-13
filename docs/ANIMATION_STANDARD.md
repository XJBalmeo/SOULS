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
- Production validation (reference sprite approval, PixelLab check) remains for v0.3.
