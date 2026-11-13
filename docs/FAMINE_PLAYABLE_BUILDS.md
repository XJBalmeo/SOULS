# Famine — incremental playable builds

Milestone 1 only. These are six integration/review gates, not additional chapter milestones. The task IDs in `milestones/01-FAMINE.md` remain canonical. A task can contribute to several builds; do not mark the entire task DONE until all its requirements pass. Start with v0.1; advance only after actual playable evidence and recorded owner approval. Later content may be prepared in parallel if approved and isolated, but no War/Conquest/Death production.

| Build | Task mapping and required scope | Gate evidence |
|---|---|---|
| v0.1 Foundation | M1.1, M1.2 (interface subset), M1.5 initial standards | Launch from menu; New Game enters existing Famine; settings/pause function; baseline movement/combat regression; unavailable Continue/retry disabled or explained. |
| v0.2 Combat & Survival | M1.3, M1.4, remaining save-dependent M1.2 | Sword/roll/stamina/HP, per-strike enemy damage, normal death, checkpoint full HP/stamina and regular enemy reset, stable map layout, Continue and new-game confirmation; reload tests. |
| v0.3 Parry Death & Enemies | M1.4A, M1.5 production standards, M1.6 initial two new enemies | Parry success/failure, randomized single attack, durable once-per-campaign flag, same-encounter revival, reload/pause cleanup; rat + two approved new enemy types (proposed Starved and Hollow Archer), integrated animations/AI/SFX/placement. |
| v0.4 Famine Expanded | M1.6 completion, M1.7 | At least five fully integrated regular enemy types, six target; expanded randomized rooms, runtime selection, collision/door/traversal tests, checkpoints, boss arena geometry; reproducible map restore. |
| v0.5 The Hollow King | M1.8, M1.9 | Approved boss (name/concept provisional), arena, health bar, fair attacks, retry and defeat; menu/explore/boss music and required SFX; complete chapter ending and persisted victory; Parry Death boss regression. No missing War scene. |
| v1.0 Famine Complete | M1.10, all remaining M1 task requirements | Full regression, human playtest, performance and difficulty review, asset provenance, no release-blocking defects, all mandatory M1 criteria and owner approval. |

## Gate procedure
1. Lead selects active build, assigns task IDs and owners, checks dependencies, and establishes shared contracts. Use isolated branches/worktrees where practical.
2. Specialists deliver integrated features and QA evidence. Test real Phaser gameplay; structural LDtk validation alone is insufficient. Use approved art/audio; provisional assets must be labeled and cannot satisfy final production requirements.
3. Lead verifies build checklist, reproducible launch instructions, commit/branch, evidence, known issues and remaining tasks. Record in `docs/DEVELOPMENT_STATUS.md` and `templates/BUILD_REVIEW.md`.
4. Set REVIEW and present playable build for owner review. Do not advance active build or claim approval until owner explicitly approves. Record decision and date. If changes requested, return to IN PROGRESS and retest. Blocked tasks retain reason; continue independent current-build work.
5. After approval, record gate DONE, next build READY. Only v1.0 owner approval closes Milestone 1; stop there, do not start War.

Build labels are internal review labels, not published release tags. No gate passes solely from generated code/assets or a plan. Human playtest required for final milestone; interim owner reviews can use a playable build and evidence, but cannot replace final human testing. No automatic main merge.

## Build checklist (initial)
- [x] v0.1 Foundation — DONE (owner approved 2026-11-13; docs/builds/v0.1/BUILD_REVIEW.md)
- [ ] v0.2 Combat & Survival — IN PROGRESS (2026-11-13)
- [ ] v0.3 Parry Death & Enemies — BACKLOG
- [ ] v0.4 Famine Expanded — BACKLOG
- [ ] v0.5 The Hollow King — BACKLOG
- [ ] v1.0 Famine Complete — BACKLOG
