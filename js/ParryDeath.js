// Parry Death (M1.4A): the once-per-campaign encounter on the first fatal hit.
// The knight is downed; Death's Shadow floats in, waits a random moment, raises
// its scythe (warning) and strikes once. Press the parry key during the strike
// to revive with full HP and stamina in the same fight; otherwise normal death.
// Contract: docs/PARRY_DEATH_CONTRACT.md. All timings are proposals for owner review.
const PARRY_DEATH_CONFIG = {
  enabled: true,
  parryKeyCodes: ["KeyC"],
  parryKeyLabel: "C",
  downedMs: 600,
  approachMs: 1200,
  delayMinMs: 600,       // random hover before the warning
  delayMaxMs: 2000,
  telegraphMs: 500,      // scythe raised, glint and sound
  windowMs: 300,         // the strike: the only moment a parry counts
  successMs: 700,
  failMs: 600,
  reviveMs: 500,
  reviveInvulnerableMs: 1500,
  earlyPressFails: true, // pressing before the strike spends the attempt
  approachOffsetPx: 46,
  approachStartPx: 150,
  snapToGroundMaxPx: 300,
  clearRadiusPx: 96,
  pushbackVelocityX: 220,
  forcedDelayMs: null,   // test seam: fixed hover delay
  rng: null,             // test seam: () => number in [0, 1)
};

const ParryDeath = {
  preload(scene) {
    const frame = { frameWidth: 128, frameHeight: 128 };
    const dir = "sprites/ENEMIES/DEATHS_SHADOW/";
    ["FLOAT", "RAISE", "STRIKE", "PARRIED", "FADE"].forEach((name) => {
      scene.load.spritesheet("reaper_" + name.toLowerCase(), dir + "REAPER_" + name + ".png", frame);
    });
  },
};

class ParryDeathEncounter {
  constructor(scene) {
    this.scene = scene;
    this.state = "IDLE";
    this.outcome = null;
    this.sounds = [];
    this.onKey = (event) => this.handleKey(event);
    this.onPause = () => this.sounds.forEach((s) => s.isPlaying && s.pause());
    this.onResume = () => this.sounds.forEach((s) => s.isPaused && s.resume());
    scene.events.on("pause", this.onPause);
    scene.events.on("resume", this.onResume);
    scene.events.once("shutdown", () => this.destroy());
    this.createAnims();
  }

  createAnims() {
    const s = this.scene;
    const C = PARRY_DEATH_CONFIG;
    const timed = (key, durations) => durations.map((duration, frame) => ({ key, frame, duration }));
    s.createAnimOnce({ key: "reaper_float", frames: s.anims.generateFrameNumbers("reaper_float"), frameRate: 5, repeat: -1 });
    s.createAnimOnce({ key: "reaper_raise", frames: timed("reaper_raise", [140, 140, 4000]), repeat: 0 });
    s.createAnimOnce({ key: "reaper_strike", frames: timed("reaper_strike", [C.windowMs, 160, 400]), repeat: 0 });
    s.createAnimOnce({ key: "reaper_parried", frames: timed("reaper_parried", [220, 140, 140, 140]), repeat: 0 });
    s.createAnimOnce({ key: "reaper_fade", frames: timed("reaper_fade", [100, 100, 100, 100]), repeat: 0 });
  }

  isActive() {
    return this.state !== "IDLE";
  }

  canTrigger() {
    const campaign = SaveManager.campaign;
    return PARRY_DEATH_CONFIG.enabled && this.state === "IDLE" && !this.scene.isDead &&
      !!campaign && !campaign.parryDeathUsed;
  }

  rollDelay() {
    const C = PARRY_DEATH_CONFIG;
    if (C.forcedDelayMs !== null && C.forcedDelayMs !== undefined) return C.forcedDelayMs;
    const r = (C.rng || Math.random)();
    return C.delayMinMs + r * (C.delayMaxMs - C.delayMinMs);
  }

