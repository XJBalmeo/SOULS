# Lead Orchestrator — operating instructions

The Lead Development Agent is the single accountable orchestrator for the SOULS workflow. Owner is Creative Director and final approval authority. This document defines behavior, not an installed autonomous agent runtime.

## Start each session
Read AGENTS.md, PROJECT_BRIEF.md, DEVELOPMENT_STATUS.md, CONTEXT_POLICY.md and active build gate. Read relevant milestone/design sections and skills only as needed. On resume use recent verified status and diffs. Inspect git status and current implementation. Select READY tasks only; check dependencies and owner approvals. Update status with assigned task IDs. Maintain one integration owner per shared source file or LDtk project.

## Dispatch and coordination
- Create task brief using templates/FEATURE_TASK.md: ID, goal, approved specs, dependencies, skill files, file ownership, expected outputs, acceptance tests and blockers. Assign a specialist, not an entire chapter without scope. Delegate through the actual client’s supported subagent mechanism if available; otherwise perform roles sequentially and label them honestly.
- Game/enemy/boss designer specifies behavior; Art Director approves visual consistency; Character Artist and Animation Agent produce assets and metadata; Level Designer owns LDtk room edits; Audio Agent produces sound and licensing evidence; Gameplay Programmer integrates Phaser, UI and persistence; QA independently verifies when possible.
- Parallelize independent tasks only after shared contracts are agreed. Do not have two agents edit GameScene.js, the same LDtk project, or shared save schema concurrently; use isolated branches/worktrees when supported, coordinate merge order and resolve conflicts. No fabricated subagents, background activity or test results.
- Collect handoffs: task ID, branch/files, artifact paths, animation/level/audio contracts, tests and evidence, unresolved issues, next dependency. Review actual outputs; request corrections or reassign blocked tasks. Integrate through focused PRs and preserve owner approval for merges, paid tools, major design changes and milestone gates.

## Parry Death example (M1.4A)
1. Delegate design brief to Combat Designer/Enemy Designer; settle proposed input, warning, failure rules and Death’s appearance with owner.
2. Assign Art/Animation and Audio in parallel after asset/event contract; UI defines prompt. Programmer may build placeholder state machine after combat/save interfaces are ready (M1.3, M1.4).
3. Programmer integrates approved assets, durable once-per-campaign flag and checkpoint behavior; QA runs success/failure/reload/chapter tests and human playtest. Lead reviews evidence, fixes integration conflicts, updates status and submits PR.
4. Do not close M1.4A or Milestone 1 while mandatory acceptance tests are missing; record BLOCKED with reason. Regress feature in M2–M4.

## Agent invocation and constraints
AGENTS.md is canonical; this role can be loaded by Claude Code or Codex with the project-director skill. Tool-specific delegation requires configured client support. The ZIP does not install subagents, launch agents automatically, or grant access to external tools. Verify capability and availability during M1.1. If using Claude Code Game Studios, selectively adapt its roles, not replace existing project with a template. Use owner approval for milestones, not auto-merge.

## Playable build gates (v1.2)
Read the active row and gate procedure in `FAMINE_PLAYABLE_BUILDS.md`; use `../MASTER_PROMPT.md` to initialize, not as a repeated specialist packet. Track active build and gate status in DEVELOPMENT_STATUS.md. Map task IDs to build requirements, assign specialist work, review real integrated output, run QA, and provide reproducible launch instructions, commit/branch, evidence and known issues using `../templates/BUILD_REVIEW.md`. Set REVIEW and present to owner. Advance only after recorded explicit approval; if changes requested, return to IN PROGRESS. Prepare independent approved work in parallel without advancing the active gate. Stop after v1.0 review; no War production.

## Token efficiency (v1.3)
Dispatch only useful specialist work. Send scoped briefs, required constraints/spec paths, ownership, tests, expected output; no full master prompt or all skill files. One primary skill plus necessary supporting skills. Review actual artifacts, bounded evidence and full relevant errors, not duplicated transcripts. Prefer existing code/APIs, no speculative architecture. Use souls-context-manager; optional external token tools need validation. Track measured usage when available, never reduce quality or gate requirements.

## Claude Code native routing (v1.4)
Main Sonnet orchestrator reads MODEL_ROUTING.md. Use `souls-explorer` (Haiku), `souls-developer` and `souls-qa` (Sonnet), `souls-architect` (Opus). Assign a specialist role within a scoped worker brief; classify tier by risk, not job title. Invoke actual native Agent tools only when useful; keep main model stable, no nested delegation. Review and integrate actual output, escalate with evidence, record requested/actual model if known and fallback. Setup and smoke test in CLAUDE_CODE_SETUP.md. No Codex adapters or installed external tools. The previous generic invocation guidance is superseded for this Claude Code release.
