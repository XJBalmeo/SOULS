# Save contract — v1 (Famine v0.2)

Implementation: `js/SaveManager.js`. Settings live separately in `souls.settings.v1` and are never touched by saves.

## Storage
- `localStorage["souls.save.v1"]` holds the single campaign as JSON.
- `localStorage["souls.save.v1.unreadable"]` holds a verbatim copy of an unreadable save. It is written when New Game replaces that save, so bad data is never silently erased.
- The campaign always lives in memory (`SaveManager.campaign`). If a write fails, play continues, `SaveManager.persistent` becomes false and a warning is logged. Nothing claims reload protection that storage can't give.

## Schema (version 1)
```json
{
  "version": 1,
  "campaignId": "2026-11-13T18:00:00.000Z-abc123",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "chapter": "famine",
  "completedChapters": [],
  "parryDeathUsed": false,
  "chapters": {
    "famine": {
      "seed": 123456789,
      "rooms": [
        { "id": "famine-room-0", "template": "Level_0" },
        { "id": "famine-room-1", "template": "Level_2" }
      ],
      "checkpointId": "famine-start"
    }
  }
}
```
- **Room IDs:** `rooms` lists the built room instances in order. The IDs are stable per position (`famine-room-N`); the templates can repeat. The list is `null` until the first build. GameScene then picks templates with `new Phaser.Math.RandomDataGenerator([String(seed)])` (`rng.pick` three times from Level_1-3, between Level_0 and Level_4), and saves the result. After that the list is authoritative and the seed is kept as a record.
- **Checkpoint:** `checkpointId` is `famine-start` (the PlayerStart in the first room). Owner decision 2026-11-13: until physical checkpoints arrive in v0.4/M1.7, the only checkpoint is the chapter start. When they arrive, IDs will be `<roomId>:<entity iid>`, and activating one refills HP and stamina (owner decision).
- **`parryDeathUsed`:** written as `false` for every new campaign. It is campaign-level, not part of any checkpoint snapshot. v0.3 (M1.4A) sets it to `true` at trigger and persists it immediately. Restores and chapter changes never set it back to `false`; only New Game does.

## Lifecycle
| Event | Effect on the save |
|---|---|
| New Game, no save | New campaign written |
| New Game, valid or unreadable save exists | Confirmation first. An unreadable save is copied to `.unreadable`, then the new campaign is written |
| First GameScene build | `rooms` filled and written |
| Continue | Valid save loaded. The map is rebuilt from `rooms` and the player starts at the checkpoint |
| Death / Retry from Checkpoint | No write. GameScene restarts from the in-memory campaign: same map, full HP/stamina, regular enemies reset |
| Quit to menu / reload | Nothing lost. Continue resumes from the checkpoint |
| Any write except New Game | Re-reads storage first. If storage holds a *different* campaign (for example New Game in another tab) or an unreadable save, it does not write and stops saving for this session. If it holds the same campaign, `parryDeathUsed` is OR-merged so it never goes back to false |
| New Game when the unreadable save can't be backed up | The unreadable save is left untouched and the new journey runs unsaved |

Continue is disabled with an explanation when there is no save, the save is unreadable, or storage is unavailable.

## Validation and migration
`SaveManager.validate` rejects anything that isn't exactly version 1 with the required fields, plus duplicate room IDs and unknown chapters in `completedChapters`. Unknown extra fields are allowed, so later builds can add fields without a version bump. Rejected saves are reported as `corrupt` and never overwritten without the New Game confirmation. No migrations exist yet. A future version 2 must add an explicit `migrate(v1) → v2` step plus a test, and keep `parryDeathUsed` (monotonic).

If a saved room template no longer exists in `FAMINE.ldtk`, the layout is regenerated from the seed and `checkpointId` is reset to `famine-start`, then re-saved and a warning logged. A changed LDtk project can't reproduce the old map.

Reviewed by souls-architect (Opus 5.5) on 2026-11-13: APPROVE WITH CHANGES. All six changes were applied: the stale-tab guard, the monotonic flag merge, no overwrite when the backup fails, duplicate room ID and chapter validation, the checkpoint reset on regeneration, and the documented seed format.
