# AGENTS.md — SOULS development instructions

## Mission and non-negotiables
Continue XJBalmeo/SOULS, an original dark-fantasy 2D pixel-art action platformer inspired by Dead Cells. The knight seeks to stop the apocalypse. Campaign order is Famine → War → Conquest → Death. Intermediate rooms are randomized; chapter order and bosses are fixed. Death returns to the current chapter's checkpoint or start, never the whole campaign. Restore full health/stamina and reset regular enemies on checkpoint restoration. Keep current sword combat initially; unlock new weapons and abilities through the story only after design approval. At least five distinct regular enemies and one unique Horseman boss per chapter; six regular enemies is the proposed target. Horsemen have distinct physical forms. Preserve Phaser, JavaScript, LDtk, existing hero and Famine's green ruined-city identity. No mandatory network/account system. Do not copy Dead Cells assets, characters, music or code.

Parry Death is mandatory: first fatal hit of a campaign downs knight, spawns Death for a single randomized attack, timed parry revives full HP/stamina, failure uses normal death. Consume on encounter trigger, persist across checkpoints/chapters/Continue; New Game only resets. See `docs/PARRY_DEATH.md`.

## Read before work
1. Lead: `docs/PROJECT_BRIEF.md`, `docs/DEVELOPMENT_STATUS.md`, `docs/CONTEXT_POLICY.md`, `docs/LEAD_ORCHESTRATOR.md` and active build gate. Specialists: this file, scoped task brief, relevant specs and skill(s) only.
2. Read relevant current milestone/design sections and source/assets as needed; detailed design is authoritative, code is implementation truth. Record discrepancies. Baseline: `docs/ARCHITECTURE.md`.
3. Apply progressive context loading, simple correct code and concise evidence-rich handoffs. Never omit relevant requirements or QA to save tokens.

## Roles and ownership
Lead Orchestrator (Lead Development Agent) assigns jobs, dependencies and file ownership, reviews subagent outputs and integrates. Follow `docs/LEAD_ORCHESTRATOR.md`; game/enemy designer specifies mechanics; art director/character artist owns visual consistency; animation agent owns frames/pivots/timing; level designer owns LDtk geometry and encounters; audio agent owns tracks/effects; gameplay programmer owns implementation; QA owns evidence and regression testing. One agent can perform multiple roles sequentially. Only delegate when the client actually supports subagents. Never claim nonexistent work.

## Workflow
1. Inspect status, working tree, current milestone and task ID. Start a focused branch; do not discard user changes.
2. Define scope, dependencies, deliverables and acceptance criteria using `templates/FEATURE_TASK.md`. Choose relevant skill files and verify tools.
3. Specify mechanics before artwork; obtain owner approval for major creative decisions. Share asset contracts before parallel work.
4. Produce and integrate one coherent feature. Preserve existing behavior unless task explicitly changes it. Avoid simultaneous edits to GameScene.js or the same LDtk file; coordinate interfaces.
5. Test actual gameplay, inspect visual results, run regressions, fix introduced bugs. Record command, results, screenshots and limits; never fabricate passes.
6. Update `docs/DEVELOPMENT_STATUS.md`, milestone checklist and relevant specs. Submit focused PR using `templates/PR.md`; merge only after owner approval.

## Engineering and asset rules
Use actual bundled Phaser version and existing source layout; incremental refactoring, no wholesale engine migration. Existing hero/rat frames are 100x100; use defined dimensions for new sprites, consistent foot anchors and damage timing. Famine uses 16px grid, Tiles/Ropes/Ledges/Collision/Spawns, PlayerStart/Rat/left-right Door markers. Inspect definitions before editing. Render/validate LDtk and playtest actual Phaser; new room templates require runtime selection updates. Preserve generated room layout via saved room-instance IDs/sequence (and seed if needed). Checkpoint restore clears transient attacks/projectiles and resets unfinished encounters; completed chapters and approved persistent unlocks stay completed. Save at chapter transitions. Handle invalid save safely; do not silently erase it. Ensure case-sensitive asset paths, browser audio activation, no committed secrets, no unlicensed assets. Do not require runtime AI generation.

## Approval boundaries
Owner approval for final boss/major art/story concepts, weapons/abilities, checkpoint policy changes, migrations, paid services or major resource/license obligations, destructive operations, merging and milestone completion. Routine reversible implementation choices may proceed with documented assumptions. Do not begin full next-chapter production before current milestone gate approval.

## Done and handoff
A feature is done only when designed, integrated, playable, tested, documented and ready for review. A milestone is done only with acceptance criteria and owner approval. Record task ID, files, tests, evidence, blockers, decisions and next task in status. Missing human playtest or unavailable tool = explicit pending/blocked, not a pass.

## Active scope and playable builds (v1.4)
Current scope is M1 Famine only. Read `docs/FAMINE_PLAYABLE_BUILDS.md` and use `MASTER_PROMPT.md`. Execute v0.1 Foundation → v0.2 Combat & Survival → v0.3 Parry Death & Enemies → v0.4 Famine Expanded → v0.5 The Hollow King (proposed name) → v1.0 Famine Complete. Each build requires a playable integration, evidence, status update and explicit owner approval before advancing. Use `templates/BUILD_REVIEW.md`. Pending approval = REVIEW, not DONE. Stop at v1.0 review; do not start War.

## Claude Code routing (v1.4)
Main lead Sonnet; follow `docs/MODEL_ROUTING.md`, `docs/CLAUDE_CODE_SETUP.md` and `souls-model-router`. Use named workers Haiku explorer, Sonnet developer/QA, Opus architect according to risk and scope; direct trivial work, escalate with evidence, verify actual models and availability. No nested delegation, no paid calls without approval. Native `.claude/skills/` adapters preserve one canonical skill body. Record tier, agent, requested/actual model if known and escalation in status. No Codex adapters in this release. All previous gates and requirements remain mandatory.
