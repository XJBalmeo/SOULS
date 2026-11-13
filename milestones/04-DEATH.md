# M4 — Death

Status: BACKLOG. Dependency: M3 accepted by owner. Objective: complete chapter 4 in the fixed campaign.

| ID | Task | Owner | Dependency / output |
|---|---|---|---|
| M4.1 | Approve chapter design | Designer + Art | Previous milestone; approve palette, roster, boss, narrative and any unlock |
| M4.2 | Environment and rooms | Level + Art | M4.1; original background/tiles, start/intermediate/checkpoint/fixed boss rooms, validation |
| M4.3 | Enemies and combat | Enemy + Art + Animation + Programmer | M4.1; reusable AI, sprites, hitboxes, SFX, placement, tests |
| M4.4 | Progression | Programmer + QA | M4.1–3; Conquest→Death, stable saves, approved story rewards, no unapproved equipment scope |
| M4.5 | Boss and audio | Boss + Audio + Programmer | M4.2–4; unique encounter, bar, music, defeat and transition |
| M4.6 | Acceptance | QA + Lead + owner | All prior tasks; regression and human playtest |

## Proposed roster
- Grave Reaper — Wide scythe sweep
- Wandering Wraith — Phase, telegraph, tangible lunge
- Undying Knight — Resurrection unless soul destroyed
- Soul Lantern — Pursuit, warning, explosion
- Bone Weaver — Summon skeletons
- The Unseen — Teleport, visible warning, strike

Boss proposal: Last Horseman — spectral reaper; scythe, teleport, spectral waves.

## Acceptance
- [ ] At least five distinct regular enemies and one unique boss.
- [ ] Approved art, randomized rooms and reachable checkpoints; death/Continue restore chapter and layout, health/stamina and regular enemies.
- [ ] Music/SFX, UI and boss transitions complete.
- [ ] Prior chapters still work; normal progression Conquest → Death → Ending and credits.
- [ ] Approved story unlocks persist correctly; provenance documented.
- [ ] Automated regression, human playtest and owner approval.
- [ ] Full campaign New Game to final victory, ending/credits and menu return; review difficulty, performance, accessibility, audio, saves and all asset licenses before release.

## Parry Death regression
- [ ] First unused fatal hit can trigger Parry Death here; previously consumed opportunity remains consumed across chapter transition, checkpoint and Continue. Both outcomes and ordinary death work. Chapter IV: distinguish Death encounter from the final Horseman boss. See `docs/PARRY_DEATH.md`.
