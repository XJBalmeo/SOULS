# Optional token-efficiency tools

The mandatory built-in policy is docs/CONTEXT_POLICY.md and souls-context-manager; it requires no external tool. Candidate integrations only, not installed or tested. Check current upstream documentation and client support; use reviewed pinned versions. Never run install scripts/hooks blindly or send private project data to unapproved services.

| Candidate | Purpose | Adoption |
|---|---|---|
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Minimal, reusable implementation; less speculative code | First candidate; test against a small M1 task, confirm actual activation (client-specific plugin/hook or explicit instructions). |
| [Caveman](https://github.com/JuliusBrussee/caveman) | Short routine agent reports | Optional; built-in concise handoff policy first. Never truncate specifications, error detail, or owner decisions. |
| [RTK](https://github.com/rtk-ai/rtk) | Filter verbose terminal output | Defer until repeated log overhead; verify exit codes, preserve raw logs, bypass when debugging. |
| [Headroom](https://github.com/chopratejas/headroom) | Compress context/tool results | Defer; review privacy, correctness and compatibility. Never use lossy compression on critical code, map data or save contracts. |

Ponytail-style minimalism and concise reporting are already embedded as project guidance; external installation is not required. No guaranteed token/cost savings. Benchmark task-level total usage, including retries and QA, before adopting a new tool. Follow approved toolchain and security rules.

## v1.4 native routing
Use `docs/MODEL_ROUTING.md` and `.claude/agents/` rather than an external routing framework. The project has no automatic external plugin installation, shell hook, API gateway or billing override. Claude Code model routing is actual named-worker delegation governed by the lead; runtime verification is M1.1.
