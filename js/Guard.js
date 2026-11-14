// Knight guard (owner 2026-11-14): right mouse button.
// - Press: parry (sprites/HERO/NEW_PARRY.png, all frames). During the parry
//   window a melee hit from the front is cancelled and the attacker is
//   stunned; an arrow from the front is deflected back.
// - Hold: block (frame 1 of NEW_PARRY.png held). Hits from the front deal
//   20 % damage. A parry that has ended turns into a block while still held.
// - Parries have a cooldown; a press during the cooldown only blocks.
// The same press parries Death's scythe (see ParryDeath.js).
const GUARD_CONFIG = {
  parryFrameMs: [60, 80, 160], // NEW_PARRY frames 1-3
  parryWindowMs: 200,          // from the press: hits in this time are parried
  parryCooldownMs: 400,        // from one parry to the next
  blockDamageTaken: 0.2,       // 80 % less damage while blocking
  blockInvulnerableMs: 400,    // after a blocked hit, so one attack only counts once
  stunMs: 1500,                // a parried enemy is helpless this long
  stunPushX: 140,              // px/s, the parried enemy is shoved back
  stunPushUp: 120,
  stunTint: 0x8a8aa0,
  deflectSpeedMult: 1.2,       // a deflected arrow flies back a little faster
  deflectDamage: 1,            // against enemies
};

const Guard = {
  createAnims(scene) {
    const C = GUARD_CONFIG;
    scene.createAnimOnce({
      key: "parry",
      frames: C.parryFrameMs.map((duration, frame) => ({ key: "hero_parry", frame, duration })),
      repeat: 0,
    });
    scene.createAnimOnce({ key: "block", frames: [{ key: "hero_parry", frame: 0 }], repeat: 0 });
  },

  // Called once per GameScene.create.
  setup(scene) {
    Guard.createAnims(scene);
    scene.guard = { state: "none", windowUntil: 0, lastParryAt: -Infinity, deflects: 0 };
    const onPointer = (pointer) => {
      if (pointer.rightButtonDown()) Guard.press(scene);
    };
    scene.input.on("pointerdown", onPointer);
    scene.events.once("shutdown", () => scene.input.off("pointerdown", onPointer));
  },

  canGuard(scene) {
    const p = scene.player;
    const hurtPlaying = p.anims.isPlaying && p.anims.currentAnim?.key === "hurt";
    return !scene.isDead && !(scene.parryDeath && scene.parryDeath.isActive()) &&
      !scene.isAttacking && !scene.isRolling && !hurtPlaying &&
      !p.getData("isClimbing") && !p.getData("isVaulting") &&
      scene.time.now >= (p.getData("knockbackUntil") || 0);
  },

  press(scene) {
    const g = scene.guard;
    const now = scene.time.now;
    if (!g || !Guard.canGuard(scene)) return;
    if (now - g.lastParryAt < GUARD_CONFIG.parryCooldownMs) return; // still blocks if held
    g.lastParryAt = now;
    g.windowUntil = now + GUARD_CONFIG.parryWindowMs;
    g.state = "parry";
    scene.player.anims.play("parry");
  },

  // Each frame before movement. Returns the guard state ("none", "block", "parry").
  update(scene) {
    const g = scene.guard;
    const p = scene.player;
    const held = scene.input.activePointer.rightButtonDown();
    const can = Guard.canGuard(scene);
    if (g.state === "parry") {
      const swinging = p.anims.isPlaying && p.anims.currentAnim?.key === "parry";
      if (!can) g.state = "none";
      else if (!swinging) g.state = held ? "block" : "none";
    } else {
      g.state = held && can ? "block" : "none";
    }
    if (g.state === "block" && p.anims.currentAnim?.key !== "block") p.anims.play("block");
    return g.state;
  },

  isGuarding(scene) {
    return !!scene.guard && scene.guard.state !== "none";
  },

  // dir: the direction the hit pushes the knight (-1 left, 1 right), so the
  // attacker is on the -dir side. Guarding only works facing the attacker.
  facesAttacker(scene, dir) {
    const facing = scene.player.flipX ? -1 : 1;
    return facing === -dir;
  },

  inParryWindow(scene) {
    const g = scene.guard;
    return !!g && g.state === "parry" && scene.time.now < g.windowUntil;
  },

  // From hurtPlayer: "parry" (no damage, attacker stunned), "block" (reduced
  // damage) or null (a normal hit).
  intercept(scene, dir, source) {
    if (!Guard.isGuarding(scene) || !Guard.facesAttacker(scene, dir)) return null;
    if (Guard.inParryWindow(scene)) {
      if (source && source.getData && source.body && source.getData("hp") > 0) Guard.stun(scene, source);
      Guard.parryFeedback(scene);
      return "parry";
    }
    return "block";
  },

  parryFeedback(scene) {
    Sfx.play(scene, "parry_clang", 0.9);
    scene.cameras.main.shake(90, 0.003);
    const p = scene.player;
    p.setTintFill(0xffffff);
    scene.time.delayedCall(60, () => p.active && p.clearTint());
  },

  stun(scene, enemy) {
    const C = GUARD_CONFIG;
    const away = enemy.x < scene.player.x ? -1 : 1;
    enemy.setData({ state: "stunned", stunnedUntil: scene.time.now + C.stunMs });
    if (enemy.anims) enemy.anims.stop();
    enemy.setVelocity(away * C.stunPushX, -C.stunPushUp);
    enemy.setTint(C.stunTint);
  },

  isStunned(enemy, time) {
    return enemy.getData("state") === "stunned" && time < enemy.getData("stunnedUntil");
  },

  endStun(enemy) {
    enemy.clearTint();
    enemy.setData("stunnedUntil", 0);
  },

  // From the arrow/knight overlap. True if the arrow was deflected (no hit).
  deflectArrow(scene, arrow, dir) {
    if (!Guard.inParryWindow(scene) || !Guard.facesAttacker(scene, dir)) return false;
    const g = scene.guard;
    arrow.setVelocityX(-arrow.body.velocity.x * GUARD_CONFIG.deflectSpeedMult);
    arrow.setFlipX(!arrow.flipX);
    arrow.setData({ deflected: true, startX: arrow.x, hitKey: "deflect-" + (++g.deflects) });
    Guard.parryFeedback(scene);
    return true;
  },

  // Deflected arrows hurt the first living enemy they touch.
  updateDeflected(scene) {
    if (!scene.arrows) return;
    scene.arrows.getChildren().slice().forEach((arrow) => {
      if (!arrow.active || !arrow.getData("deflected")) return;
      const hit = scene.getEnemySprites().find((e) => e.getData("hp") > 0 && e.body &&
        Phaser.Geom.Intersects.RectangleToRectangle(arrow.body, e.body));
      if (!hit) return;
      scene.damageEnemy(hit, GUARD_CONFIG.deflectDamage, arrow.getData("hitKey"));
      Sfx.play(scene, "arrow_hit", 0.8);
      arrow.destroy();
    });
  },
};
