# M2 — War

Status: BACKLOG. Dependency: M1 accepted by owner. Objective: complete chapter 2 in the fixed campaign.

| ID | Task | Owner | Dependency / output |
|---|---|---|---|
| M2.1 | Approve chapter design | Designer + Art | Previous milestone; approve palette, roster, boss, narrative and any unlock |
| M2.2 | Environment and rooms | Level + Art | M2.1; original background/tiles, start/intermediate/checkpoint/fixed boss rooms, validation |
| M2.3 | Enemies and combat | Enemy + Art + Animation + Programmer | M2.1; reusable AI, sprites, hitboxes, SFX, placement, tests |
| M2.4 | Progression | Programmer + QA | M2.1–3; Famine→War, stable saves, approved story rewards, no unapproved equipment scope |
| M2.5 | Boss and audio | Boss + Audio + Programmer | M2.2–4; unique encounter, bar, music, defeat and transition |
| M2.6 | Acceptance | QA + Lead + owner | All prior tasks; regression and human playtest |

## Proposed roster
- Fallen Infantry — Sword slash
- Iron Guard — Frontal shield, bash
- Blood Berserker — Heavy axe, long recovery
- Siege Marksman — Crossbow, reload
- War Hound — Fast pursuit and leap
- Ash Bomber — Delayed explosive throw

Boss proposal: Crimson Warlord — armored warrior; sweeping greatsword, slam, charge.

## Acceptance
- [ ] At least five distinct regular enemies and one unique boss.
- [ ] Approved art, randomized rooms and reachable checkpoints; death/Continue restore chapter and layout, health/stamina and regular enemies.
- [ ] Music/SFX, UI and boss transitions complete.
- [ ] Prior chapters still work; normal progression Famine → War → Conquest.
- [ ] Approved story unlocks persist correctly; provenance documented.
- [ ] Automated regression, human playtest and owner approval.

## Parry Death regression
- [ ] First unused fatal hit can trigger Parry Death here; previously consumed opportunity remains consumed across chapter transition, checkpoint and Continue. Both outcomes and ordinary death work. Chapter IV: distinguish Death encounter from the final Horseman boss. See `docs/PARRY_DEATH.md`.
