// Parry Death (M1.4A): the once-per-campaign encounter on the first fatal hit.
// The knight is downed, then Death plays (owner's sprites/DEATHS/DEATH.png,
// owner 2026-11-18): 19 full-screen frames of 512x288 centred on the knight.
//   frames 1-13   100 ms   skeletal hands summon the scythe   DEATH_APPROACH
//   frames 14-16   80 ms   the spin, looped a random number of frames,
//                          stopping on any of the three        DEATH_APPROACH
//   frame 17      100 ms   the scythe stands up (warning)      TELEGRAPH
//   frame 18      350 ms   the strike: the only parryable frame SINGLE_STRIKE
//   frame 19              the kill, drawn above the knight     NORMAL_DEATH
// Frames 1-18 are drawn below the knight, frame 19 above him. A parry
// (right click) during frame 18 revives with full HP and stamina in the same
// fight; a click before it, or none, is a normal death.
// Contract: docs/PARRY_DEATH_CONTRACT.md.
const PARRY_DEATH_CONFIG = {
  enabled: true,
  // Parry is the right mouse button (owner 2026-11-14). No on-screen hint.
  downedMs: 900,         // hurt (7 frames) + collapse to the ground before Death appears
  frameMs: 100,          // frames 1-13, 17 and 19
  spinFrames: [14, 15, 16], // 1-based frames of the spin loop
  spinFrameMs: 80,
  // The spin runs this many frames (random, inclusive) before frame 17, so it
  // can stop on any of its three frames. 3-30 frames = 0.24-2.4 s.
  spinMinFrames: 3,
  spinMaxFrames: 30,
  windowMs: 350,         // frame 18, the strike: the only moment a parry counts (owner 2026-11-18: was 100)
  successMs: 1000,       // freeze on the last parry frame (crack screen) before the white flash
  successFlashMs: 300,   // the white flash that clears the crack screen
  // With the flash, right after the freeze, the screen shakes (owner 2026-11-18).
  successShakeMs: 300,
  successShakeIntensity: 0.004, // as calm as the spawn shake (SPAWN_CONFIG.spawnShakeIntensity)
  failMs: 600,           // frame 19 stays this long before the fade to black
  reviveMs: 500,
  reviveInvulnerableMs: 1500,
  earlyPressFails: true, // pressing before frame 18 spends the attempt
  // Where the 512x288 frame's centre sits relative to the knight's sprite
  // centre (world px). 0, 0 = the knight in the middle of the screen.
  offsetX: 0,
  offsetY: 0,
  snapToGroundMaxPx: 300,
  clearRadiusPx: 96,
  pushbackVelocityX: 220,
  calmExtraMs: 1000,     // enemies near the knight stay calm this long after the protection ends
  // After a successful parry: one of the owner's full-screen images
  // (sprites/DEATHS/1.png to 5.png), picked at random.
  victoryImages: [1, 2, 3, 4, 5].map((n) => "death_defied_" + n),
  // It appears with the white flash at the end of the success freeze.
  victoryHoldMs: 1000,   // fully visible
  victoryFadeMs: 500,    // then fades to fully transparent and is removed
  forcedSpinFrames: null, // test seam: fixed spin length
  rng: null,             // test seam: () => number in [0, 1)
};

const ParryDeath = {
  preload(scene) {
    scene.load.spritesheet("death_scythe", "sprites/DEATHS/DEATH.png?v=" + Date.now(), { frameWidth: 512, frameHeight: 288 });
    scene.load.image("death_crack", "sprites/DEATHS/crack.png?v=" + Date.now()); // 80 % black with glass cracks
    PARRY_DEATH_CONFIG.victoryImages.forEach((key) =>
      scene.load.image(key, "sprites/DEATHS/" + key.replace("death_defied_", "") + ".png?v=" + Date.now()));
  },
};

class ParryDeathEncounter {
  constructor(scene) {
    this.scene = scene;
    this.state = "IDLE";
    this.outcome = null;
    this.sounds = [];
    this.onPointer = (pointer) => pointer.rightButtonDown() && this.handleParryPress();
    this.onPause = () => this.sounds.forEach((s) => s.isPlaying && s.pause());
    this.onResume = () => this.sounds.forEach((s) => s.isPaused && s.resume());
    scene.events.on("pause", this.onPause);
    scene.events.on("resume", this.onResume);
    scene.events.once("shutdown", () => this.destroy());
  }

