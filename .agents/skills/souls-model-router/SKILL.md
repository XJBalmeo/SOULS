---
name: souls-model-router
description: Route SOULS tasks by complexity and risk to native Claude Code Haiku, Sonnet or Opus subagents; escalate with evidence and minimize redundant work.
---
# SOULS model router
Read `docs/MODEL_ROUTING.md`. Main lead is Sonnet. Choose direct work for trivial tasks; T0 `souls-explorer` Haiku, T1/T2 `souls-developer` Sonnet, independent tests `souls-qa` Sonnet, T3 `souls-architect` Opus. Use native Agent invocation with a focused task packet. Verify availability; record requested and actual model (if reported), tier and fallback. Escalate on reasoning failure using prior findings; do not retry unavailable tools. No recursive delegation, automatic spend, or weakening tests. Lead integrates; all Famine gate approvals and Parry Death rules remain mandatory.
