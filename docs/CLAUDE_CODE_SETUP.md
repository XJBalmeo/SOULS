# Claude Code setup — v1.4

## Install the overlay safely
Extract at the existing SOULS repository root, retaining hidden `.claude` and `.agents` folders. Review conflicts with existing files (especially CLAUDE.md and status); do not overwrite real gameplay progress or local settings. No game code, dependencies, credentials, hooks, MCP servers or third-party plugins are installed by this package. No `.claude/settings.json` is included to avoid overriding your existing settings/permissions. Commit the reviewed overlay on a focused branch.

## Run
From the repo root, with Claude Code installed and authenticated:
```bash
claude --version
claude --model sonnet
```
In the interactive session, inspect `/agents`, `/skills` and `/model` as supported; verify the four project worker definitions and model availability. Run `/souls-start` or paste `Read MASTER_PROMPT.md and execute the current approved Famine build.` The main session is the Lead Orchestrator; no separate lead subagent is necessary. `opusplan` is optional for an explicitly selected deep planning session; it is not required for routing. Never change the account or billing source without approval.

## Smoke test before production (M1.1)
- Confirm actual repo root, branch, `CLAUDE.md` and status. Check installed Claude version, `/agents` discovery, `/skills` discovery and current `/model`.
- Ask the lead to invoke `souls-explorer` once for a bounded read-only lookup of `package.json` and the Phaser entry point. Confirm actual agent/model if exposed; no edits.
- Verify `souls-developer` and `souls-qa` are listed as Sonnet; `souls-architect` as Opus. Do not spend an Opus call merely to prove routing if quota is limited; record runtime verification pending until first T3 task.
- Check `/mcp` for configured tools and actual availability. Test only relevant approved MCP tools. No plugin auto-install; use `docs/TOOLCHAIN.md` and `tools/TOKEN_TOOLCHAIN.md` for candidates.
- If native agents are unavailable or model aliases blocked, follow routing fallback; never report a model or agent was used unless verified. Restart Claude if newly extracted agent/skill files are not discovered. Run `claude doctor` for configuration errors if supported.
- Keep the standard M1.1 game-launch and Puppeteer baseline requirements; setup validation does not replace gameplay tests.

## Resuming / budget
Use `/souls-start` for subsequent sessions after updating status, or tell Claude to resume the next READY task. Use `/context` and `/usage` if available; save task state before `/clear`, and `/compact` only with constraints preserved. Main model stays Sonnet, named worker models are configured in their files. The router is instructions + native delegation, not an autonomous gateway. No deterministic guarantee of model choice, availability, savings or completion; verify actual execution. No Codex-specific adapters in this version.

Official references: https://code.claude.com/docs/en/sub-agents ; https://code.claude.com/docs/en/skills ; https://code.claude.com/docs/en/model-config.
