// Knight spawn (owner 2026-11-15): every time GameScene starts (New Game,
// Continue, respawn, Retry) a beam comes down (sprites/HERO/BEAM.png, frames
// of 100x300 with the same bottom pixel row as the knight's 100x100 frame),
// turns into NEW_SPAWN.png, then idle. Only then does the player get control,
// and at that moment the camera pans smoothly from its spawn framing to the
// knight's centre.
const SPAWN_CONFIG = {
  beamFrameMs: 60,      // BEAM.png, 7 frames
  spawnFrameMs: 100,    // NEW_SPAWN.png, 6 frames
  // Camera during the spawn: it looks this many px to the right of the
  // knight (positive = knight left of centre). Adjustable.
  cameraLookRightPx: 96,
  centerPanMs: 800,     // smooth pan to the knight's centre after the spawn
  centerPanEase: "Sine.easeInOut",
  // The camera may go this far past a room's left/right edge, so it can
  // centre the knight next to a wall (half the 512 px view).
  cameraEdgeMarginPx: 256,
};

const Spawn = {
  preload(scene) {
    scene.load.spritesheet("hero_beam", "sprites/HERO/BEAM.png?v=" + Date.now(), { frameWidth: 100, frameHeight: 300 });
    scene.load.spritesheet("hero_spawn", "sprites/HERO/NEW_SPAWN.png?v=" + Date.now(), { frameWidth: 100, frameHeight: 100 });
  },

  createAnims(scene) {
    const C = SPAWN_CONFIG;
    scene.createAnimOnce({ key: "beam", frames: scene.anims.generateFrameNumbers("hero_beam"), frameRate: 1000 / C.beamFrameMs, repeat: 0 });
    scene.createAnimOnce({ key: "spawn", frames: scene.anims.generateFrameNumbers("hero_spawn"), frameRate: 1000 / C.spawnFrameMs, repeat: 0 });
  },

  // Called at the end of GameScene.create, after the camera follows the knight.
  start(scene) {
    const C = SPAWN_CONFIG;
    const p = scene.player;
    const cam = scene.cameras.main;
    Spawn.createAnims(scene);
    scene.isSpawning = true;
    // Locked framing from the first frame: the knight sits cameraLookRightPx
    // left of centre (startFollow again snaps the camera there).
    cam.startFollow(p, true, 0.08, 0.08, -C.cameraLookRightPx, 0);
    p.setVisible(false);
    p.anims.stop();
    // The LDtk spawn point overlaps the wall and is in the air: let one physics
    // step push the knight out, then put him on the floor (update) and start the beam.
    scene.spawnSettling = true;
  },

  startBeam(scene) {
    const C = SPAWN_CONFIG;
    const p = scene.player;
    Spawn.snapToFloor(scene);
    scene.cameras.main.startFollow(p, true, 0.08, 0.08, -C.cameraLookRightPx, 0); // re-lock on the final spot
    scene.spawnBeam = scene.add.sprite(0, 0, "hero_beam", 0).setOrigin(0.5, 1).setDepth(p.depth + 1);
    Spawn.alignBeam(scene);
    scene.spawnBeam.play("beam");
    scene.spawnBeam.once("animationcomplete", () => {
      // The last beam frame is the first spawn frame: swap without a seam.
      scene.spawnBeam.destroy();
      scene.spawnBeam = null;
      p.setVisible(true);
      p.anims.play("spawn");
      p.once("animationcomplete", () => {
        p.anims.play("idle", true);
        Spawn.finish(scene);
      });
    });
  },

  // Puts the knight straight onto the floor below the spawn point.
  snapToFloor(scene) {
    const p = scene.player;
    const b = p.body;
    for (let dy = 0; dy <= 600; dy += 1) {
      const hit = scene.physics.overlapRect(b.center.x - 3, b.bottom + dy, 6, 1, false, true)
        .some((h) => h.gameObject && scene.ground.contains(h.gameObject) && !h.gameObject.isRope && !h.gameObject.isPlatform);
      if (hit) {
        p.body.reset(p.x, p.y + dy);
        return;
      }
    }
    p.setVelocity(0, 0);
  },

  // The beam's bottom row sits on the knight's frame bottom row, same column.
  alignBeam(scene) {
    const p = scene.player;
    const b = scene.spawnBeam;
    if (!b) return;
    const frameLeft = p.x - p.displayOriginX;
    const frameBottom = p.y - p.displayOriginY + p.height;
    b.setFlipX(p.flipX);
    b.setPosition(frameLeft + p.width / 2, frameBottom);
  },

  // Control returns and, at the same moment, the camera glides to centre.
  finish(scene) {
    const C = SPAWN_CONFIG;
    const cam = scene.cameras.main;
    scene.isSpawning = false;
    scene.tweens.add({
      targets: cam.followOffset, x: 0, y: 0, duration: C.centerPanMs, ease: C.centerPanEase,
    });
  },

  // From GameScene.update while spawning: keep the knight still and the beam on him.
  update(scene) {
    const p = scene.player;
    p.setVelocityX(0);
    if (scene.spawnSettling) {
      scene.spawnSettling = false;
      Spawn.startBeam(scene);
    }
    Spawn.alignBeam(scene);
  },
};