  // The fatal hit: freeze the world, spend the opportunity, down the knight.
  trigger(source) {
    const scene = this.scene;
    const C = PARRY_DEATH_CONFIG;
    this.state = "DOWNED";
    this.outcome = null;
    this.source = source || null;
    this.elapsedMs = 0;
    this.phaseStart = 0;
    this.delayMs = this.rollDelay();
    this.windowOpenAt = null;
    // Spend it before any input is possible, and save that now.
    SaveManager.campaign.parryDeathUsed = true;
    this.persisted = SaveManager.write();
    if (!this.persisted) console.warn("Parry Death used; could not be saved (storage unavailable).");

    // Freeze the fight.
    scene.physics.pause();
    scene.attackHitbox.body.enable = false;
    scene.isAttacking = false;
    scene.isRolling = false;
    scene.getEnemySprites().forEach((e) => e.anims && e.anims.pause());
    if (scene.vaultTween) {
      scene.vaultTween.stop();
      scene.vaultTween = null;
    }
    const p = scene.player;
    ["isRollInvulnerable", "isClimbing", "isVaulting", "isDroppingDown"].forEach((k) => p.setData(k, false));
    p.body.allowGravity = true;
    p.setVelocity(0, 0);
    p.setAngle(0);
    p.anims.stop();
    const crouch = scene.textures.get("hero_crouch");
    p.setTexture("hero_crouch", Math.max(0, crouch.frameTotal - 2));
    p.setTint(0x55556a);
    this.snapToGround();

    scene.input.keyboard.on("keydown", this.onKey);
    this.prompt = UI.text(scene, scene.viewport.x + scene.viewport.w / 2, scene.viewport.y + scene.viewport.h - 30,
      "", 11, UI.COLORS.dim).setScrollFactor(0).setDepth(1001);
    scene.cameras.main.shake(180, 0.004);
    Sfx.play(scene, "player_hurt");
  }

  snapToGround() {
    const scene = this.scene;
    const p = scene.player;
    const b = p.body;
    for (let dy = 0; dy <= PARRY_DEATH_CONFIG.snapToGroundMaxPx; dy += 2) {
      const hit = scene.physics.overlapRect(b.center.x - 3, b.bottom + dy, 6, 2, false, true)
        .some((h) => h.gameObject && scene.ground.contains(h.gameObject) && !h.gameObject.isRope);
      if (hit) {
        if (dy > 0) scene.tweens.add({ targets: p, y: p.y + dy, duration: Math.min(300, 60 + dy * 2), ease: "Quad.easeIn" });
        this.floorY = b.bottom + dy;
        return;
      }
    }
    this.floorY = b.bottom;
  }

  setPhase(state) {
    this.state = state;
    this.phaseStart = this.elapsedMs;
  }

  // Driven by GameScene.update, so the normal pause menu freezes it.
  update(delta) {
    const C = PARRY_DEATH_CONFIG;
    const scene = this.scene;
    this.elapsedMs += delta;
    const t = this.elapsedMs - this.phaseStart;
    if (this.state === "DOWNED" || this.state === "DEATH_APPROACH" || this.state === "TELEGRAPH" || this.state === "SINGLE_STRIKE") {
      scene.player.setTint(0x55556a); // an earlier hit's clearTint timer must not undo the downed look
    }
    switch (this.state) {
      case "DOWNED":
        if (t >= C.downedMs) this.startApproach();
        break;
      case "DEATH_APPROACH":
        if (t >= C.approachMs + this.delayMs) this.startTelegraph();
        break;
      case "TELEGRAPH":
        if (t >= C.telegraphMs) this.startStrike();
        break;
      case "SINGLE_STRIKE":
        if (t >= C.windowMs) this.resolve("fail", "late");
        break;
      case "PARRY_SUCCESS":
        if (t >= C.successMs) this.startRevive();
        break;
      case "REVIVE":
        if (t >= C.reviveMs) this.finishRevive();
        break;
      case "NORMAL_DEATH":
        if (t >= C.failMs) this.finishFail();
        break;
    }
  }

