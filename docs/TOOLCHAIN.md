# Toolchain and skills setup

All tools are candidates, not installed or validated by this archive. Use only what task requires. Review third-party code, permissions, licenses and hardware/cost before installation; pin reviewed versions or commits. Keep credentials outside git, use minimal scopes and never expose local servers publicly.

| Tool | Source | Role / validation |
|---|---|---|
| Claude Code Game Studios | https://github.com/Donchitos/Claude-Code-Game-Studios | Borrow art-bible, asset-spec, asset-audit, team-combat, team-level, team-audio, regression-suite, playtest-report and role guidance. Do not overwrite existing repo or install full hooks blindly. |
| Phaser | https://docs.phaser.io/ | Confirm actual bundled version and use matching APIs. |
| PixelLab MCP | https://www.pixellab.ai/mcp | Character/animation/tileset candidates; verify account, pricing, access and side-view quality with one sprite. |
| Aseprite | https://www.aseprite.org/docs/cli/ | Frame cleanup, batch export; verify license and CLI. |
| LibreSprite | https://github.com/LibreSprite/LibreSprite | Free alternative; verify exports. |
| LDtk | https://ldtk.io/ | Existing editor/schema; inspect project version. |
| LDtk MCP | https://github.com/gazure/ldtk-mcp | Rust stdio server; validate on copy, read/paint/render/validate. No GUI control. |
| ACE-Step 1.5 | https://github.com/ace-step/ACE-Step-1.5 | Music generation via local CLI/API; check Python/GPU/model license. |
| jsfxr | https://github.com/chr15m/jsfxr | Procedural short SFX. |
| Stable Audio Open | https://huggingface.co/stabilityai/stable-audio-open-1.0 | Optional organic SFX; review model terms/hardware. |
| FFmpeg | https://ffmpeg.org/ | Trim, loop, normalize/export audio. |
| Puppeteer | https://github.com/puppeteer/puppeteer | Existing dependency; browser smoke/regression. |
| GitHub | https://github.com/XJBalmeo/SOULS | Branches and reviewed PRs. |

## Installation examples (not run)
LDtk MCP upstream documents `cargo install --git https://github.com/gazure/ldtk-mcp` and `claude mcp add ldtk ldtk-mcp`. Prefer pinning a reviewed revision (`--rev <commit>`). Requires Rust and binary on PATH. Client configuration differs; for stdio use executable `ldtk-mcp`, with full path if needed. Validate read/render/save roundtrip on a disposable map before editing originals.

ACE-Step upstream documents `uv sync`, `uv run acestep` or `uv run acestep-api` in its separate clone. Confirm hardware and dependencies; do not vendor model weights into SOULS. Generate assets outside runtime; export approved tracks only.

Use `.agents/skills/` files explicitly or configure client-specific discovery; no auto-install. Godot MCP and Unreal skills deferred because they target different engines. Playwright MCP optional; Puppeteer already exists. No mandatory paid service or remote AI dependency.

## Token efficiency (v1.3)
Built-in project rules in CONTEXT_POLICY.md and souls-context-manager require no external tool. See `../tools/TOKEN_TOOLCHAIN.md` for optional Ponytail, Caveman, RTK and Headroom candidates; verify compatibility and approval before installing. No guaranteed savings.
