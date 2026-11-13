// Hollow Archer (Famine, M1.6 demo): a ranged enemy that holds its position,
// draws with a visible glint, fires one straight arrow at chest height and
// then reloads. Crouch ducks the arrow, roll passes through it, walls block it.
// Placed in LDtk as the "HollowArcher" entity; reset like rats on restart.
const ARCHER_CONFIG = {
  hp: 2,
  visionRange: 420,     // px, needs a clear line of sight
  visionHeight: 48,     // px: only shoots at a knight roughly level with it (arrows fly flat)
  loseSightMs: 600,     // a draw is cancelled after this long without sight (a short jump keeps it)
  // Draw (telegraph) frame durations; the total is the warning time (800 ms).
  drawFrameMs: [120, 120, 160, 200, 200],
  releaseFrameMs: 100,
  reloadMs: 1500,       // from release until it can start a new draw
  reloadFrameMs: 150,
  arrowSpeed: 320,      // px/s, straight, no drop
  arrowRange: 600,      // px before the arrow disappears
  arrowDamage: 15,
  arrowHeight: 8,       // px below the sprite centre: 42 px above the floor
  arrowMuzzle: 24,      // px in front of the sprite centre where arrows appear
  backstepRange: 70,    // knight closer than this triggers one backstep
  backstepCooldownMs: 3000,
  backstepDistance: 60,
  body: { w: 12, h: 51, x: 46, y: 49 }, // inside the 100x100 frame, facing right
};

