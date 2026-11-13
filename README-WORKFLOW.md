# SOULS — agent workflow starter kit

Version 1.4 — Claude Code | 2026-11-13 | XJBalmeo/SOULS

This is a documentation and agent-skill overlay for the existing SOULS repository, not a replacement game or an installed toolchain.

## Start here
1. Create a branch in your local SOULS clone (e.g. `docs/agent-workflow`). Extract this archive into the repository root, preserving paths. Review any existing files before merging; never overwrite unrelated work.
2. Open `AGENTS.md`, `docs/PROJECT_BRIEF.md`, `docs/CONTEXT_POLICY.md`, and `docs/DEVELOPMENT_STATUS.md`; read detailed specs on demand.
3. Use `MASTER_PROMPT.md` to activate the orchestrator. Read `docs/FAMINE_PLAYABLE_BUILDS.md` and `docs/FIRST_ASSIGNMENT.md` to start Famine v0.1 / M1.1. Inspect the current branch before assuming the baseline in these documents still applies.
4. Read `docs/TOOLCHAIN.md` before installing anything. Tools are candidates; none are installed by this archive. For Claude Code, follow `docs/CLAUDE_CODE_SETUP.md`, start `claude --model sonnet`, and invoke `/souls-start` or read MASTER_PROMPT.md. Native agents and skill adapters are included; canonical skills remain in `.agents/skills/`.
5. Commit documentation separately from gameplay changes. Review a PR before merging.

## Contents
- `AGENTS.md`, `CLAUDE.md`: shared agent instructions.
- `docs/`: game design, roadmap, baseline, art/animation/level/audio standards, enemy roster, tools, licensing and handoff status.
- `milestones/`: four chapter acceptance gates and task lists.
- `.agents/skills/`: 16 SOULS-specific skill definitions.
- `templates/`: feature assignment, enemy specification, PR and playtest report.

Approved decisions are marked confirmed; enemy names, specific unlocks, future world palettes and boss concepts are proposals. No external code, models, credentials or game assets are bundled. No GitHub changes or gameplay tests have been performed for this kit.

## v1.1 changes
Added `docs/PARRY_DEATH.md`, `docs/LEAD_ORCHESTRATOR.md`, `souls-parry-death` skill, M1.4A and cross-chapter tests. Lead Orchestrator is the existing Lead Development Agent with explicit delegation/handoff rules. No automatic agent runtime or installed tools; no game code changed. Working assumption: run = entire New Game campaign, not a checkpoint life; consumed on trigger, success or failure.

## v1.2 changes
Added `MASTER_PROMPT.md`, `docs/FAMINE_PLAYABLE_BUILDS.md` and `templates/BUILD_REVIEW.md`. Six playable build gates v0.1–v1.0 within M1, each with owner review and explicit approval before advancement. The other chapters remain future roadmap only. All v1.1 mechanics and 14 skills retained; no game code or external tools installed.

## v1.3 changes
Added compact PROJECT_BRIEF.md, CONTEXT_POLICY.md, tools/TOKEN_TOOLCHAIN.md and souls-context-manager skill. Replaced redundant master prompt with a shorter execution prompt referencing canonical specs and unchanged six build gates. Progressive loading, selective delegation, simple implementation and concise evidence-rich handoffs are required. Ponytail/Caveman optional; RTK/Headroom deferred pending evidence. No external tools installed, no gameplay work or tests performed. All prior mechanics and approval gates retained.

## v1.4 changes — Claude Code only
Added MODEL_ROUTING.md, CLAUDE_CODE_SETUP.md, souls-model-router, four native `.claude/agents/` workers and `.claude/skills/` discovery adapters for all 16 canonical skills plus manual `/souls-start`. Main Sonnet lead; Haiku exploration; Sonnet implementation/QA; Opus critical decisions. Routing policy selects named workers, no separate gateway. Preserves all prior design/Parry Death/build gates. No Codex adapter, automatic installations, changes to GitHub or gameplay implementation. Static archive/frontmatter validation only; live Claude Code and model access require local M1.1 verification.
