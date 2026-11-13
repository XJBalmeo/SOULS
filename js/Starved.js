// The Starved (Famine, M1.6): slow ground melee. Shuffles toward the knight,
// winds up with flashing eyes (hits do not interrupt it), throws itself into a
// grabbing lunge, and lies on the ground after it: the punish window.
// Placed in LDtk as the "Starved" entity; reset like rats on restart.
const STARVED_CONFIG = {
  hp: 3,
  walkSpeed: 30,         // px/s (rat: 50)
  visionRange: 260,      // px, needs line of sight
  visionHeight: 48,      // px of vertical difference it still reacts to
  lungeTrigger: 150,     // px: starts the wind-up inside this distance
  windupFrameMs: 150,    // 4 frames = 600 ms warning
  lungeMs: 300,          // the dangerous part
  lungeSpeed: 460,       // px/s during the lunge (about 140 px)
  lungeDamage: 30,
  groundFrameMs: [300, 300, 150, 150], // 900 ms on the ground
  cooldownMs: 2500,      // from one wind-up start to the next
  body: { w: 14, h: 46, x: 42, y: 54 }, // facing right, inside the 100x100 frame
  reach: { w: 26, h: 26, y: 8 },        // lunge grab zone in front of the body
};

const Starved = {
  preload(scene) {
    const frame = { frameWidth: 100, frameHeight: 100 };
    const dir = "sprites/ENEMIES/FAMINE/";
    ["walk", "windup", "lunge", "ground", "death"].forEach((name) => {
      scene.load.spritesheet("starved_" + name, dir + "STARVED_" + name.toUpperCase() + ".png", frame);
    });
  },

  createAnims(scene) {
    const C = STARVED_CONFIG;
    const timed = (key, durations) => durations.map((duration, frame) => ({ key, frame, duration }));
    scene.createAnimOnce({ key: "starved_walk", frames: scene.anims.generateFrameNumbers("starved_walk"), frameRate: 6, repeat: -1 });
    scene.createAnimOnce({ key: "starved_windup", frames: timed("starved_windup", [C.windupFrameMs, C.windupFrameMs, C.windupFrameMs, C.windupFrameMs]), repeat: 0 });
    scene.createAnimOnce({ key: "starved_lunge", frames: timed("starved_lunge", [80, C.lungeMs - 80, 200]), repeat: 0 });
    scene.createAnimOnce({ key: "starved_ground", frames: timed("starved_ground", C.groundFrameMs), repeat: 0 });
    scene.createAnimOnce({ key: "starved_death", frames: timed("starved_death", [120, 160, 160, 400]), repeat: 0 });
  },

  setup(scene) {
    Starved.createAnims(scene);
    scene.starved = scene.add.group();
  },

  spawn(scene, x, y) {
    const C = STARVED_CONFIG;
    const s = scene.physics.add.sprite(x, y, "starved_walk");
    s.setDepth(10);
    s.body.setSize(C.body.w, C.body.h);
    s.setCollideWorldBounds(true);
    scene.physics.add.collider(s, scene.ground);
    s.setData({ kind: "starved", hp: C.hp, state: "idle", nextLungeAt: 0, lungeUntil: 0, lungeHit: false, deathAnim: "starved_death" });
    Starved.face(s, -1);
    s.anims.play("starved_walk");
    s.anims.pause();
    s.on("animationcomplete", (anim) => {
      if (s.getData("hp") <= 0) return;
      if (anim.key === "starved_windup") Starved.startLunge(scene, s);
      else if (anim.key === "starved_ground") {
        s.setData("state", "idle");
        s.anims.play("starved_walk");
      }
    });
    scene.physics.add.overlap(scene.attackHitbox, s, (hitbox, target) => {
      const p = scene.player.body.center;
      if (!scene.hasWallBetween(p.x, p.y, target.body.center.x, target.body.center.y)) {
        scene.damageEnemy(target, scene.SWORD_DAMAGE);
      }
    });
    scene.starved.add(s);
    return s;
  },

  face(s, dir) {
    const b = STARVED_CONFIG.body;
    s.setFlipX(dir < 0);
    s.body.setOffset(dir < 0 ? 100 - b.x - b.w : b.x, b.y);
    s.setData("dir", dir < 0 ? -1 : 1);
  },

  canSee(scene, s) {
    const C = STARVED_CONFIG;
    const p = scene.player.body.center;
    const c = s.body.center;
    if (Math.abs(p.x - c.x) > C.visionRange || Math.abs(p.y - c.y) > C.visionHeight) return false;
    return !scene.hasWallBetween(c.x, c.y - 8, p.x, p.y);
  },

  startLunge(scene, s) {
    const C = STARVED_CONFIG;
    s.setData({ state: "lunge", lungeUntil: scene.time.now + C.lungeMs, lungeHit: false });
    s.setVelocityX(s.getData("dir") * C.lungeSpeed);
    s.anims.play("starved_lunge");
    Sfx.play(scene, "lunge_whoosh", 0.8);
  },

  // World rectangle the lunge can grab: just in front of the body.
  reachRect(s) {
    const r = STARVED_CONFIG.reach;
    const b = s.body;
    const x = s.getData("dir") > 0 ? b.right - 4 : b.left + 4 - r.w;
    return new Phaser.Geom.Rectangle(x, b.top + r.y, r.w, r.h);
  },

  groundAhead(scene, s, dir) {
    const b = s.body;
    return scene.physics
      .overlapRect(b.center.x + dir * (b.halfWidth + 6) - 2, b.bottom + 2, 4, 4, false, true)
      .some((hit) => hit.gameObject && scene.ground.contains(hit.gameObject) && !hit.gameObject.isRope);
  },

  update(scene, time) {
    const C = STARVED_CONFIG;
    const player = scene.player;
    scene.starved.getChildren().forEach((s) => {
      if (!s.active || s.getData("hp") <= 0) return;
      const state = s.getData("state");
      const toward = player.x < s.x ? -1 : 1;
      if (state === "lunge") {
        if (!s.getData("lungeHit") && !scene.isPlayerInvulnerable() &&
            Phaser.Geom.Intersects.RectangleToRectangle(Starved.reachRect(s), player.body)) {
          s.setData("lungeHit", true);
          scene.hurtPlayer(C.lungeDamage, s.getData("dir"), s);
        }
        if (time >= s.getData("lungeUntil") || s.body.blocked.left || s.body.blocked.right) {
          s.setVelocityX(0);
          s.setData("state", "ground");
          s.anims.play("starved_ground");
          Sfx.play(scene, "body_thud", 0.7);
        }
        return;
      }
      if (state === "windup" || state === "ground") {
        if (s.body.blocked.down) s.setVelocityX(0);
        return;
      }
      // idle / approach
      if (!Starved.canSee(scene, s)) {
        s.setVelocityX(0);
        s.anims.pause();
        return;
      }
      Starved.face(s, toward);
      const dist = Math.abs(player.body.center.x - s.body.center.x);
      if (dist <= C.lungeTrigger && time >= s.getData("nextLungeAt") && s.body.blocked.down) {
        s.setVelocityX(0);
        s.setData({ state: "windup", nextLungeAt: time + C.cooldownMs });
        s.anims.play("starved_windup");
        Sfx.play(scene, "starved_rasp", 0.8);
        return;
      }
      if (dist > 20 && Starved.groundAhead(scene, s, toward)) {
        s.setVelocityX(toward * C.walkSpeed);
        if (s.anims.isPaused) s.anims.resume();
        if (!s.anims.isPlaying || s.anims.currentAnim.key !== "starved_walk") s.anims.play("starved_walk");
      } else {
        s.setVelocityX(0);
        s.anims.pause();
      }
    });
  },
};
