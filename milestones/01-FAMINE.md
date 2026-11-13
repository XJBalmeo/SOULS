# M1 — Famine + game foundation

Current (2026-11-13): M1.1 REVIEW; M1.2 v0.1 subset REVIEW (save-dependent parts remain for v0.2); M1.5 initial standards REVIEW; all other tasks BACKLOG. Active build v0.1 awaiting owner approval.

| ID | Task | Owner | Depends on | Deliverable |
|---|---|---|---|---|
| M1.1 | Baseline/onboarding | Lead + QA | None | Verify Phaser version, launch, controls, existing assets, LDtk, actual smoke test; document risks and tools |
| M1.2 | UI and architecture | Programmer + UI | M1.1 | Title/menu New Game Continue Settings Credits, pause/retry, HUD, scene transitions; preserve fullscreen |
| M1.3 | Combat and hero polish | Programmer + Animator | M1.1 | Existing movement/roll/climb/sword/stamina, hurt/death, shared HP damage, one hit per strike, dodge timing |
| M1.4 | Checkpoint and saves | Programmer + QA | M1.2, M1.3 | Versioned save, stable map/checkpoint IDs, full HP/stamina, enemy reset, Continue, New Game confirmation, chapter persistence |
| M1.4A | Parry Death | Lead + Combat/Enemy Design + Art/Animation + Audio/UI + Programmer + QA | M1.3, M1.4; asset contracts M1.5 | One fatal-hit encounter per campaign; full revival or normal death; durable use flag and regression tests |
| M1.5 | Art and asset pipeline | Art + Animation | M1.1 | Green Famine art bible; reference sprite, approved frame standards, verify PixelLab/export |
| M1.6 | Regular enemies | Enemy design + Art + Programmer | M1.3, M1.5 | Six target; at least five integrated with animations, AI, SFX, placement and tests |
| M1.7 | Map completion | Level + Programmer | M1.4, M1.5; enemy specs | LDtk MCP copy test; templates, traversal, doors, checkpoints, boss arena, runtime selection, generated combinations |
| M1.8 | Famine boss | Boss + Art + Programmer | M1.3, M1.4, M1.7 | Approve Hollow King or alternative; bite/charge, bar, arena, reset, defeat, unlock War |
| M1.9 | Audio/presentation | Audio + UI | M1.2; event specs | Menu/explore/boss tracks, SFX, loops, browser activation, volume, provenance |
| M1.10 | Acceptance | Lead + QA + owner | M1.1–M1.9 including M1.4A | Complete chapter gate; human playtest and PR approval |

## Acceptance checklist
- [ ] Main menu opens without errors; New Game, Continue, settings, credits, pause and restart work.
- [ ] Existing hero movement, sword, stamina and dodge work; clear hurt/death feedback.
- [ ] At least five distinct regular enemies fully integrated (six target).
- [ ] Randomized rooms connected, reachable and collision-tested; checkpoints and fixed boss arena.
- [ ] Death restores full health/stamina, resets regular enemies and preserves layout; Continue restores save.
- [ ] Famine boss fair, beatable, retryable; defeat saves completion and unlocks War or explicit chapter-complete screen.
- [ ] Menu/exploration/boss music, effects and volume controls work.
- [ ] Automated regression evidence, human playtest, asset provenance and owner approval.

- [ ] Parry Death success/failure, exactly one attack and opportunity, checkpoint/Continue persistence, same-encounter revival, pause/cleanup and human playtest pass (`docs/PARRY_DEATH.md`).

## Playable build gates
Follow `../docs/FAMINE_PLAYABLE_BUILDS.md` for task mapping and acceptance. M1.2 spans v0.1 UI and v0.2 save-dependent functions; M1.5 spans v0.1 initial standards and v0.3 production validation; M1.6 spans v0.3 initial enemies and v0.4 roster completion. Required SFX are integrated alongside enemies and Parry Death; M1.9 completes full audio in v0.5. Each gate requires owner approval; only v1.0 closes M1. Use `../templates/BUILD_REVIEW.md`.

## v1.4 routing and onboarding
M1.1 includes the Claude Code setup/discovery smoke test in `docs/CLAUDE_CODE_SETUP.md`. Use `docs/MODEL_ROUTING.md` to route work by complexity/risk, not role. This does not change gameplay acceptance criteria or six playable build review gates.
