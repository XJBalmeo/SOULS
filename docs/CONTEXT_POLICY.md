# Context and token efficiency — mandatory workflow policy

Goal: reduce repeated context and unnecessary implementation, not game quality. Apply from v0.1; no need for an external plugin to follow these rules.

## Progressive loading
- First session, Lead reads AGENTS.md, PROJECT_BRIEF.md, DEVELOPMENT_STATUS.md, this policy, LEAD_ORCHESTRATOR.md and active build row/gate in FAMINE_PLAYABLE_BUILDS.md. Read FIRST_ASSIGNMENT.md for M1.1. Inspect git status/branch and relevant source. Open GAME_DESIGN.md and the active milestone sections only when planning or checking a requirement; open full documents when ambiguity or cross-system integration requires it. Later chapters are not active context.
- Resume: read AGENTS.md, status, current gate and recent relevant diffs; load missing specs only. Never assume cached context is current. Do not resend MASTER_PROMPT.md to every specialist or reread it mid-session without need.
- Specialist: receives one scoped task brief, mandatory rules, relevant design excerpts/paths, file ownership, acceptance criteria, necessary skill(s) and dependencies. Read AGENTS.md and only the indicated specs/skills; retrieve additional sections when needed. Never omit a relevant safety, save, art or combat contract. Source and approved specs override summaries. Open source on demand; use targeted searches/ranges after establishing relevant architecture. Avoid repeated full LDtk JSON dumps: inspect rooms/layers with LDtk MCP or local parsing. Images: use relevant previews rather than many redundant images; retain full-resolution verification when needed.
- Do not auto-load every SKILL.md or upstream studio plugin. One primary skill plus supporting skills only if necessary. Use short task-scoped context packets; include version/commit and pointers to authoritative docs. No permanent summaries that erase key requirements.

## Minimal implementation (Ponytail-style)
Prefer existing Phaser APIs, existing assets, direct code and tested shared logic. No speculative abstractions, extra classes, factories, dependencies, future chapter features or broad refactors. Extract shared code when actual duplication or a demonstrated requirement justifies it. Do not shorten code at the expense of correctness, accessibility, readability, save safety, or tests. Record important tradeoffs. This policy applies even if Ponytail is not installed.

## Concise communication (Caveman-style)
Routine handoffs: task ID/status, changed files/commit, concise outcome, tests and exact evidence paths, blockers, next action. Use complete sentences where precision or nuance matters. Keep owner-facing design decisions, risks, test failures, approval requests and user instructions clear, not artificially terse. Do not compress code, logs needed to debug, licensing, or acceptance criteria into ambiguous shorthand.

## Tool output and delegation
Use targeted git diffs/status, bounded log excerpts, search before full-file reads; keep full logs in files with paths and exit status. If a test fails inspect full relevant error, never hide errors or truncate required evidence. Delegate only when specialist skill, independence, or review value outweighs overhead. Parallelize only independent tasks with contracts and separate ownership; small fixes can be completed directly. No fixed subagent count; never pretend subagents ran. Summarize once at integration instead of copying raw transcripts. Keep skill/tool discovery on demand.

## Measure, don't assume
Optional Ponytail/Caveman/RTK/Headroom are documented in tools/TOKEN_TOOLCHAIN.md; none installed by this kit. Verify client compatibility and permissions, review hooks/config, pin reviewed versions, and get approval before installs that add dependencies, cost or new data access. Do not stack token tools by default. If usage metrics are available record total input/output/cache tokens, model, task, cost, retries and quality/test results; compare like-for-like tasks before adoption. Otherwise record qualitative changes, no invented savings. Never trade acceptance checks for lower token usage. All six build gates and Parry Death requirements remain unchanged.

## Claude Code routing (v1.4)
Use MODEL_ROUTING.md and native workers; default Sonnet main session, Haiku bounded lookup, Sonnet implementation/QA, Opus critical reasoning. Do trivial work directly; no recursive delegation. Scope agent briefs, avoid preloading all skills; `.claude/skills/` adapters load canonical bodies on demand. Keep model/effort stable when possible to avoid cache misses. Record only reported usage, actual model if known and escalation; no assumed savings. Save durable handoff before `/clear`.
