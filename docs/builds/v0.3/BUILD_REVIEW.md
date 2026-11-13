# Build review — Famine v0.3 Parry Death & Enemies

- **Active milestone:** M1 — Famine
- **Build / status:** v0.3 Parry Death & Enemies — **REVIEW**
- **Branch:** `famine/v0.3-parry-death-enemies`, from the approved v0.2 plus the Hollow Archer demo. No PR has been opened and nothing has been merged.
- **Launch:** run `npm start`, then open http://localhost:8000.
- **Tests:** `npm test` runs five suites.

## Tasks
- **M1.4A Parry Death:**
  - A once-per-campaign encounter on the first fatal hit.
  - Death's Shadow approaches, hovers for a random time, raises its scythe and strikes once.
  - Press **C** during the strike to parry.
  - Success revives the knight in the same fight. Failure leads to the normal death screen and the checkpoint.
  - The architect's contract is in `docs/PARRY_DEATH_CONTRACT.md`.
- **M1.6 enemies:** the Scavenger Rat plus two new types:
  - **The Starved:**
    - Behaviour: slow shuffle, then a 600 ms wind-up with flashing eyes, a 30-damage lunge and 0.9 s on the ground.
    - Health: 3 HP.
  - **Hollow Archer:**
    - Behaviour: 800 ms draw with an arrowhead glint, then a 15-damage flat arrow and a 1.5 s reload.
    - Health: 2 HP.
  - **Both:**
    - Full animation sets, including death animations.
    - AI, sound effects and LDtk placement: one of each per middle room.
- **M1.5 production standards:** frame and anchor rules, four-tone palettes, amber reserved for warnings, a generator pipeline and a palette audit (`docs/ANIMATION_STANDARD.md`).
- **SFX:** 14 original synthesized sounds, controlled by Effects Volume.

## Owner decisions applied
- Hollow Archer look and behaviour: shown as a demo, then the owner said "proceed with the full plan".
- Menu and fullscreen changes from the v0.2 review.
- **Still open, so my proposed defaults are used:**
  - The sword cannot cut arrows.
  - Hits don't interrupt the Starved's wind-up.
  - Parry key C, the 300 ms window and the other timings.
  - Early presses fail.
  - The look of the Starved and Death's Shadow.

## Acceptance criteria (v0.3 row)
| Criterion | Result | Evidence |
|---|---|---|
| Parry success | PASS | A real arrow kill is parried at the default 300 ms window. HP and stamina are full, the same fight continues and the archer keeps its HP. (`parry-01..04` screenshots) |
| Parry failure | PASS | Early, late and held-key presses all fail and lead to the normal death screen and checkpoint restore |
| Randomized single attack | PASS | One strike only. The hover delay stays within 0.6–2 s (rng seam) |
| Durable once-per-campaign flag | PASS | Saved at trigger. The next fatal hit is a normal death after success, after failure, after Retry and after reload + Continue. New Game resets it. With storage unavailable it is kept in memory and a warning is logged |
| Same-encounter revival | PASS | No scene restart. Enemies keep their HP and positions, arrows are cleared, 1.5 s of protection |
| Reload/pause cleanup | PASS | Pause freezes the encounter clock. C is ignored while paused. Leaving fullscreen opens pause. Retry mid-encounter leaves no Death sprite or listener behind |
| Rat + two new enemy types | PASS | Starved 21/21, archer 20/20. Spawn, AI, damage, dodges, death animations, reset |
| Integrated animations/AI/SFX/placement | PASS (art/audio pending owner review) | See the sheets table in ANIMATION_STANDARD.md and the LDtk entities `Starved` and `HollowArcher` |

## Automated tests
`npm test` exits 0. Totals: smoke 50/50, survival 47/47, archer 20/20, starved 21/21, parrydeath 44/44, so **182/182**.

## Independent QA
`souls-qa` (Sonnet) found **no BLOCKER or MAJOR** issues. It confirmed 182/182 and ran its own probes in `tests/qa-probes/v03-*.mjs`:
- edge1 30/30, edge2 35/35, edge4 14/14, edge7 and edge7b.
- A 3-minute random-input soak: 577 inputs and 14 encounters, with 0 errors and 0 warnings.
- Heap after GC over 10 restarts, 5 of them mid-encounter: no upward trend. Sound, listener and object counts stayed constant.

**Verified edge cases:**
- Fatal hits on a rope, mid-vault and mid-air. The knight snaps to the floor, and after revival he can walk, jump and climb.
- Fatal hits during a roll or a swing.
- A rat, an arrow and a lunge landing in the same frame: exactly one encounter.
- Quit mid-encounter, then Continue or New Game.
- Pause in every phase.
- Pressing C repeatedly while downed.

**Findings, fixed by the Lead:**
- **MINOR 1, lunge off ledges:** a Starved could lunge off a ledge. The lunge now stops at the edge (`v03-edge7b`: no fall).
- **MINOR 2, re-wind-up during protection:** after a parry, a Starved that dealt the fatal hit could start a new wind-up while the knight was still protected. Nearby enemies now stay calm for 1 s after the protection ends (`calmExtraMs`), and the next wind-up is a full visible 600 ms (`v03-edge2` 2c).
- **NOTE 1, readability:**
  - The prompt is brighter and larger.
  - Death flashes amber as the scythe rises.
  - A strike-window screenshot was added (`parry-02b-strike-window.png`).

**Open:**
- QA thinks the downed knight looks small next to Death.
- QA could not judge real audio, the feel of the 300 ms window or real fullscreen resume.

## Human playtest
**PENDING.** Owner, please:
- **Die once on purpose** and try the parry, then try failing it in a new game.
- **Fight a Starved:**
  - roll through its lunge;
  - hit it while it's down.
- **Archers:** crouch under their arrows.
- **Listen to the sound effects.** I can't hear them, so they need your ears.
- **Judge the look** of the Starved and Death's Shadow.

## Known issues / limits
- The knight has no new art. Downed, parry and revive reuse the crouch, attack and idle frames with tint effects.
- Enemy hurt reactions are a white flash; only deaths are animated.
- Sound effects are synthesized placeholders until the owner approves or replaces them. There are no menu sounds yet.
- Parry Death with a boss can't be tested until the boss exists (v0.5).
- If storage fails and an older save exists, a reload can bring the encounter back. This is documented, and no protection is promised in that case.

## Asset provenance
All new sprites and sounds are original and generated by scripts in `tools/`. See ASSET_LICENSES.md.

## Owner decision
- **Decision:** PENDING
- **Review date / reference:**