  isActive() {
    return this.state !== "IDLE";
  }

  canTrigger() {
    const campaign = SaveManager.campaign;
    return PARRY_DEATH_CONFIG.enabled && this.state === "IDLE" && !this.scene.isDead &&
      !!campaign && !campaign.parryDeathUsed;
  }

  // How many 80 ms spin frames play before frame 17.
  rollSpinFrames() {
    const C = PARRY_DEATH_CONFIG;
    if (C.forcedSpinFrames !== null && C.forcedSpinFrames !== undefined) return C.forcedSpinFrames;
    const r = (C.rng || Math.random)();
    return C.spinMinFrames + Math.min(Math.floor(r * (C.spinMaxFrames - C.spinMinFrames + 1)), C.spinMaxFrames - C.spinMinFrames);
  }

  // The frame-by-frame plan: { frame (0-based), ms, state }.
  buildTimeline() {
    const C = PARRY_DEATH_CONFIG;
    const t = [];
    const spinStart = C.spinFrames[0] - 1;
    for (let f = 0; f < spinStart; f++) t.push({ frame: f, ms: C.frameMs, state: "DEATH_APPROACH" });
    this.spinCount = this.rollSpinFrames();
    for (let i = 0; i < this.spinCount; i++) {
      t.push({ frame: C.spinFrames[i % C.spinFrames.length] - 1, ms: C.spinFrameMs, state: "DEATH_APPROACH", spin: true });
    }
    t.push({ frame: 16, ms: C.frameMs, state: "TELEGRAPH" });
    t.push({ frame: 17, ms: C.windowMs, state: "SINGLE_STRIKE" });
    t.push({ frame: 18, ms: Infinity, state: "NORMAL_DEATH" });
    return t;
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
    this.timeline = null;
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
    p.clearTint();
    p.setAlpha(1);
    scene.playCollapse(); // ends held on the ground frame until the parry resolves
    this.snapToGround();

    scene.input.on("pointerdown", this.onPointer);
    scene.input.on("pointerdownoutside", this.onPointer); // clicks on the black bars count too
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
    this.elapsedMs += delta;
    const t = this.elapsedMs - this.phaseStart;
    switch (this.state) {
      case "DOWNED":
        if (t >= C.downedMs) this.startDeath();
        break;
      case "DEATH_APPROACH":
      case "TELEGRAPH":
      case "SINGLE_STRIKE":
        this.advanceFrames(delta);
        break;
      case "PARRY_SUCCESS": {
        // The parry animation plays out, then everything holds still on its
        // last frame (successMs), then a white flash clears the screen.
        const parryMs = GUARD_CONFIG.parryFrameMs.reduce((a, b) => a + b, 0);
        if (t >= parryMs + C.successMs) this.endSuccessFreeze();
        break;
      }
      case "REVIVE":
        if (t >= C.reviveMs) this.finishRevive();
        break;
      case "NORMAL_DEATH":
        if (t >= C.failMs) this.finishFail();
        break;
    }
  }

  // Death appears: frame 1, below the knight and above the dim.
  startDeath() {
    const C = PARRY_DEATH_CONFIG;
    const scene = this.scene;
    const p = scene.player;
    this.timeline = this.buildTimeline();
    this.step = 0;
    this.stepMs = 0;
    this.reaper = scene.add.sprite(p.x + C.offsetX, p.y + C.offsetY, "death_scythe", 0)
      .setDepth(DEATH_CONFIG.dimDepth + 0.6);
    this.track(Sfx.play(scene, "reaper_arrive", 0.9));
    this.setPhase("DEATH_APPROACH");
  }

  // Steps through the timeline by game time (frozen while paused).
  advanceFrames(delta) {
    this.stepMs += delta;
    while (this.state !== "NORMAL_DEATH" && this.stepMs >= this.timeline[this.step].ms) {
      this.stepMs -= this.timeline[this.step].ms;
      this.enterStep(this.step + 1);
    }
  }

  enterStep(i) {
    const scene = this.scene;
    const step = this.timeline[i];
    this.step = i;
    this.reaper.setFrame(step.frame);
    if (step.state === this.state) return;
    if (step.state === "TELEGRAPH") {
      this.track(Sfx.play(scene, "reaper_telegraph"));
      this.setPhase("TELEGRAPH");
    } else if (step.state === "SINGLE_STRIKE") {
      this.track(Sfx.play(scene, "scythe_swing"));
      this.windowOpenAt = this.elapsedMs;
      this.setPhase("SINGLE_STRIKE");
    } else if (step.state === "NORMAL_DEATH") {
      this.reaper.setDepth(DEATH_CONFIG.dimDepth + 2); // frame 19: the scythe in front of the knight
      if (this.outcome === null) this.resolve("fail", "late");
      else this.setPhase("NORMAL_DEATH");
    }
  }

