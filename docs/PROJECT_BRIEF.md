# SOULS — compact project brief (v1.3)

**Source of truth:** AGENTS.md for mandatory workflow; GAME_DESIGN.md for detailed design; DEVELOPMENT_STATUS.md for actual progress; FAMINE_PLAYABLE_BUILDS.md for build gates. This brief is a context shortcut, not a replacement for relevant specifications.

- Existing repo XJBalmeo/SOULS: browser Phaser/JavaScript, LDtk, dark fantasy pixel art; knight seeks to stop apocalypse. Dead Cells-inspired feel, original assets only. Preserve existing sword, movement, stamina, hero, rats, Famine green ruined-city visuals and parallax. Do not migrate or rewrite.
- Fixed campaign Famine → War → Conquest → Death; randomized intermediate rooms; ≥5 distinct regular enemies per chapter (six target) and one distinct Horseman boss. New weapons/abilities through story only after approval.
- Death returns to checkpoint/current chapter. Full HP/stamina, regular enemies reset, same room layout, persistent progress retained.
- **Parry Death:** once per entire New Game campaign, first fatal hit downs knight; special Death approaches and attacks once at randomized timing with readable warning. Timed parry revives full HP/stamina in same encounter; failure normal death. Consume on trigger, persist across reload/Continue/checkpoints/chapters; New Game alone resets. Read PARRY_DEATH.md for implementation.
- Current scope M1 Famine only. Gates: v0.1 menu/foundation → v0.2 combat/saves → v0.3 Parry Death + first two new enemies → v0.4 full roster/maps → v0.5 boss/audio/ending → v1.0 polish/acceptance. Owner approval at each gate; no War production.
- Lead Orchestrator assigns focused tasks, reviews/integrates actual deliverables and tests, maintains status; specialists load only task-relevant context. Verify actual tools, agent support, and current repo. No paid tools or major design changes without approval. No fabricated results, main merge without approval, or unlicensed assets.
- Baseline (static inspection only): js/GameScene.js contains hero/rat and room logic; levels/famine/FAMINE.ldtk five templates, 16px grid, random intermediate rooms; hero/rat sheets 100×100. Actual current branch must be checked. See ARCHITECTURE.md as needed.
