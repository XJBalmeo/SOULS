# Claude Code model routing — v1.4

**Scope:** native Claude Code, M1 Famine. Sonnet is the main Lead Orchestrator. The routing policy is a decision procedure, not an independent API gateway: the lead classifies a task and invokes a named project subagent with its configured model. The main session does not change model automatically. Account/organization restrictions and local overrides may affect actual models. Verify the model and agent availability; record unknown actual model as unknown, not as confirmed.

## Route before delegation
| Tier | Use | Model / agent | Examples |
|---|---|---|---|
| T0 | Read-only, bounded lookup or inventory | Haiku / `souls-explorer` | Asset paths, focused source references, summarize specific logs |
| T1 | Scoped coding, art/level/audio specification or integration | Sonnet / `souls-developer` (or lead directly) | Menu, rat AI extension, sprite integration, room edits |
| T2 | Complex but bounded implementation and independent verification | Sonnet / `souls-developer` or `souls-qa` | Collision, boss behavior, deterministic room tests |
| T3 | High-risk design, durable state, severe regression, difficult integration | Opus / `souls-architect` | Parry Death state machine, save migration, fatal-event races |

Classify by actual risk, complexity, uncertainty and scope, not specialist job title. Do a trivial edit or quick lookup directly in the main session if spawning costs more than it saves. Prefer one scoped Sonnet implementation with a review over many agents repeating the same work. T3 architect produces a focused design or root-cause recommendation; Sonnet implements and QA independently verifies. Do not route a critical save or safety decision to Haiku merely because the code change is small.

## Native workers
Use the Agent tool with the actual project agent name (see `.claude/agents/`). Give each task ID, build, objective, relevant skill/spec paths, file scope, constraints, approval status, test criteria and concise output contract. Do not pass the full master prompt. `souls-explorer` and `souls-architect` have read-only file tools. `souls-developer` may use configured tools subject to permissions; it is responsible for a scoped specialty assignment, including art/map/audio if the needed MCP/tool is available. `souls-qa` runs tests and collects evidence, not gameplay edits. Bash access is not a read-only sandbox. Agents must respect assigned file boundaries and never delegate further; lead owns integration. Avoid full agent teams and nested delegation by default. No permission overrides or automatic paid calls.

## Escalation and fallback
1. If initial output fails, inspect failure and distinguish missing approval/tool/asset from reasoning difficulty. Fix a straightforward issue directly. Reuse prior evidence; do not rerun broad exploration.
2. For reasoning difficulty, escalate Haiku → Sonnet → Opus as appropriate. One focused retry at a tier before considering escalation; no automatic retry loops. Opus returns design/diagnosis, not an automatic implementation rewrite.
3. If requested model/agent unavailable, use available appropriate tier (e.g., Sonnet for Haiku tasks). For T3, attempt with capable available model only if safe; otherwise mark BLOCKED and obtain review. Never bypass required checks or owner approval. Record fallback and reason. If subagents unavailable, lead performs scoped work sequentially.
4. If usage quota is near exhaustion, checkpoint status/evidence, avoid new speculative work, and resume when available. Do not spend paid API credits or switch billing arrangements without approval.

## Budget and context
Use Sonnet for everyday orchestration, Opus only for justified decisions, Haiku for genuinely useful bounded exploration. No fixed percentage or guaranteed savings. Keep prompt prefixes stable, read only necessary specs and source, use targeted diffs and logs, and avoid repeatedly switching main model (cache misses may cost more). Inspect `/context` and `/usage` when supported; `/clear` only after writing durable handoff, `/compact` with explicit preservation of current build, constraints, test evidence and next task. Actual subscription usage and API costs are different. Record reported metrics only; do not invent per-agent token counts, costs or model identity. External Ponytail/Caveman/RTK/Headroom remain optional and uninstalled.

## Gate-specific priorities
v0.1 Sonnet menu/baseline, Haiku bounded inspection; v0.2 Sonnet combat/checkpoints, Opus save-contract review if high risk; v0.3 Opus Parry Death architecture/persistence, Sonnet implementation and QA; v0.4 Sonnet LDtk/enemies, Opus only for hard traversal/generation issues; v0.5 Sonnet boss/audio integration, Opus for difficult state interactions; v1.0 Sonnet full tests/polish, Opus unresolved critical regressions. All original build gates and human review remain mandatory.

References: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [model configuration](https://code.claude.com/docs/en/model-config), [settings](https://code.claude.com/docs/en/settings).