  handleParryPress() {
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
    scene.input.off("pointerdown", this.onPointer);
    scene.input.off("pointerdownoutside", this.onPointer);
    if (outcome === "success") {
      // Owner 2026-11-14: the dim becomes the crack screen at once, the parry
      // plays and freezes on its last frame; the flash comes in endSuccessFreeze.
      // Death holds frame 18 (the blocked strike).
      this.track(Sfx.play(scene, "parry_clang"));
      const p = scene.player;
      p.clearTint();
      p.anims.play("parry");
      scene.replaceDimWithCrack();
      this.setPhase("PARRY_SUCCESS");
      return;
    }
    this.track(Sfx.play(scene, "parry_fail"));
    if (this.state === "NORMAL_DEATH" || this.timeline[this.step].state === "NORMAL_DEATH") {
      this.setPhase("NORMAL_DEATH"); // late: frame 19 is already showing
      return;
    }
    // Early: Death goes on to the kill without parryable frames; the spin
    // ends after the frame it is on. Frame 19 then leads to the death (failMs).
    const rest = this.timeline.slice(this.step + 1).filter((s) => !s.spin);
    this.timeline = this.timeline.slice(0, this.step + 1).concat(rest);
  }

  // Full-screen image over the visible area: above the dim, below the knight
  // (and Death). Not tied to the encounter: it outlives the revive.
  showVictoryImage() {
    const C = PARRY_DEATH_CONFIG;
    const scene = this.scene;
    const keys = C.victoryImages;
    const key = keys[Math.floor((C.rng || Math.random)() * keys.length) % keys.length];
    const v = scene.viewport;
    const img = scene.add.image(v.x + v.w / 2, v.y + v.h / 2, key)
      .setScrollFactor(0).setDisplaySize(v.w, v.h).setDepth(DEATH_CONFIG.dimDepth + 0.5);
    this.victoryImage = img;
    const p = scene.player;
    p.setDepth(DEATH_CONFIG.dimDepth + 1); // the knight stays in front of the image
    scene.tweens.add({
      targets: img, alpha: 0, delay: C.victoryHoldMs, duration: C.victoryFadeMs,
      onComplete: () => {
        img.destroy();
        if (this.victoryImage === img) this.victoryImage = null;
        p.setDepth(10);
      },
    });
  }

  // White flash: the crack screen and every dim are gone, the text image shows.
  endSuccessFreeze() {
    const scene = this.scene;
    scene.cameras.main.flash(PARRY_DEATH_CONFIG.successFlashMs, 255, 255, 255);
    scene.cameras.main.shake(PARRY_DEATH_CONFIG.successShakeMs, PARRY_DEATH_CONFIG.successShakeIntensity, true);
    scene.clearDeathDimNow();
    if (this.reaper) this.reaper.destroy(); // gone in the flash
    this.reaper = null;
    this.showVictoryImage();
    this.startRevive();
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
        e.setData("ignorePlayerUntil", now + C.reviveInvulnerableMs + C.calmExtraMs);
        if (e.getData("kind") === "starved") {
          e.setData("nextLungeAt", now + C.reviveInvulnerableMs + C.calmExtraMs);
          if (e.getData("state") === "lunge") {
            e.setData("state", "ground");
            e.anims.play("starved_ground");
          }
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
    const r = this.reaper;
    this.reaper = null;
    if (r) {
      // Death stays on its finished swing and sinks into the black with the world.
      scene.tweens.add({ targets: r, alpha: 0, duration: DEATH_CONFIG.toBlackMs, onComplete: () => r.destroy() });
    }
    this.cleanupVisuals();
    this.state = "IDLE";
    scene.player.setData("hp", 0);
    scene.die({ knightDown: true });
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
  }

  // Scene shutdown (restart, retry, quit) mid-encounter.
  destroy() {
    const scene = this.scene;
    scene.input.off("pointerdown", this.onPointer);
    scene.input.off("pointerdownoutside", this.onPointer);
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
    this.reaper = null;
    this.state = "IDLE";
  }
}
