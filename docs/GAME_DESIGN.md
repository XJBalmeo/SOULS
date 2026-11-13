# SOULS — Game design document v1.1

## Confirmed vision
A knight attempts to stop the apocalypse by defeating four Horsemen, in fixed order: Famine, War, Conquest, Death. SOULS is a linear 2D action platformer, inspired by Dead Cells' responsive movement, readable combat, pixel art, atmosphere and modular exploration. It is not a full-reset roguelike. Use original art/audio/code. Browser-based Phaser/JavaScript and LDtk remain the foundation.

## Pillars
Responsive sword combat, fair attack telegraphs and recovery windows; distinctive worlds; varied but simple enemy behaviors; randomized handcrafted rooms; checkpoint-based persistence; polished title-to-ending experience.

## Player
Preserve existing knight and sword combat, running, jumping, rolling, crouching, rope climbing, health and stamina. Improve animation transitions, hitboxes, damage feedback and dodge timing. Unlock new abilities and weapons through story progression. Specific unlocks, equipment UI and ability mechanics require approval; no random loot rarity, skill tree or crafting assumed. Knight name, backstory and ending are open.

## Campaign
Each chapter has starting room, randomized intermediate handcrafted rooms, checkpoints and guaranteed fixed Horseman arena. Defeating boss advances chapter; defeating Death triggers ending/credits. Minimum five regular enemies per chapter plus boss; proposed target six. See ENEMY_ROSTER.md. Horsemen have distinct physical forms (not necessarily mounted).

| Chapter | Visual identity | Combat emphasis | Proposed boss |
|---|---|---|---|
| Famine | Established dark olive green, near-black ruined city, mossy stone, parallax | Basic melee, ranged and vertical threats | Hollow King: giant crowned skeletal rat, bite and charge |
| War | Proposed crimson/charcoal/burnt orange, ruined fortifications | Shields, heavy attacks, explosives | Crimson Warlord: armored warrior, greatsword |
| Conquest | Proposed ivory/gold/purple, corrupted royal architecture | Reach, support, coordinated foes | Eternal Sovereign: regal ranged commander |
| Death | Proposed violet/cyan/black, spectral necropolis | Supernatural threats, mastery | Last Horseman: spectral scythe reaper |

## Death, checkpoints and saves
Confirmed: restart current level or latest checkpoint, full health/stamina restore and regular enemies reset. Never lose completed chapters. Proposed implementation: stable checkpoint ID + room-instance ID, chapter and generated room sequence/seed, saved progression and version; no checkpoint means chapter start. Clear transient effects and reset unfinished boss to full health on retry. Completed bosses remain defeated. Persist chapter transitions and approved unlocks; make New Game reset explicit. Use localStorage initially; handle unavailable/corrupt storage gracefully. Activation healing and exact encounter reset boundaries to be refined; document rule before implementation. Settings persist independently. Save schema and migration tests required.

## Room generation
Reuse current Famine template approach. Existing generator chooses three intermediate rooms with replacement, between Level_0 and Level_4. New templates must be included by runtime logic. Guarantee compatible directional doors, collision, reachable spawns/checkpoints and boss arena; record actual room sequence and stable instance IDs, not just template names (duplicates possible). Rebuild same map on Continue/retry. New campaign may generate another sequence. No engine migration or new procedural system required.

## Interface and audio
Title/main menu (New Game, Continue, Settings, Credits), pause/resume/retry/menu, health/stamina HUD, chapter intro/transitions, boss bar, death/retry, victory/credits. Disable Continue if no valid save; confirm New Game overwrite. Menu music, exploration and boss tracks per chapter, environmental ambience, movement/combat/enemy/UI effects. Separate persistent music/SFX settings; user gesture unlocks audio; clean loops/transitions. Browser offline play where practical.

## Enemy and boss requirements
Unique silhouette, combat role, telegraph, active damage window, recovery, HP/hitboxes, defeat, animations, SFX, spawn and checkpoint reset. Reuse patrol/pursuit/attack and shared damage handling; avoid contact damage unless explicitly designed. Bosses have dedicated arena, health bar, fair recovery, nearby checkpoint, music and defeat/transition. Start with two or three attacks, not excessive phases. Concepts in roster are proposals, not approved final art.

## Release gate
All four chapters playable end-to-end; five regular enemies minimum and distinct boss each; menus/save/retry/audio/ending functional; approved original assets with provenance; automated regression and human playtest; owner approval. Scope not yet fixed: chapter length, exact room count, weapon unlocks, narrative, final boss appearance and later-world art. Resolve when needed, not before baseline work.

## Signature mechanic — Parry Death (confirmed)
On first fatal damage in a run, the knight is downed and a Death enemy approaches his soul, then attacks once at random. A successful timed parry revives him with full health and stamina; failure invokes normal death. The occurrence is consumed whether success or failure. Working definition of run: entire New Game campaign; persist consumption at trigger across checkpoints, chapter transitions and Continue. The encounter is separate from normal combat and from the final Horseman boss. Success resumes the current encounter rather than resetting it (proposed default). See `PARRY_DEATH.md` for detailed design, implementation and acceptance tests. Required in M1 and all later chapters. Input, timing, appearance and presentation remain proposals.
