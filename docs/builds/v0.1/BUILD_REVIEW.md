# Build review — Famine v0.1 Foundation

- **Active milestone:** M1 — Famine
- **Build / status:** v0.1 Foundation — **REVIEW**
- **Branch / commit / PR:** `famine/v0.1-foundation` (from `main` 47885db). Owner WIP snapshot 83be920. Build commit is the branch head. No PR opened and nothing merged.
- **Launch:** `npm start`, then open http://localhost:8000. The main menu appears directly, and New Game goes fullscreen. Any static server from the repo root also works, e.g. `python -m http.server 8000`. `file://` does not work.
- **Tasks:** M1.1 baseline (Lead + explorer), M1.2 v0.1 UI subset (Lead as programmer/UI), M1.5 initial standards (Lead as art/animation), QA (souls-qa).
- **Affected files:**
  - `js/UIScenes.js` (new)
  - `js/main.js`
  - `js/GameScene.js`
  - `index.html`
  - `package.json`
  - `tests/serve.mjs`
  - `tests/smoke.mjs`
  - `tests/qa-probes/*`
  - `docs/*`

## Acceptance criteria (v0.1 row)
| Criterion | Result | Evidence |
|---|---|---|
| Launch from menu | PASS | smoke "boots into MenuScene"; `screenshots/02-main-menu.png` |
| New Game enters existing Famine | PASS | smoke "New Game starts GameScene", hero 100/100, 6–8 rats; `06-gameplay.png` |
| Settings function | PASS | volume persisted and applied, hitbox toggle applies live, settings survive reload, corrupt data falls back; `04-settings.png`, `09-settings-over-pause.png` |
| Pause functions | PASS | P/Esc pause, hero frozen, Resume/Esc/P resume, controls work after resume, Quit to menu, re-entry clean; `08-pause.png` |
| Movement/combat regression | PASS (automated) | move L/R, jump, sword (−15 stamina), roll (−25 stamina); `07-attack.png`. Feel is not judged by automation. |
| Continue / retry disabled or explained | PASS | greyed out with a hint and no action on select; `03-continue-hint.png` |
| M1.5 initial standards | PASS (docs) | `docs/ANIMATION_STANDARD.md` measured contract |

## Automated tests
- `npm run test:smoke` gives **48/48 PASS**, exit 0, after the owner's round-1 changes (40/40 before them). Results are in `docs/builds/v0.1/smoke-results.json`.
- souls-qa exploratory probes are in `tests/qa-probes/probe1-4.mjs`. Run each with `node tests/qa-probes/probeN.mjs`. After the fixes they log zero console warnings.

## Human playtest
**PENDING.** Owner, please check:
- Real fullscreen. Esc in fullscreen exits to the click screen, which is the browser's behaviour; P pauses in-game.
- Menu feel.
- That movement and combat feel unchanged.

## Known issues
None of these block release.
- A key held through the pause must be re-pressed after resuming (deliberate key reset to avoid stuck movement).
- There is still no death at HP 0. v0.2 (M1.3) adds it.
- Room layout differs every New Game (unseeded). v0.2 (M1.4) adds stable IDs and a seed.
- Music and SFX volume are saved but there is no audio yet (M1.9). The hint text says so.
- The Credits roster is a placeholder. **Owner input needed.**

## Asset provenance
No new image or audio assets. The menu background reuses `levels/famine/FARBACKGROUND_LEVEL1.png`, and the font is the system Georgia serif.

## Decisions and assumptions
These are reversible:
- Pause opens with **Esc or P**.
- Settings live under `localStorage` `souls.settings.v1`, separate from the future save.
- Fullscreen is mandatory and is not a setting (owner).
- The owner's uncommitted work was committed first on the build branch to preserve it.
- `package.json` pins Puppeteer to the installed 25.12.0.
- The `.claude` and `.agents` workflow kit is committed. The original zip and the duplicate master-prompt copy are left untracked.

## Routing summary
- Lead: Opus 5.5 (session model).
- Explorer: Haiku 5.5 (T0, via the built-in Explore agent, since the native agents had not been discovered yet).
- QA: `souls-qa`, Sonnet 5.5. A first general-purpose attempt failed on an auth error with no output.
- No escalation to the architect.

## Next ready tasks (after approval)
v0.2 Combat & Survival:
- M1.3 death and hurt feedback, and shared per-strike damage.
- M1.4 versioned save, seeded and stable room IDs, checkpoints (full HP and stamina, enemy reset), Continue, New Game confirmation.
- Enable the Retry and Continue items.

## Owner decision
- **Decision:** APPROVED (owner: "lets proceed to v0.2")
- **Review date / reference:** 2026-11-13, in the Claude Code session, after change rounds 1-3 (fullscreen/title/white text; menu dim 58.92%; Knight Warrior font)

## Owner change requests — round 1 (2026-11-13) — done, back in REVIEW
1. Removed the Fullscreen option from Settings, because fullscreen is mandatory.
2. The game boots to the main menu only, with no paused overlay. New Game enters fullscreen, and the paused overlay appears only when fullscreen is left during gameplay.
3. The title is now `sprites/title.png`, animated:
   - Frames 1-3 loop on the menu.
   - New Game plays frames 4-5 and holds frame 5, then the game starts.
   - All timings are adjustable in `TITLE_CONFIG` at the top of `js/UIScenes.js`: `idleFrameMs` 200, `startFrameMs` 80, `startDelayMs` 1500, `fadeMs` 250, `scale` 4.
4. Menu text is white (`UI.COLORS.bone`). Green stays as the selection highlight.

Smoke tests were added for each change. Screenshots: `02-main-menu.png`, `05b-title-start.png`, `09b-fullscreen-exit-overlay.png`.

`tests/qa-probes/probe1.mjs` section G toggles the removed Fullscreen setting and is now obsolete.
