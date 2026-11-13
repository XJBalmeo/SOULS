---
name: souls-combat-design
description: Specify readable, responsive player and enemy combat.
---

# souls-combat-design

Read AGENTS.md and current milestone first.

## Procedure
Keep sword and stamina initially. Define telegraph/active/recovery, damage, cooldown, hitbox, counterplay and dodge interaction. Avoid multi-hit overlap bugs and unapproved contact damage. Test actual animation timing and player feedback.

## Deliverables
Combat spec and balanced, tested encounter.

## Gate
Review actual outputs, relevant tests and licenses; record limits in docs/DEVELOPMENT_STATUS.md. No unapproved scope changes or false completion claims.

## v1.1 — Parry Death
Parry Death: one random-delay telegraphed strike, timed parry, full HP/stamina revival; design/tune input and timing with owner. No ordinary combat parry implied.
