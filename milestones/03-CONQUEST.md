# M3 — Conquest

Status: BACKLOG. Dependency: M2 accepted by owner. Objective: complete chapter 3 in the fixed campaign.

| ID | Task | Owner | Dependency / output |
|---|---|---|---|
| M3.1 | Approve chapter design | Designer + Art | Previous milestone; approve palette, roster, boss, narrative and any unlock |
| M3.2 | Environment and rooms | Level + Art | M3.1; original background/tiles, start/intermediate/checkpoint/fixed boss rooms, validation |
| M3.3 | Enemies and combat | Enemy + Art + Animation + Programmer | M3.1; reusable AI, sprites, hitboxes, SFX, placement, tests |
| M3.4 | Progression | Programmer + QA | M3.1–3; War→Conquest, stable saves, approved story rewards, no unapproved equipment scope |
| M3.5 | Boss and audio | Boss + Audio + Programmer | M3.2–4; unique encounter, bar, music, defeat and transition |
| M3.6 | Acceptance | QA + Lead + owner | All prior tasks; regression and human playtest |

## Proposed roster
- Royal Lancer — Long spear thrust
- Crown Duelist — Quick attacks, retreat
- Inquisitor — Charged magical projectile
- Standard Bearer — Buff nearby enemies
- Gilded Sentinel — Heavy strike, shockwave
- Crown Watcher — Flying ranged attack

Boss proposal: Eternal Sovereign — regal ranged commander; bow, summons and spacing.

## Acceptance
- [ ] At least five distinct regular enemies and one unique boss.
- [ ] Approved art, randomized rooms and reachable checkpoints; death/Continue restore chapter and layout, health/stamina and regular enemies.
- [ ] Music/SFX, UI and boss transitions complete.
- [ ] Prior chapters still work; normal progression War → Conquest → Death.
- [ ] Approved story unlocks persist correctly; provenance documented.
- [ ] Automated regression, human playtest and owner approval.

## Parry Death regression
- [ ] First unused fatal hit can trigger Parry Death here; previously consumed opportunity remains consumed across chapter transition, checkpoint and Continue. Both outcomes and ordinary death work. Chapter IV: distinguish Death encounter from the final Horseman boss. See `docs/PARRY_DEATH.md`.
