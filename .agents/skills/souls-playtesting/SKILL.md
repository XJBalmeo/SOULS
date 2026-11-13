---
name: souls-playtesting
description: Verify features and chapter gates using actual gameplay.
---

# souls-playtesting

Read AGENTS.md and current milestone first.

## Procedure
Inspect baseline and acceptance criteria. Use Puppeteer to serve/run game, scripted keyboard, console and screenshots; inspect canvas/game state and actual traversal. Record commands/results/seed/commit; human playtest for feel. Report failures and not-run tests honestly.

## Deliverables
Playtest report, regression tests, bug repros and gate recommendation.

## Gate
Review actual outputs, relevant tests and licenses; record limits in docs/DEVELOPMENT_STATUS.md. No unapproved scope changes or false completion claims.

## v1.1 — Parry Death
Parry Death: test both outcomes, random delay/one strike, duplicate fatal events, input timing, same-fight revival, consumed flag through retry/Continue/chapter, New Game reset, interrupted encounter and final boss. See docs/PARRY_DEATH.md.

## Build acceptance
Test active build criteria in docs/FAMINE_PLAYABLE_BUILDS.md; report actual results, launch commands, evidence and blockers in templates/BUILD_REVIEW.md. Owner approval gates advancement; final v1.0 requires human playtest and full regression.
