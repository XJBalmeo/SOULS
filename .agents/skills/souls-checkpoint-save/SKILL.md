---
name: souls-checkpoint-save
description: Implement reliable campaign, checkpoint and save restoration.
---

# souls-checkpoint-save

Read AGENTS.md and current milestone first.

## Procedure
Read GAME_DESIGN. Version local save; store chapter, completed bosses, actual room sequence, stable instance/checkpoint IDs, approved unlocks; settings separate. Full health/stamina, regular enemy reset, clear transient state. Test duplicate templates, boss retry, invalid storage, Continue, New Game confirmation and transition.

## Deliverables
Save schema, tested persistence and migration/invalid-save handling.

## Gate
Review actual outputs, relevant tests and licenses; record limits in docs/DEVELOPMENT_STATUS.md. No unapproved scope changes or false completion claims.

## v1.1 — Parry Death
Parry Death: persist monotonic campaign parryDeathUsed at trigger outside rollbackable checkpoint snapshot; never reset on retry/Continue/chapter; only New Game resets. Test migration and interrupted encounter.
