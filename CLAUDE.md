# Claude Code — SOULS v1.4

Read [AGENTS.md](AGENTS.md) for canonical rules. Main Lead Orchestrator defaults to Sonnet (`claude --model sonnet`); use `docs/MODEL_ROUTING.md` and the `souls-model-router` skill before delegation. Native workers: `souls-explorer` (Haiku), `souls-developer` (Sonnet), `souls-qa` (Sonnet), `souls-architect` (Opus). Use named Agent invocations only when useful; perform trivial work directly. Respect client permissions, verify available models, and fall back explicitly if unavailable.

Start with `/souls-start` or read `MASTER_PROMPT.md`. Resume from status and current build; follow `docs/CONTEXT_POLICY.md`. Canonical skills live in `.agents/skills/`; `.claude/skills/` provides native discovery adapters. No automatic external installations or paid calls. Only load relevant skills and specs. Preserve Phaser/LDtk and existing game; stop for owner approval at each of the six Famine builds. Never start War until M1 approved.