  startApproach() {
    const C = PARRY_DEATH_CONFIG;
    const scene = this.scene;
    const p = scene.player;
    let side = p.flipX ? -1 : 1;
    const cy = p.body.center.y;
    if (scene.hasWallBetween(p.body.center.x, cy, p.x + side * (C.approachOffsetPx + 20), cy)) side = -side;
    this.side = side;
    const y = this.floorY - 57; // the robe's hem floats just above the floor
    this.reaper = scene.add.sprite(p.x + side * C.approachStartPx, y, "reaper_float").setDepth(15).setAlpha(0);
    this.reaper.setFlipX(side > 0); // drawn facing right; face the knight
    this.reaper.anims.play("reaper_float");
    scene.tweens.add({ targets: this.reaper, x: p.x + side * C.approachOffsetPx, alpha: 1, duration: C.approachMs, ease: "Sine.easeOut" });
    this.track(Sfx.play(scene, "reaper_arrive", 0.9));
    this.prompt.setText("Death comes for you.  Press " + C.parryKeyLabel + " as the scythe falls.");
    this.setPhase("DEATH_APPROACH");
  }

  startTelegraph() {
    this.reaper.anims.play("reaper_raise");
    this.track(Sfx.play(this.scene, "reaper_telegraph"));
    this.setPhase("TELEGRAPH");
  }

  startStrike() {
    this.reaper.anims.play("reaper_strike");
    this.reaper.anims.pause(); // hold the mid-swing frame for the whole window
    this.track(Sfx.play(this.scene, "scythe_swing"));
    this.prompt.setText(PARRY_DEATH_CONFIG.parryKeyLabel).setFontSize(26).setColor(UI.COLORS.accent);
    this.windowOpenAt = this.elapsedMs;
    this.setPhase("SINGLE_STRIKE");
  }

  handleKey(event) {
    if (!PARRY_DEATH_CONFIG.parryKeyCodes.includes(event.code) || event.repeat) return;
    if (!this.scene.sys.isActive() || this.outcome !== null) return; // paused, or already decided
    if (this.state === "SINGLE_STRIKE") this.resolve("success");
    else if (PARRY_DEATH_CONFIG.earlyPressFails && (this.state === "DEATH_APPROACH" || this.state === "TELEGRAPH")) {
      this.resolve("fail", "early");
    }
  }

  // Exactly one outcome per encounter.
  resolve(outcome, reason) {
    if (this.outcome !== null) return;
    this.outcome = outcome;
    this.failReason = reason || null;
    const scene = this.scene;
    scene.input.keyboard.off("keydown", this.onKey);
    if (!this.reaper) this.startApproach(); // early press before Death arrived
    this.reaper.anims.resume();
    if (outcome === "success") {
      this.reaper.anims.play("reaper_parried");
      this.track(Sfx.play(scene, "parry_clang"));
      scene.cameras.main.flash(120, 255, 255, 255);
      scene.cameras.main.shake(120, 0.003);
      const p = scene.player;
      p.clearTint();
      p.setTintFill(0xffffff);
      p.anims.play("attack");
      p.setFlipX(this.side < 0);
      this.prompt.setText("DEATH IS DENIED").setFontSize(18).setColor(UI.COLORS.bone);
      this.setPhase("PARRY_SUCCESS");
    } else {
      this.reaper.anims.play({ key: "reaper_strike", startFrame: 1 });
      this.track(Sfx.play(scene, "parry_fail"));
      scene.player.setTint(0xff0000);
      scene.cameras.main.shake(200, 0.006);
      this.prompt.setText(reason === "early" ? "Too soon." : "Too late.").setFontSize(18).setColor("#b3261e");
      this.setPhase("NORMAL_DEATH");
    }
  }

  startRevive() {
    const scene = this.scene;
    const p = scene.player;
    p.clearTint();
    p.anims.play("idle", true);
    this.track(Sfx.play(scene, "revive", 0.9));
    this.restoreResources();
    this.setPhase("REVIVE");
  }