const HollowArcher = {
  preload(scene) {
    const frame = { frameWidth: 100, frameHeight: 100 };
    const dir = "sprites/ENEMIES/FAMINE/";
    scene.load.spritesheet("archer_idle", dir + "ARCHER_IDLE.png", frame);
    scene.load.spritesheet("archer_draw", dir + "ARCHER_DRAW.png", frame);
    scene.load.spritesheet("archer_release", dir + "ARCHER_RELEASE.png", frame);
    scene.load.spritesheet("archer_reload", dir + "ARCHER_RELOAD.png", frame);
    scene.load.spritesheet("archer_death", dir + "ARCHER_DEATH.png", frame);
    scene.load.image("archer_arrow", dir + "ARCHER_ARROW.png");
  },

  createAnims(scene) {
    const C = ARCHER_CONFIG;
    const frames = (key, durations) => durations.map((duration, frame) => ({ key, frame, duration }));
    scene.createAnimOnce({ key: "archer_idle", frames: scene.anims.generateFrameNumbers("archer_idle"), frameRate: 3, repeat: -1 });
    scene.createAnimOnce({ key: "archer_draw", frames: frames("archer_draw", C.drawFrameMs), repeat: 0 });
    scene.createAnimOnce({ key: "archer_release", frames: frames("archer_release", [C.releaseFrameMs, C.releaseFrameMs]), repeat: 0 });
    scene.createAnimOnce({ key: "archer_death", frames: frames("archer_death", [100, 120, 140, 400]), repeat: 0 });
    scene.createAnimOnce({ key: "archer_reload", frames: frames("archer_reload", [C.reloadFrameMs, C.reloadFrameMs, C.reloadFrameMs, C.reloadFrameMs * 2]), repeat: 0 });
  },

  // Called once per GameScene.create, before spawning.
  setup(scene) {
    HollowArcher.createAnims(scene);
    scene.archers = scene.add.group();
    scene.arrows = scene.physics.add.group({ allowGravity: false });
    // Walls stop arrows; one-way platforms and ropes do not.
    scene.physics.add.overlap(scene.arrows, scene.ground, (arrow) => {
      Sfx.play(scene, "arrow_hit", 0.5);
      arrow.destroy();
    }, (arrow, block) => !block.isPlatform && !block.isRope);
    scene.physics.add.overlap(scene.player, scene.arrows, (player, arrow) => {
      if (!arrow.active || scene.isPlayerInvulnerable()) return; // a roll passes straight through
      const direction = Math.sign(arrow.body.velocity.x) || 1;
      arrow.destroy();
      Sfx.play(scene, "arrow_hit", 0.8);
      scene.hurtPlayer(ARCHER_CONFIG.arrowDamage, direction, { kind: "arrow" });
    });
  },

  spawn(scene, x, y) {
    const C = ARCHER_CONFIG;
    const archer = scene.physics.add.sprite(x, y, "archer_idle");
    archer.setDepth(10);
    archer.body.setSize(C.body.w, C.body.h);
    archer.setCollideWorldBounds(true);
    scene.physics.add.collider(archer, scene.ground);
    archer.setData({ kind: "archer", deathAnim: "archer_death", hp: C.hp, state: "idle", lastSeenAt: 0, reloadUntil: 0, nextBackstepAt: 0, arrow: null });
    HollowArcher.face(archer, -1); // watches toward the room entrance until it sees the knight
    archer.anims.play("archer_idle");
    archer.on("animationcomplete", (anim) => {
      if (archer.getData("hp") <= 0) return;
      if (anim.key === "archer_draw") HollowArcher.fire(scene, archer);
      else if (anim.key === "archer_release") archer.anims.play("archer_reload");
    });
    scene.physics.add.overlap(scene.attackHitbox, archer, (hitbox, target) => {
      const p = scene.player.body.center;
      if (!scene.hasWallBetween(p.x, p.y, target.body.center.x, target.body.center.y)) {
        scene.damageEnemy(target, scene.SWORD_DAMAGE);
      }
    });
    scene.archers.add(archer);
    return archer;
  },

  // dir: -1 faces left, 1 faces right. The body offset is mirrored with the art.
  face(archer, dir) {
    const b = ARCHER_CONFIG.body;
    archer.setFlipX(dir < 0);
    archer.body.setOffset(dir < 0 ? 100 - b.x - b.w : b.x, b.y);
    archer.setData("dir", dir < 0 ? -1 : 1);
  },

  canSee(scene, archer) {
    const C = ARCHER_CONFIG;
    const p = scene.player.body.center;
    const eyeX = archer.x, eyeY = archer.y - 2;
    if (Math.abs(p.x - eyeX) > C.visionRange || Math.abs(p.y - eyeY) > C.visionHeight) return false;
    return !scene.hasWallBetween(eyeX, eyeY, p.x, p.y);
  },

  fire(scene, archer) {
    const C = ARCHER_CONFIG;
    if (scene.parryDeath && scene.parryDeath.isActive()) return; // the world is frozen
    const dir = archer.getData("dir");
    const old = archer.getData("arrow");
    if (old && old.active) old.destroy(); // one arrow in flight per archer
    const arrow = scene.arrows.create(archer.x + dir * C.arrowMuzzle, archer.y + C.arrowHeight, "archer_arrow");
    arrow.setDepth(11);
    arrow.setFlipX(dir < 0);
    arrow.body.setSize(14, 3);
    arrow.body.allowGravity = false;
    arrow.setVelocityX(dir * C.arrowSpeed);
    arrow.setData("startX", arrow.x);
    archer.setData("arrow", arrow);
    archer.setData("state", "reload");
    archer.setData("reloadUntil", scene.time.now + C.reloadMs);
    archer.anims.play("archer_release");
    Sfx.play(scene, "bow_release", 0.8);
  },

  update(scene, time) {
    const C = ARCHER_CONFIG;
    scene.arrows.getChildren().slice().forEach((arrow) => {
      if (Math.abs(arrow.x - arrow.getData("startX")) > C.arrowRange) arrow.destroy();
    });
    scene.archers.getChildren().forEach((archer) => {
      if (!archer.active || archer.getData("hp") <= 0) return;
      const state = archer.getData("state");
      const sees = HollowArcher.canSee(scene, archer);
      if (sees) archer.setData("lastSeenAt", time);
      const towardPlayer = scene.player.x < archer.x ? -1 : 1;

      if (archer.getData("stepping")) {
        if (archer.body.blocked.down && time > archer.getData("stepStartedAt") + 100) {
          archer.setVelocityX(0);
          archer.setData("stepping", false);
        }
        return;
      }
      if (archer.body.blocked.down) archer.setVelocityX(0);

      if (state === "idle" || state === "reload") HollowArcher.tryBackstep(scene, archer, time);

      if (state === "idle") {
        if (sees && !archer.getData("stepping")) {
          HollowArcher.face(archer, towardPlayer); // direction is locked for the whole draw
          archer.setData("state", "draw");
          archer.anims.play("archer_draw");
          archer.setData("drawSound", Sfx.play(scene, "bow_draw", 0.7));
        }
      } else if (state === "draw") {
        if (time - archer.getData("lastSeenAt") > C.loseSightMs) {
          archer.setData("state", "idle"); // lowers the bow when the knight hides
          archer.anims.play("archer_idle");
          const creak = archer.getData("drawSound");
          if (creak && creak.isPlaying) creak.stop();
        }
      } else if (state === "reload" && time >= archer.getData("reloadUntil")) {
        archer.setData("state", "idle");
        archer.anims.play("archer_idle");
      }
    });
  },

  // One hop away from a knight who gets too close, only onto solid floor.
  tryBackstep(scene, archer, time) {
    const C = ARCHER_CONFIG;
    const p = scene.player;
    if (time < archer.getData("nextBackstepAt") || !archer.body.blocked.down) return;
    if (Math.abs(p.x - archer.x) > C.backstepRange || Math.abs(p.body.center.y - archer.body.center.y) > 40) return;
    const away = p.x < archer.x ? 1 : -1;
    const targetX = archer.x + away * C.backstepDistance;
    const body = archer.body;
    if (scene.hasWallBetween(body.center.x, body.center.y, targetX, body.center.y)) return;
    const floor = scene.physics
      .overlapRect(targetX - 4, body.bottom + 1, 8, 6, false, true)
      .some((b) => b.gameObject && scene.ground.contains(b.gameObject) && !b.gameObject.isRope);
    if (!floor) return;
    archer.setData("nextBackstepAt", time + C.backstepCooldownMs);
    archer.setData("stepping", true);
    archer.setData("stepStartedAt", time);
    archer.setVelocity(away * 160, -170);
  },
};
