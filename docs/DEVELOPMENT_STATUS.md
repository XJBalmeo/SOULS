# Development status

Current milestone: M1 — Famine. Current build: **v0.2 Combat & Survival — REVIEW** (2026-11-13; v0.1 Foundation DONE, owner approved 2026-11-13). Owner build approval for v0.2: PENDING. Review packet: `docs/builds/v0.2/BUILD_REVIEW.md`. Branch `famine/v0.2-combat-survival`. Branch: `famine/v0.1-foundation` (not merged). Review packet: `docs/builds/v0.1/BUILD_REVIEW.md`. Next tasks after approval: v0.2 — M1.3 combat/death, M1.4 checkpoint/save, save-dependent M1.2 (Continue, retry, New Game confirmation).

## Existing implementation (static inspection)
Browser Phaser game, hero movement/sword/stamina, rat enemy, Famine artwork, modular randomized rooms, parallax, fullscreen overlay. See ARCHITECTURE.md. No live playtest or automated baseline executed for this kit.

## Decisions confirmed
Knight stops apocalypse; fixed Famine→War→Conquest→Death; randomized intermediate rooms; checkpoint retry full health/stamina and regular enemies reset; current sword initially; story unlocks weapons/abilities; distinct Horseman forms; at least five regular enemies per chapter.

## Open / blockers
Verify bundled Phaser version, controls and live baseline; confirm actual tool installation, PixelLab cost/quality and local GPU; test LDtk MCP on copy; approve final enemy/boss concepts and future unlocks before production; decide chapter length/checkpoint boundaries when needed. Potential case-sensitive rat paths require testing. No claims of completed gameplay tasks.

## Session log template
Date / agent / task ID / status:
Changes and files:
Tests (commands, results, evidence):
Decisions and assumptions:
Blockers / unresolved issues:
Next task:
PR / branch:

## v1.1 workflow update
Confirmed: Parry Death once per run; first fatal hit downs knight, Death attacks once at random, timed parry restores full health/stamina, failure ordinary death. Working run definition is entire campaign; consumed at trigger and persisted. M1.4A BACKLOG, not implemented. Input, timing, art and safe revival details pending review. Lead Orchestrator role formalized; M1.1 remains next task. No tools installed or runtime tests performed.

## v1.2 build status
All gameplay build gates remain unimplemented/unverified for this kit. v0.1 READY; v0.2–v1.0 BACKLOG. See `FAMINE_PLAYABLE_BUILDS.md`.

Build review log: build / gate status / branch & commit / task IDs & owners / launch instructions / tests & screenshots / blockers / owner decision and date / next ready tasks. Record actual evidence; never advance without explicit approval.

## v1.3 workflow update
Documentation-only token-efficiency update. Active build unchanged: v0.1 READY, M1.1 next; no new gameplay implementation or tests. Read PROJECT_BRIEF.md and CONTEXT_POLICY.md; use scoped task context and concise handoffs. Optional Ponytail/Caveman/RTK/Headroom not installed or benchmarked. For each session, record usage metrics if available (model/input/output/cache tokens, retries/cost, quality/test evidence); otherwise note qualitative efficiency, no estimated savings presented as actual.

## v1.4 workflow update — Claude Code
Native configuration and model-routing policy added; no gameplay progress changed. Active build v0.1 READY / M1.1 next unless newer repository status exists. Four agent definitions and native skill adapters statically validated; live Claude Code discovery, account model availability, MCP and game tests remain pending M1.1. No external tools installed. For each delegated task record tier / worker / requested model / actual model if reported / reason / escalation or fallback / actual usage if available / evidence. Preserve current gate and owner approval state.

