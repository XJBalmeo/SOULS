# Development roadmap

Four milestones in order, one completed chapter each. M1 includes shared game foundation. No full production of next chapter until current milestone is approved. Status: BACKLOG → READY → IN PROGRESS → REVIEW → DONE; BLOCKED records dependency. Each task has an owner, outputs, tests and dependencies. See milestone files for actionable checklists. Parallelize independent design/audio/art only after shared interfaces and asset specs; coordinate shared source and LDtk writes.

| Milestone | Deliverable | Exit gate |
|---|---|---|
| M1 Famine | Menu, combat foundation, saves, Parry Death, first full chapter | Famine playable from New Game to boss victory, checkpoint/Continue tested |
| M2 War | Second full chapter, new combat types and progression | Famine→War complete; War unlocks Conquest |
| M3 Conquest | Third full chapter, tactical foes and approved unlocks | Three chapters playable; Conquest unlocks Death |
| M4 Death | Fourth chapter, ending, credits and release polish | Full campaign end-to-end, tests and owner approval |

M1 sequence: onboarding baseline → UI/combat and art standards in parallel → checkpoints/save → enemies/map/audio → boss → acceptance. Asset design may precede implementation; do not integrate unapproved concepts. Future unlocks are confirmed direction, exact rewards pending design. Each later chapter reuses shared systems, with art approval before production, room generation, regular enemies, boss/audio, progression and regression. Use explicit chapter-complete placeholder if next chapter not yet built; never route to missing scene. All chapter gates require ≥5 distinct regular enemy types, unique boss, valid room assembly/checkpoints, soundtrack/SFX and actual playtest. Human playtest cannot be replaced by automated evidence.

Parry Death (M1.4A) follows M1.3 combat and M1.4 saves; design/art/audio can start in parallel after contract approval. M1 acceptance requires both outcomes and persistence tests; regress once-per-campaign use in M2–M4. Lead Orchestrator dispatches tasks per `LEAD_ORCHESTRATOR.md`.

## M1 internal playable build gates
See `FAMINE_PLAYABLE_BUILDS.md` for the six gates and task mapping: v0.1 Foundation, v0.2 Combat & Survival, v0.3 Parry Death & Enemies, v0.4 Famine Expanded, v0.5 The Hollow King, v1.0 Famine Complete. Each gate is playable, tested and owner-reviewed before advancement. M1 remains the only active content milestone; M2–M4 retained for future planning.

## Context policy (v1.3)
Use PROJECT_BRIEF.md and CONTEXT_POLICY.md for task-scoped context loading and minimal implementation. The Lead owns selective delegation and evidence-rich handoffs. Build and chapter acceptance gates are unchanged.
