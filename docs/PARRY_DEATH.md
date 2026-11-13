# Parry Death — feature specification v1.1

Status: owner-approved core mechanic; implementation and presentation pending. Milestone 1, M1.4A. Applies across all four chapters. Not currently implemented.

## Confirmed behavior
On fatal damage the knight is downed instead of immediately dying, if the once-per-run opportunity remains. A Death enemy spawns and approaches to claim the knight’s soul. It attacks exactly once at random; a successful parry revives the knight with full health and stamina (all normal player resources restored). Failure leads to the normal death/checkpoint flow. This encounter occurs only once per run, whether won or lost.

## Interpretation and proposed defaults (review before final production)
- A run is a single campaign started by New Game, through Famine → War → Conquest → Death. Checkpoint restart, chapter change, pause/menu, browser reload and Continue do not renew the opportunity. A confirmed New Game does. This is the working interpretation of “one run”; confirm with owner if a different reset boundary is desired.
- Randomize the delay before one attack, not the fairness of its telegraph. Start with one attack animation; potential attack variants deferred. Tune delay, parry window, input key and audiovisual warning in prototype. Provide a clear input cue and prevent held-button/spam exploits (one deliberate timed input; premature input consumes attempt under proposed rule). No automatic parry. Dedicated input works while downed; this does not add regular combat parrying.
- Working name “Death’s Shadow”; spectral reaper design is a proposal, separate from final Horseman boss. Art, sounds, input, timing and accessibility settings need approval/tuning. If killed during final boss use the same encounter, distinct silhouette.
- On success resume the same room/encounter, preserve boss HP, enemy positions/HP and campaign progress; restore player health/stamina and any approved replenishable resources, not new unlocks or consumables by default. Clear fatal hit and unsafe transient attacks; use brief configurable revival protection and safe placement if needed. Do not reset the room or regenerate map.
- Suspend normal simulation, damage, AI, hazards, projectile timers, and relevant boss timers while the special encounter runs; allow encounter animation, timing and input to advance separately. Resume or clean up on exit; normal pause must freeze encounter timers. If browser closes mid-encounter, Continue uses last checkpoint and consumed opportunity (no replay); this is a proposed anti-reload policy.

## State machine and integration contract
ALIVE → FATAL_DAMAGE_CHECK → DOWNED → DEATH_APPROACH → TELEGRAPH → SINGLE_STRIKE → PARRY_SUCCESS → REVIVE → ALIVE; failure → NORMAL_DEATH → CHECKPOINT_RESTORE. If used already, fatal damage goes straight to NORMAL_DEATH. Exactly one transition per fatal event; guard against simultaneous damage callbacks and repeated attack events. Lock normal movement/attack/roll while downed. Parry outcome resolves once; cleanup on scene shutdown/restart. Make state ownership explicit; avoid duplicating player damage paths.

Persistent campaign flag `parryDeathUsed` (default false for new campaign; migration policy for pre-feature saves: false, documented). Mark true and persist at trigger before offering input, not only on success. It is campaign-level data, outside rollbackable checkpoint snapshot. Save updates must not overwrite it with older checkpoint state; merge monotonic true across checkpoint restores and chapter transitions. Handle storage failure honestly: retain flag in memory, warn that persistence is unavailable; never promise reload protection when storage fails. Save current layout/checkpoint and unlocks as before; no mid-combat save needed. New Game explicitly creates a fresh campaign. Test migration and corrupt/unavailable storage.

## Work packages and deliverables
1. Designer: approve encounter rules, timing and input; design one readable attack. Art/animation: knight downed, parry, revive; Death approach, strike, dissipate (reuse frames where compatible). Audio: arrival, telegraph, swing, parry success/failure, revival cue. UI: input prompt and available/used indicator or clear status feedback; avoid overlapping boss HUD.
2. Programmer: implement fatal-damage interception, isolated encounter state, input window, random timing, safe resume and persistent flag with save manager. Coordinate shared combat/checkpoint interfaces. No engine rewrite.
3. QA: controlled clock/randomness, test cases below, actual browser playtest and visual/audio review. Lead orchestrator integrates and approves review readiness; owner approves mechanic presentation and milestone.

## Acceptance tests
- First fatal hit in regular combat and boss combat triggers exactly one Death encounter; duplicate fatal events do not spawn duplicates.
- One attack only, variable delay within specified bounds, reliable readable warning; input inside window succeeds, early/late/no input fails under selected policy; held input cannot auto-win.
- Success restores full HP/stamina, removes Death, resumes same fight with progress intact, no immediate unavoidable repeat death; no lingering timers/locks.
- Failure uses normal death screen; checkpoint restores HP/stamina and regular enemies. Subsequent fatal hits bypass encounter after either outcome.
- Flag remains consumed after checkpoint restore, restart checkpoint, chapter transition, reload/Continue, and interrupted encounter; New Game resets it. Old-save migration and unavailable storage covered.
- Pause/resume and scene exit during encounter, final boss coexistence, animation/audio cleanup and existing movement/roll/sword/checkpoint regressions pass. Human playtest assesses fairness and readability. Test both branches on fresh campaign fixtures; do not reset real user saves.