## Session log — 2026-11-13 — Lead Orchestrator — M1.1, M1.2 (v0.1 subset), M1.5 initial — REVIEW
- Lead model: Opus 5.5 (owner-selected session model; the kit recommends Sonnet for the lead). Workers:
  - M1.1 explorer, T0: requested Haiku, actual Haiku 5.5 (agent-reported). The built-in Explore agent stood in because the project agents were extracted mid-session and were not discovered yet.
  - v0.1 QA, T2: first attempt was general-purpose/Sonnet and failed on an API authentication error before producing any output. Rerun on the native `souls-qa`; requested Sonnet, actual Sonnet 5.5 (agent-reported). No Opus architect call. Per-agent token usage was not recorded.
- Setup: the v1.4 kit was extracted from the zip at the repo root with no overwrites (MASTER_PROMPT.md and SOULS_MASTER_PROMPT_v1.4 are byte-identical). The owner's uncommitted GameScene.js and LEDGE.ase work was preserved as its own commit (83be920) on the build branch. `main` is untouched.
- Baseline (M1.1): Phaser 3.80.1; launch with `npm start` → http://localhost:8000; controls, rooms and combat are documented in ARCHITECTURE.md. Defects found:
  - Rat sheets used `Sprites/`, which 404s on case-sensitive hosts. Fixed.
  - Scene re-entry produced duplicate animation creation and reused a stale rat group. Fixed.
  - There is no death at HP 0. Open; this is v0.2 work.
  - The room RNG is unseeded. Open; this is v0.2 work.
- Tools: Node 26.10 and Puppeteer 25.12.0 (pinned to the installed version; the old `^` range resolved to a release under 7 days old) with Chrome 154 are installed. LDtk is installed in %LOCALAPPDATA%/Programs, but no LDtk MCP is configured. Aseprite/LibreSprite and ffmpeg are not on PATH. Nothing was installed.
- Implemented (M1.2 v0.1 subset):
  - Main menu: New Game, Continue (disabled and explained), Settings, Credits.
  - Pause menu on Esc/P: Resume, Settings, Retry (disabled and explained), Quit to Menu.
  - Persistent settings: master, music and SFX volume, fullscreen, hitboxes.
  - Fullscreen overlay integration.
  - Files: js/UIScenes.js (new), js/main.js, js/GameScene.js, index.html.
- M1.5 initial: a measured sprite and animation contract was added to ANIMATION_STANDARD.md.
- Tests:
  - `npm run test:smoke` → 40/40 PASS, exit 0, repeated on several runs. The only warning is the intentional corrupt-settings log.
  - souls-qa probes in tests/qa-probes/ found:
    - 1 major: New Game could be blocked by a menu click during the fade. Fixed by locking the menu during the transition.
    - 3 minor:
      - A held mouse button on Resume swung the sword. Fixed.
      - Esc+P together caused a double-pause warning. Fixed with a pause-request flag.
      - A key held through pause needs a re-press. Accepted; documented.
  - All probes were re-run after the fixes with 0 console warnings.
- Not tested: real browser fullscreen and Esc, audio (none exists), human feel playtest.
- Next: owner review of v0.1. On approval, v0.2 = M1.3 + M1.4. A souls-architect review of the save contract is recommended (T3).

## 2026-11-13 — v0.1 owner changes round 1 — REVIEW
The owner requested four changes:
- Fullscreen is mandatory, so the setting was removed.
- The game boots to the menu only, with no overlay. New Game enters fullscreen, and the paused overlay appears only when fullscreen is left mid-run.
- The title is now the animated `sprites/title.png`, configured through `TITLE_CONFIG` in js/UIScenes.js.
- Menu text is white.

All four were implemented by the Lead directly (T1, small). `npm run test:smoke` gives 48/48 PASS, exit 0. Gate stays REVIEW, and owner approval is pending.

## 2026-11-13 — v0.1 APPROVED, v0.2 started
- Further v0.1 changes requested by the owner:
  - Menu background dim set to pure black at 58.92% (`TITLE_CONFIG.backgroundDim`).
  - Knight Warrior font for all UI text (`FONT_CONFIG.useCustomFont`). The file is committed on the owner's instruction; it carries a personal-use licence (see ASSET_LICENSES.md).
