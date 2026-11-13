---
name: souls-phaser-development
description: Implement and maintain Phaser gameplay and UI.
---

# souls-phaser-development

Read AGENTS.md and current milestone first.

## Procedure
Confirm bundled Phaser version; inspect GameScene/main and current controls. Make incremental changes; keep existing mechanics, paths and offline launch. Use shared damage/config where practical; avoid unrelated refactor. Test console, inputs, state and transitions with Puppeteer.

## Deliverables
Playable code, regression evidence, documented interfaces.

## Gate
Review actual outputs, relevant tests and licenses; record limits in docs/DEVELOPMENT_STATUS.md. No unapproved scope changes or false completion claims.

## v1.1 — Parry Death
Parry Death: shared fatal-damage guard, isolated encounter state, one attack/outcome, cleanup/pause and same-fight revival; coordinate persistent flag with save system. Read docs/PARRY_DEATH.md.