  restoreResources() {
    const scene = this.scene;
    const p = scene.player;
    p.setData("hp", p.getData("maxHp"));
    p.setData("stamina", p.getData("maxStamina"));
    p.setData("staminaRegenDelayUntil", 0);
    if (scene.hpDelayTween) scene.hpDelayTween.stop();
    if (scene.stamDelayTween) scene.stamDelayTween.stop();
    scene.hudDelay.displayWidth = scene.HUD_MAX_WIDTH;
    scene.hudStamDelay.displayWidth = scene.HUD_MAX_WIDTH;
  }

  // Back to the same fight: enemies keep their HP and places; nothing reloads.
  finishRevive() {
    const C = PARRY_DEATH_CONFIG;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.time.now;
    p.setData("hitInvulnerableUntil", now + C.reviveInvulnerableMs);
    p.setData("knockbackUntil", 0);
    if (scene.arrows) scene.arrows.clear(true, true);
    if (scene.archers) scene.archers.getChildren().forEach((a) => {
      a.setData("arrow", null);
      if (a.getData("state") === "draw") {
        a.setData("state", "idle");
        a.anims.play("archer_idle");
      }
    });
    scene.getEnemySprites().forEach((e) => {
      if (!e.active || e.getData("hp") <= 0) return;
      const near = Math.abs(e.x - p.x) <= C.clearRadiusPx;
      if (e === this.source || near) {
        e.setData("ignorePlayerUntil", now + C.reviveInvulnerableMs);
        if (e.getData("kind") === "starved" && e.getData("state") === "lunge") {
          e.setData("state", "ground");
          e.anims.play("starved_ground");
        } else if (!e.getData("kind")) {
          e.setData("state", "recover");
          e.setData("recoverUntil", now + C.reviveInvulnerableMs);
        }
        const away = e.x < p.x ? -1 : 1;
        const b = e.body;
        if (!scene.hasWallBetween(b.center.x, b.center.y, b.center.x + away * 40, b.center.y)) {
          e.setVelocity(away * C.pushbackVelocityX, -120);
        }
      }
      if (e.anims) e.anims.resume();
    });
    p.setVelocity(0, 0);
    p.setAlpha(1);
    p.setAngle(0);
    scene.input.keyboard.resetKeys();
    scene.ignorePointerUntilUp = true;
    scene.physics.resume();
    this.cleanupVisuals();
    this.state = "IDLE";
  }

  finishFail() {
    const scene = this.scene;
    if (this.reaper) {
      this.reaper.anims.play("reaper_fade");
      const r = this.reaper;
      this.reaper = null;
      r.once("animationcomplete", () => r.destroy());
    }
    this.cleanupVisuals();
    this.state = "IDLE";
    scene.player.setData("hp", 0);
    scene.die();
  }

  track(sound) {
    if (sound) this.sounds.push(sound);
  }

  cleanupVisuals() {
    if (this.reaper) {
      const r = this.reaper;
      this.reaper = null;
      this.scene.tweens.add({ targets: r, alpha: 0, duration: 300, onComplete: () => r.destroy() });
    }
    if (this.prompt) {
      const t = this.prompt;
      this.prompt = null;
      this.scene.tweens.add({ targets: t, alpha: 0, duration: 600, delay: 400, onComplete: () => t.destroy() });
    }
  }

  // Scene shutdown (restart, retry, quit) mid-encounter.
  destroy() {
    const scene = this.scene;
    scene.input.keyboard.off("keydown", this.onKey);
    scene.events.off("pause", this.onPause);
    scene.events.off("resume", this.onResume);
    this.sounds.forEach((s) => {
      if (!s.pendingRemove) {
        s.stop();
        s.destroy();
      }
    });
    this.sounds = [];
    if (this.reaper && this.reaper.active) this.reaper.destroy();
    if (this.prompt && this.prompt.active) this.prompt.destroy();
    this.reaper = null;
    this.prompt = null;
    this.state = "IDLE";
  }
}