- v0.1 approved by the owner ("lets proceed to v0.2").
- Owner decisions for v0.2:
  1. Checkpoints: chapter start only for now. Death returns to the Famine start room with the same layout. Physical checkpoints come in v0.4 (M1.7).
  2. Reaching a checkpoint will refill HP and stamina, once physical checkpoints exist.
  3. Death: a short "You have fallen" screen, then an automatic respawn.

## Session log — 2026-11-13 — Lead — M1.3, M1.4, M1.2 (save items) — v0.2 REVIEW
- Routing:
  - Lead: Opus 5.5, direct implementation.
  - souls-architect (T3): requested Opus, actual Opus 5.5. Reviewed the save contract: APPROVE WITH CHANGES, six changes, all applied.
  - souls-qa (T2): requested Sonnet, actual Sonnet 5.5. No blocker or major findings.
- Files:
  - js/SaveManager.js (new)
  - js/GameScene.js: planRooms, damageEnemy, die, restartFromCheckpoint, per-strike rat bites
  - js/UIScenes.js: DEATH_CONFIG, ConfirmScene, DeathScene, Continue, Retry
  - js/main.js
  - index.html
  - tests/survival.mjs (new), tests/smoke.mjs, package.json (`npm test`)
  - docs/SAVE_CONTRACT.md
- Tests: smoke 48/48, survival 46/46, `npm test` exit 0. QA probes v02-edge1..3 all clean. Heap is flat over 20 restarts after forced GC (v02-heap.mjs).
- Decisions:
  - The checkpoint is the chapter start only (owner).
  - Death is a placeholder fall, a 2 s screen, then respawn (owner).
  - Rat HP stays 1. SWORD_DAMAGE is 1.
- Open:
  - No hurt or death animation sprites yet.
  - Chapter-transition save is untested until v0.5.
  - Human playtest pending.
- Next: owner review of v0.2. Then v0.3 starts with a souls-architect design for the Parry Death state machine, plus owner approval of the two new enemy concepts.

## Session log — 2026-11-13 — Lead — v0.2 owner changes + Hollow Archer demo
- Owner request (while v0.2 is in REVIEW):
  - Remove the key hints at the bottom of the main menu.
  - P / menu leaves fullscreen.
  - Continue/Resume re-enters it.
  - Show a fully working Hollow Archer in the game as a demo.
- v0.2 branch, commit 8088ded:
  - Removed the menu hint line.
  - The pause menu exits fullscreen. Resume and Retry request fullscreen; the game resumes only once it is granted. If the browser refuses (Esc is not a user gesture), the click-to-continue overlay is shown.
  - Leaving fullscreen mid-run opens the pause menu; the overlay remains only for the death screen.
  - Smoke 50/50, survival 46/46.
- Archer demo branch `famine/v0.3-archer-demo` (from v0.2):
  - js/HollowArcher.js: AI, 800 ms draw telegraph with glint, flat 320 px/s arrow for 15 dmg at 42 px height, 1.5 s reload, one backstep, 2 HP, line of sight within 420 px and 48 px vertical.
  - Sprites in sprites/ENEMIES/FAMINE/ARCHER_*.png from tools/art/enemy_sprites.py.
  - LDtk entity `HollowArcher` (uid 28), placed once in each of Level_1, Level_2 and Level_3.
  - GameScene: shared `hurtPlayer` / `isPlayerInvulnerable` (rats use them too).
  - Tests: tests/archer.mjs 19/19. `npm test` runs smoke + survival + archer, all green.
- Not done / open:
  - No archer death or hurt animation; it uses the rat's red-flash placeholder.
  - No SFX.
  - The sword cannot cut arrows. Hits do not interrupt the draw.
  - Owner approval of the look and behaviour is pending.
  - The Starved is not implemented.
  - v0.2 is still REVIEW / PENDING.
