// Knight spawn (owner 2026-11-15): every time GameScene starts (New Game,
// Continue, respawn, Retry) a beam comes down (sprites/HERO/BEAM.png, frames
// of 100x300 with the same bottom pixel row as the knight's 100x100 frame),
// turns into NEW_SPAWN.png, then idle. Only then does the player get control,
// and at that moment the camera pans smoothly from its spawn framing to the
// knight's centre.
// After a death (not New Game / Continue / Retry) NEW_RESPAWN.png is used
// instead: 25 full-screen frames of 512x288 that continue from the last YOU
// DIED frame and end on the knight's spawn pose, drawn where the spawn camera
// framing puts him, so the cut to the game and idle is seamless.
const SPAWN_CONFIG = {
  beamFrameMs: 60,      // BEAM.png, 7 frames
  spawnFrameMs: 100,    // NEW_SPAWN.png, 6 frames
  // NEW_RESPAWN.png, 25 full-screen frames (owner 2026-11-15): every frame
  // respawnFrameMs, the second-to-last respawnSecondLastMs, the last as long
  // as frame 1 of NEW_DOWN (1000 / HURT_CONFIG.downFrameRate).
  respawnFrameMs: 100,
  respawnSecondLastMs: 500,
  respawnUndimMs: 300,  // the black fades away during the last 300 ms of the second-to-last frame
  // Camera during the spawn: it looks this many px to the right of the
  // knight (positive = knight left of centre). Adjustable.
  // 55 puts the in-game beam (BEAM.png column x 30-67 of the knight frame) on
  // the same screen column as sprites/menu_beam.png (x 181-218 of 512), and
  // NEW_RESPAWN.png's last frame draws the knight at this same spot.
  cameraLookRightPx: 55,
  centerPanMs: 800,     // smooth pan to the knight's centre after the spawn
  centerPanEase: "Sine.easeInOut",
  // The camera may go this far past a room's left/right edge, so it can
  // centre the knight next to a wall (half the 512 px view).
  cameraEdgeMarginPx: 256,
};

const Spawn = {
  preload(scene) {
    scene.load.spritesheet("hero_beam", "sprites/HERO/BEAM.png?v=" + Date.now(), { frameWidth: 100, frameHeight: 300 });
    scene.load.spritesheet("hero_respawn", "sprites/HERO/NEW_RESPAWN.png?v=" + Date.now(), { frameWidth: 512, frameHeight: 288 });
    scene.load.spritesheet("hero_spawn", "sprites/HERO/NEW_SPAWN.png?v=" + Date.now(), { frameWidth: 100, frameHeight: 100 });
  },

  createAnims(scene) {
    const C = SPAWN_CONFIG;
    scene.createAnimOnce({ key: "beam", frames: scene.anims.generateFrameNumbers("hero_beam"), frameRate: 1000 / C.beamFrameMs, repeat: 0 });
    const respawnFrames = scene.anims.generateFrameNumbers("hero_respawn");
    const n = respawnFrames.length;
    const lastMs = Math.round(1000 / HURT_CONFIG.downFrameRate); // NEW_DOWN frame 1
    scene.createAnimOnce({
      key: "respawn",
      frames: respawnFrames.map((f, i) => ({
        ...f,
        duration: i === n - 1 ? lastMs : i === n - 2 ? C.respawnSecondLastMs : C.respawnFrameMs,
      })),
      repeat: 0,
    });
    scene.createAnimOnce({ key: "spawn", frames: scene.anims.generateFrameNumbers("hero_spawn"), frameRate: 1000 / C.spawnFrameMs, repeat: 0 });
  },

  // Called at the end of GameScene.create, after the camera follows the knight.
  start(scene) {
    const C = SPAWN_CONFIG;
    const p = scene.player;
    const cam = scene.cameras.main;
    Spawn.createAnims(scene);
    scene.isSpawning = true;
    // Locked framing from the first frame (rigid follow): the knight sits cameraLookRightPx
    // left of centre (startFollow again snaps the camera there).
    cam.startFollow(p, true, 1, 1, -C.cameraLookRightPx, 0);
    p.setVisible(false);
    p.anims.stop();
    if (scene.respawnAfterDeath) Spawn.coverScreen(scene);
    // The LDtk spawn point overlaps the wall and is in the air: let one physics
    // step push the knight out, then put him on the floor (update) and start the beam.
    scene.spawnSettling = true;
  },

  // Respawn: black over the whole view (HUD included) from the first frame,
  // then the YOU DIED screen can go.
  coverScreen(scene) {
    const v = scene.viewport;
    scene.respawnCover = scene.add.rectangle(v.x, v.y, v.w, v.h, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(2000);
    scene.respawnAnim = scene.add.sprite(v.x + v.w / 2, v.y + v.h / 2, "hero_respawn", 0)
      .setScrollFactor(0).setDisplaySize(v.w, v.h).setDepth(2001);
    scene.scene.stop("DeathScene");
  },

  playRespawn(scene) {
    const p = scene.player;
    const a = scene.respawnAnim;
    const C = SPAWN_CONFIG;
    const cover = scene.respawnCover;
    a.play("respawn");
    // The black fades away to the game in the last respawnUndimMs of the
    // second-to-last frame, so it is gone exactly when the last frame starts.
    const onFrame = (anim, frame) => {
      if (frame.index !== a.anims.currentAnim.frames.length - 1) return;
      a.off("animationupdate", onFrame);
      scene.time.delayedCall(C.respawnSecondLastMs - C.respawnUndimMs, () => {
        scene.tweens.add({ targets: cover, alpha: 0, duration: C.respawnUndimMs, ease: "Sine.easeInOut" });
      });
    };
    a.on("animationupdate", onFrame);
    a.once("animationcomplete", () => {
      // The last frame is the knight's spawn pose at his on-screen spot: the
      // real knight takes over (same pixels) in idle and control returns.
      cover.destroy();
      a.destroy();
      scene.respawnCover = null;
      scene.respawnAnim = null;
      p.setVisible(true);
      p.anims.play("idle", true);
      Spawn.finish(scene);
    });
  },

  startBeam(scene) {
    const C = SPAWN_CONFIG;
    const p = scene.player;
    Spawn.snapToFloor(scene);
    scene.cameras.main.startFollow(p, true, 1, 1, -C.cameraLookRightPx, 0); // re-lock on the final spot
    if (scene.respawnAfterDeath) {
      Spawn.playRespawn(scene);
      return;
    }
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
    cam.setLerp(0.08, 0.08); // the normal smooth follow (rigid during the spawn)
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
