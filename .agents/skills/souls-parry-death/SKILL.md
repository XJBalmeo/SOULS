---
name: souls-parry-death
description: Design, implement and test the once-per-campaign fatal-hit Death parry encounter.
---
# Parry Death
Read docs/PARRY_DEATH.md, GAME_DESIGN.md and AGENTS.md. Coordinate M1.4A through Lead Orchestrator. Confirm approved inputs/telegraph/visuals. Implement one guarded fatal-hit interception, one randomized attack, timed parry resolution, full HP/stamina revival without resetting encounter, or normal death. Persist consumption at trigger outside checkpoint rollback; only New Game resets. Separate encounter timing from paused gameplay, clean up on exit. Use shared combat, save, animation, audio and QA skills; document contracts and tests. Gate: both branches, duplicate events, reload/Continue, checkpoints, chapter transitions, final boss, pause/cleanup and human playtest; no fabricated evidence.
