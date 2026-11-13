class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }
  preload() {
    this.load.spritesheet("hero_idle", "sprites/HERO/NEW_IDLE.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_run", "sprites/HERO/NEW_RUN.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_jump", "sprites/HERO/NEW_JUMP.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_roll", "sprites/HERO/NEW_ROLL.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_attack", "sprites/HERO/NEW_ATTACK.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_climb", "sprites/HERO/NEW_CLIMB.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_crouch", "sprites/HERO/NEW_CROUCH.png?v=" + Date.now(), {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("rat_walk", "sprites/ENEMIES/FAMINE/RAT_WALK.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("rat_run", "sprites/ENEMIES/FAMINE/RAT_RUN.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet(
      "rat_attack",
      "sprites/ENEMIES/FAMINE/RAT_ATTACK.png",
      { frameWidth: 100, frameHeight: 100 },
    );
    this.load.json("famine_ldtk", "levels/famine/FAMINE.ldtk?v=" + Date.now());
    this.load.spritesheet(
      "famine_tiles",
      "levels/famine/TILES_LEVEL1.png?v=" + Date.now(),
      { frameWidth: 16, frameHeight: 16, spacing: 1 },
    );
    this.load.spritesheet(
      "famine_ledges",
      "levels/famine/LEDGES_LEVEL1.png?v=" + Date.now(),
      { frameWidth: 16, frameHeight: 16, spacing: 1 }
    );
    this.load.spritesheet(
      "famine_ropes",
      "levels/famine/ROPES_LEVEL1.png?v=" + Date.now(),
      { frameWidth: 16, frameHeight: 16, spacing: 1 }
    );
    this.load.image(
      "famine_far_bg",
      "levels/famine/FARBACKGROUND_LEVEL1.png?v=" + Date.now(),
    );
    this.load.image("hud_bar", "sprites/HERO/HEALTH_BAR.png?v=" + Date.now());
    this.load.image("hud_hp", "sprites/HERO/HEALTH.png?v=" + Date.now());
    this.load.image("hud_delay", "sprites/HERO/DELAY.png?v=" + Date.now());
    this.load.image("hud_stamina", "sprites/HERO/STAMINA.png?v=" + Date.now());
  }
  create() {
    window.gameScene = this;
    // The scene instance is reused when a new game starts from the menu, so
    // clear per-run objects that are created lazily or read before assignment.
    this.rats = null;
    this.vaultTween = null;
    this.isDead = false;
    this.strikeId = 0; // increments per sword swing; enemies take one hit per strike
    // Normally created by the menu; covers starting GameScene directly (tests).
    if (!SaveManager.campaign) SaveManager.startNewCampaign();
    this.hpDelayTween = null;
    this.stamDelayTween = null;
    // =========================================================================
    // HERO CONFIGURATION: HITBOXES, SPRITE PLACEMENTS & TUNING
    // Grouped for easy adjustment if any sprite alignment or hitbox feels off.
    // =========================================================================
    this.heroConfig = {
      // Body collision hitboxes per animation/state (inside 100x100 frame)
      // w = width, h = height, x = offset X, y = offset Y
      // Note: y + h = 100 ensures the hero's feet stay flush with the floor.
      hitboxes: {
        idle:   { w: 10, h: 50, x: 50, y: 50 },
        run:    { w: 30, h: 40, x: 30, y: 60 },
        jump:   { w: 10, h: 50, x: 50, y: 50 },
        roll:   { w: 30, h: 40, x: 30, y: 60 },
        attack: { w: 30, h: 40, x: 35, y: 60 },
        climb:  { w: 10, h: 50, x: 50, y: 50 },
        crouch: { w: 10, h: 30, x: 50, y: 70 },
      },

      // Visual Sprite Origin / Placement shifts per animation
      // (0.1 = 10px shift forward. Positive moves visual sprite forward)
      spriteOffsets: {
        idle:   0,
        run:    0,
        jump:   0,
        roll:   0,
        attack: 0.19,
        climb:  0,
        crouch: 0,
      },

      // Weapon / Damage Hitbox (the red attack rectangle)
      attackHitbox: {
        width: 70,
        height: 50,
        offsetX: 30, // Distance in front of player (auto-flipped when facing left)
        offsetY: 25, // Height offset from player center
      },

      // Roll Animation & Frame Skip Settings (Adjustable!)
      // Note: Sprite sheet frames are 0-indexed (0 to 7):
      // - Frame 0: duck startup
      // - Frames 1-3: rolling tuck
      // - Frame 4: crouch landing touchdown
      // - Frames 5-6: sprint push / stride (only played when holding horizontal keys: A / D / Left / Right)
      // - Frame 7: standing recovery posture
      roll: {
        frameRate: 15,            // Animation playback speed for roll
        skipFrames: [5, 6],       // Frames to skip when NOT holding horizontal keys (A / D / Left / Right)
        skipToFrame: 7,           // Frame of 'roll' to jump directly to (0-indexed: 7 is standing recovery)
        stopVelocityOnSkip: true, // Stop horizontal slide when skipping to recovery frame
      },

      // Rope Alignment, Vaulting & Climbing Animation
      rope: {
        attachRangeX: 8,          // Horizontal distance to attach to rope
        visualOffsetRight: 0,     // Visual sprite shift when facing right on rope (User tuned)
        visualOffsetLeft: 0,      // Visual sprite shift when facing left on rope (User tuned)
        vaultThreshold: 45,       // Pixels from rope top to trigger automatic ledge swoosh up (User tuned)
        vaultHeight: 20,          // Height of vault onto the platform (vault up) (User tuned)
        vaultDownHeight: 64,      // Height of vault down from platform onto rope (User tuned)
        climbDownThreshold: 20,   // Max distance between player feet and rope top to trigger vault down
        climbFrameRate: 10,       // Base climbing animation speed (frames per sec)
        evenFrameMultiplier: 1.5, // 2nd & 4th frames are 1.5x longer than 1st & 3rd (Adjustable!)
        detachBottomOffset: 4,    // Pixels before/at rope bottom to detach when climbing down (Adjustable!)
      },
    };

    this.createAnimOnce({
      key: "idle",
      frames: this.anims.generateFrameNumbers("hero_idle"),
      frameRate: 1000 / 500,
      repeat: -1,
    });
    this.createAnimOnce({
      key: "run",
      frames: this.anims.generateFrameNumbers("hero_run"),
      frameRate: 12,
      repeat: -1,
    });
    this.createAnimOnce({
      key: "jump",
      frames: this.anims.generateFrameNumbers("hero_jump"),
      frameRate: 10,
      repeat: 0,
    });
    this.createAnimOnce({
      key: "roll",
      frames: this.anims.generateFrameNumbers("hero_roll"),
      frameRate: (this.heroConfig.roll && this.heroConfig.roll.frameRate) || 15,
      repeat: 0,
    });
    this.createAnimOnce({
      key: "attack",
      frames: this.anims.generateFrameNumbers("hero_attack"),
      frameRate: 15,
      repeat: 0,
    });

    const climbFps = this.heroConfig.rope.climbFrameRate || 10;
    const baseClimbMs = Math.round(1000 / climbFps);
    const evenClimbMult = this.heroConfig.rope.evenFrameMultiplier || 1.5;
    this.createAnimOnce({
      key: "climb",
      frames: [
        { key: "hero_climb", frame: 0, duration: baseClimbMs },
        { key: "hero_climb", frame: 1, duration: Math.round(baseClimbMs * evenClimbMult) },
        { key: "hero_climb", frame: 2, duration: baseClimbMs },
        { key: "hero_climb", frame: 3, duration: Math.round(baseClimbMs * evenClimbMult) },
      ],
      repeat: -1,
    });

    this.createAnimOnce({
      key: "crouch",
      frames: this.anims.generateFrameNumbers("hero_crouch"),
      frameRate: 10,
      repeat: 0,
    });
    const ldtkData = this.cache.json.get("famine_ldtk");
    const zoom = 2.5;
    const screenW = this.sys.game.config.width;
    const screenH = this.sys.game.config.height;
    const viewportX = (screenW - screenW / zoom) / 2;
    const viewportY = (screenH - screenH / zoom) / 2;
    const viewW = screenW / zoom;
    const viewH = screenH / zoom;
    this.cameras.main.setBackgroundColor("#324031");
    const bgImageHeight = 720 * 0.4;
    const verticalShift = 30;
    const imageBottomY = viewportY + verticalShift + bgImageHeight;
    this.add
      .rectangle(viewportX, imageBottomY, viewW, viewH, 0x0a100c)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-12);
    this.farBg = this.add.tileSprite(
      viewportX,
      viewportY,
      8000,
      288,
      "famine_far_bg",
    );
    this.farBg.setOrigin(0, 0);
    this.farBg.setScrollFactor(0);
    this.farBg.setDepth(-10);
    this.farBg.tileScaleX = 0.4;
    this.farBg.tileScaleY = 0.4;
    this.farBg.y = viewportY + verticalShift;
    this.ground = this.physics.add.staticGroup();
    this.ratSpawns = [];
    const playerSpawn = this.generateWorld(ldtkData);
    this.player = this.physics.add.sprite(
      playerSpawn.x,
      playerSpawn.y,
      "hero_idle",
    );
    this.player.setDepth(10);
    this.player.setData("hitboxes", this.heroConfig.hitboxes);
    this.player.body.setSize(
      this.heroConfig.hitboxes.idle.w,
      this.heroConfig.hitboxes.idle.h,
    );
    this.player.body.setOffset(
      this.heroConfig.hitboxes.idle.x,
      this.heroConfig.hitboxes.idle.y,
    );
    this.physics.add.collider(
      this.player,
      this.ground,
      null,
      (player, block) => {
        if (
          block.isPlatform &&
          (player.getData("isDroppingDown") ||
            player.getData("isVaulting") ||
            player.getData("isClimbing"))
        ) {
          return false;
        }
        return true;
      },
      this,
    );
    this.attackHitbox = this.add.rectangle(
      0,
      0,
      this.heroConfig.attackHitbox.width,
      this.heroConfig.attackHitbox.height,
      0xff0000,
      0.5,
    );
    this.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.allowGravity = false;
    this.attackHitbox.body.enable = false;
    this.createAnimOnce({
      key: "rat_walk",
      frames: this.anims.generateFrameNumbers("rat_walk"),
      frameRate: 10,
      repeat: -1,
    });
    this.createAnimOnce({
      key: "rat_run",
      frames: this.anims.generateFrameNumbers("rat_run"),
      frameRate: 15,
      repeat: -1,
    });
    this.createAnimOnce({
      key: "rat_attack",
      frames: this.anims.generateFrameNumbers("rat_attack"),
      frameRate: 12,
      repeat: 0,
    });
    if (this.ratSpawns.length > 0) {
      this.ratSpawns.forEach((spawn) => {
        this.spawnRat(spawn.x, spawn.y, true);
      });
    } else {
      this.spawnRat(600, 300, true);
    }
    this.setHitboxDebug(SoulsSettings.load().showHitboxes);
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      this.setHitboxDebug(!this.physics.world.drawDebug);
    });
    const openPause = (event) => {
      if (!event.repeat) this.requestPause();
    };
    this.input.keyboard.on("keydown-ESC", openPause);
    this.input.keyboard.on("keydown-P", openPause);
    // Keys held when the game was paused never see their keyup; clear them.
    // A mouse button held while clicking a menu must not swing the sword.
    this.ignorePointerUntilUp = true;
    this.pauseRequested = false;
    const onResume = () => {
      this.pauseRequested = false;
      this.input.keyboard.resetKeys();
      this.ignorePointerUntilUp = true;
    };
    this.events.on("resume", onResume);
    this.events.once("shutdown", () => this.events.off("resume", onResume));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.Z,
      roll: Phaser.Input.Keyboard.KeyCodes.X,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });
    this.isAttacking = false;
    this.isRolling = false;
    this.player.on("animationcomplete", (anim) => {
      if (anim.key === "attack") {
        this.time.delayedCall(150, () => {
          this.isAttacking = false;
        });
      }
      if (anim.key === "roll") {
        this.isRolling = false;
        this.player.setData("isRollInvulnerable", false);
      }
    });
    const HUD_X = viewportX + 10;
    const HUD_Y = viewportY + 10;
    const HP_OFFSET_X = 30;
    const HP_OFFSET_Y = 9;
    const STAM_OFFSET_X = 30;
    const STAM_OFFSET_Y = 17;
    this.hudBar = this.add
      .image(HUD_X, HUD_Y, "hud_bar")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000);
    this.hudDelay = this.add
      .image(HUD_X + HP_OFFSET_X, HUD_Y + HP_OFFSET_Y, "hud_delay")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001);
    this.hudStamDelay = this.add
      .image(HUD_X + STAM_OFFSET_X, HUD_Y + STAM_OFFSET_Y, "hud_delay")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001);
    this.hudHp = this.add
      .image(HUD_X + HP_OFFSET_X, HUD_Y + HP_OFFSET_Y, "hud_hp")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002);
    this.hudStamina = this.add
      .image(HUD_X + STAM_OFFSET_X, HUD_Y + STAM_OFFSET_Y, "hud_stamina")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002);
    this.player.setData("maxHp", 100);
    this.player.setData("hp", 100);
    this.player.setData("maxStamina", 100);
    this.player.setData("stamina", 100);
    this.STAMINA_COST_ATTACK = 15;
    this.STAMINA_COST_ROLL = 25;
    this.SWORD_DAMAGE = 1;
    this.STAMINA_REGEN = 20;
    this.HUD_MAX_WIDTH = 124;
    this.JUMP_VELOCITY_SINGLE = -253;
    this.JUMP_VELOCITY_DOUBLE = -339;
    this.player.setData("canDoubleJump", false);
    this.hudDelay.displayWidth = this.HUD_MAX_WIDTH;
    this.hudStamDelay.displayWidth = this.HUD_MAX_WIDTH;
    this.cameras.main.setZoom(2.5);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.player.setCollideWorldBounds(true);
    if (UI.overlayVisible()) this.scene.pause();
  }
  generateWorld(ldtkData) {
    let playerSpawn = { x: 400, y: 300 };
    this.lastPlayerSpawn = null;
    let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const level0 = ldtkData.levels.find((l) => l.identifier === "Level_0");
    if (!level0) {
      console.error("Could not find Level_0");
      return playerSpawn;
    }
    const room0Doors = this.buildRoom(level0, 0, 0);
    if (this.lastPlayerSpawn) playerSpawn = this.lastPlayerSpawn;
    bounds.maxX = level0.pxWid;
    bounds.maxY = level0.pxHei;
    let currentRightDoor = room0Doors.find(
      (d) => d.dir.toLowerCase() === "right",
    );
    if (!currentRightDoor) {
      console.warn("No 'right' door found in Level_0!");
    } else {
      this.roomPlan = this.planRooms(ldtkData, SaveManager.chapterState());
      for (let i = 1; i < this.roomPlan.length; i++) {
        if (!currentRightDoor) break;
        const selectedLevel = ldtkData.levels.find((l) => l.identifier === this.roomPlan[i]);
        if (!selectedLevel) {
          console.warn("Could not find a valid level to attach");
          break;
        }
        const spawns = selectedLevel.layerInstances.find(
          (ly) => ly.__identifier === "Spawns",
        );
        const leftDoorEntity = spawns.entityInstances.find((e) => {
          if (e.__identifier === "Door") {
            const dirField = e.fieldInstances.find(
              (f) => f.__identifier === "direction",
            );
            return (
              dirField &&
              dirField.__value &&
              dirField.__value.toLowerCase() === "left"
            );
          }
          return false;
        });
        if (!leftDoorEntity) {
          console.warn(
            `Selected level ${selectedLevel.identifier} missing left door!`,
          );
          break;
        }
        const leftDoorLocalX = leftDoorEntity.px[0];
        const leftDoorLocalY = leftDoorEntity.px[1];
        const offsetX =
          currentRightDoor.absoluteX + currentRightDoor.width - leftDoorLocalX;
        const offsetY = currentRightDoor.absoluteY - leftDoorLocalY;
        const newRoomDoors = this.buildRoom(selectedLevel, offsetX, offsetY);
        bounds.minX = Math.min(bounds.minX, offsetX);
        bounds.minY = Math.min(bounds.minY, offsetY);
        bounds.maxX = Math.max(bounds.maxX, offsetX + selectedLevel.pxWid);
        bounds.maxY = Math.max(bounds.maxY, offsetY + selectedLevel.pxHei);
        currentRightDoor = newRoomDoors.find(
          (d) => d.dir.toLowerCase() === "right",
        );
      }
    }
    this.cameras.main.setBounds(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    this.physics.world.setBounds(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    return playerSpawn;
  }
  // Room templates for this chapter, in order. Uses the saved list so death,
  // retry and Continue rebuild the same map; on first build picks from the
  // campaign seed and saves the result (docs/SAVE_CONTRACT.md).
  planRooms(ldtkData, state) {
    const exists = (template) => ldtkData.levels.some((l) => l.identifier === template);
    if (state.rooms && state.rooms.every((room) => exists(room.template))) {
      return state.rooms.map((room) => room.template);
    }
    if (state.rooms) {
      console.warn("Saved rooms are missing from FAMINE.ldtk; regenerating the layout from the seed.");
      state.checkpointId = "famine-start"; // the old checkpoint may name a room that no longer exists
    }
    const rng = new Phaser.Math.RandomDataGenerator([String(state.seed)]);
    const templates = ["Level_0"];
    for (let i = 0; i < 3; i++) templates.push(rng.pick(["Level_1", "Level_2", "Level_3"]));
    templates.push("Level_4");
    state.rooms = templates.map((template, i) => ({ id: "famine-room-" + i, template }));
    SaveManager.write();
    return templates;
  }
  buildRoom(level, offsetX, offsetY) {
    const collisionLayer = level.layerInstances.find(
      (l) => l.__identifier === "Collision",
    );
    const spawnsLayer = level.layerInstances.find(
      (l) => l.__identifier === "Spawns",
    );
    const gridSize = 16;
    const doors = [];
    if (collisionLayer) {
      const cWidth = collisionLayer.__cWid;
      const gridData = collisionLayer.intGridCsv;
      for (let i = 0; i < gridData.length; i++) {
        const val = gridData[i];
        if (val === 1 || val === 2 || val === 3) {
          const isPlatform = val === 2;
          const isRope = val === 3;
          let w = gridSize;
          let h = gridSize;
          let bx = (i % cWidth) * gridSize;
          let by = Math.floor(i / cWidth) * gridSize;
          const cx = offsetX + bx + w / 2;
          const cy = offsetY + by + h / 2;
          const block = this.add.rectangle(cx, cy, w, h, 0x000000, 0);
          this.physics.add.existing(block, true);
          if (isRope) {
            block.body.checkCollision.none = true;
            block.isRope = true;
          } else if (isPlatform) {
            block.body.checkCollision.up = true;
            block.body.checkCollision.down = false;
            block.body.checkCollision.left = false;
            block.body.checkCollision.right = false;
            block.isPlatform = true;
          } else {
            const hasTop = i - cWidth >= 0 && gridData[i - cWidth] === 1;
            const hasBottom =
              i + cWidth < gridData.length && gridData[i + cWidth] === 1;
            const hasLeft = i % cWidth > 0 && gridData[i - 1] === 1;
            const hasRight = i % cWidth < cWidth - 1 && gridData[i + 1] === 1;
            block.body.checkCollision.up = !hasTop;
            block.body.checkCollision.down = !hasBottom;
            block.body.checkCollision.left = !hasLeft;
            block.body.checkCollision.right = !hasRight;
            block.isPlatform = false;
          }
          this.ground.add(block);
        }
      }
    }
    level.layerInstances.forEach((layer) => {
      if (layer.gridTiles && layer.gridTiles.length > 0) {
        let textureKey = "famine_tiles";
        if (layer.__identifier === "Ledges") textureKey = "famine_ledges";
        if (layer.__identifier === "Ropes") textureKey = "famine_ropes";
        layer.gridTiles.forEach((tile) => {
          const img = this.add.image(
            offsetX + tile.px[0] + 8,
            offsetY + tile.px[1] + 8,
            textureKey,
            tile.t,
          );
          if (layer.__identifier === "Tiles") {
              img.setDepth(20);
          } else {
              img.setDepth(5);
          }
          if (tile.f === 1 || tile.f === 3) img.setFlipX(true);
          if (tile.f === 2 || tile.f === 3) img.setFlipY(true);
        });
      }
    });
    if (spawnsLayer) {
      spawnsLayer.entityInstances.forEach((ent) => {
        const spawnX = offsetX + ent.px[0] + ent.width / 2;
        const spawnY = offsetY + (ent.px[1] + ent.height) - 50;
        if (ent.__identifier === "PlayerStart") {
          this.lastPlayerSpawn = { x: spawnX, y: spawnY };
        } else if (ent.__identifier === "Rat") {
          this.ratSpawns.push({ x: spawnX, y: spawnY });
        } else if (ent.__identifier === "Door") {
          const dirField = ent.fieldInstances.find(
            (f) => f.__identifier === "direction",
          );
          const dir =
            dirField && dirField.__value ? dirField.__value : "unknown";
          doors.push({
            localX: ent.px[0],
            localY: ent.px[1],
            absoluteX: offsetX + ent.px[0],
            absoluteY: offsetY + ent.px[1],
            width: ent.width,
            dir: dir,
            levelId: level.identifier,
          });
        }
      });
    }
    return doors;
  }
  spawnRat(x, y, faceRight) {
    if (!this.rats) this.rats = this.add.group();
    const rat = this.physics.add.sprite(x, y, "rat_walk");
    rat.setDepth(10);
    rat.setScale(1);
    rat.setData("baseSize", { w: 25, h: 10 });
    rat.setData("baseOffset", { x: 45, y: 90 });
    rat.body.setSize(25, 10);
    rat.body.setOffset(45, 90);
    rat.setCollideWorldBounds(true);
    this.physics.add.collider(rat, this.ground);
    rat.anims.play("rat_walk", true);
    if (faceRight) {
      rat.setVelocityX(50);
      rat.setFlipX(false);
    } else {
      rat.setVelocityX(-50);
      rat.setFlipX(true);
    }
    rat.setData("hp", 1);
    rat.setData("state", "patrol");
    rat.setData("visionRange", 300);
    rat.setData("attackRange", 50);
    rat.setData("attackCooldown", 2000);
    rat.setData("lastAttackTime", 0);
    // How long (ms) a rat freezes and stares at the player after an attack.
    rat.setData("recoverTime", 500);
    rat.on("animationcomplete", (anim) => {
      if (anim.key === "rat_attack" && rat.getData("hp") > 0) {
        rat.setData("state", "recover");
        rat.setData("recoverUntil", this.time.now + rat.getData("recoverTime"));
        rat.setData("lastAttackTime", this.time.now);
        rat.setVelocityX(0);
        rat.anims.stop();
        rat.setTexture("rat_walk", 0);
      }
    });
    this.physics.add.overlap(this.attackHitbox, rat, (hitbox, ratHit) => {
      if (
        !this.hasWallBetween(
          this.player.body.center.x,
          this.player.body.center.y,
          ratHit.body.center.x,
          ratHit.body.center.y,
        )
      ) {
        this.damageEnemy(ratHit, this.SWORD_DAMAGE);
      }
    });
    this.physics.add.overlap(this.player, rat, (player, ratHit) => {
      const isInvulnerable =
        player.getData("isRollInvulnerable") ||
        this.time.now < (player.getData("hitInvulnerableUntil") || 0);
      if (
        ratHit.getData("hp") > 0 &&
        ratHit.getData("state") === "attack" &&
        ratHit.getData("hitStrike") !== ratHit.getData("strike") &&
        !isInvulnerable &&
        !this.isDead
      ) {
        ratHit.setData("hitStrike", ratHit.getData("strike"));
        this.takeDamage(20);
        if (this.isDead) return;
        player.setTint(0xff0000);
        player.setData("hitInvulnerableUntil", this.time.now + 1000);
        player.setData("knockbackUntil", this.time.now + 200);
        // A hit cancels climbing/vaulting so platform collisions are restored.
        player.setData("isClimbing", false);
        player.setData("isVaulting", false);
        player.body.allowGravity = true;
        const knockbackDirection = player.x < ratHit.x ? -1 : 1;
        // Don't shove the player into a wall: only push sideways if the way is clear.
        const body = player.body;
        const probeX = body.center.x + knockbackDirection * (body.halfWidth + 30);
        const wallBehind = this.hasWallBetween(
          body.center.x,
          body.center.y,
          probeX,
          body.center.y,
        );
        player.setVelocity(wallBehind ? 0 : knockbackDirection * 200, -200);
        ratHit.setData("ignorePlayerUntil", this.time.now + 1000);
        this.time.delayedCall(1000, () => {
          player.clearTint();
        });
      }
    });
    this.rats.add(rat);
  }
  // Animations live in the game-wide manager and survive scene restarts.
  createAnimOnce(config) {
    if (!this.anims.exists(config.key)) this.anims.create(config);
  }
  setHitboxDebug(on) {
    this.physics.world.drawDebug = on;
    if (!on) this.physics.world.debugGraphic.clear();
    if (this.attackHitbox) this.attackHitbox.setVisible(on);
  }
  // Every sword hit on an enemy goes through here: one hit per enemy per swing.
  damageEnemy(enemy, amount) {
    if (enemy.getData("hp") <= 0 || enemy.getData("lastHitStrike") === this.strikeId) return;
    enemy.setData("lastHitStrike", this.strikeId);
    const hp = Math.max(0, enemy.getData("hp") - amount);
    enemy.setData("hp", hp);
    if (hp > 0) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(80, () => enemy.active && enemy.clearTint());
      return;
    }
    enemy.setTint(0xff0000);
    enemy.setVelocityX(0);
    this.time.delayedCall(200, () => enemy.destroy());
  }
  // Placeholder death until hurt/death animations exist: red fall and fade,
  // then DeathScene shows "You have fallen" and respawns at the checkpoint.
  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.isAttacking = false;
    this.isRolling = false;
    this.attackHitbox.body.enable = false;
    this.physics.pause();
    this.player.anims.stop();
    this.player.setTint(0xff0000);
    this.cameras.main.shake(200, 0.004);
    this.tweens.add({
      targets: this.player,
      angle: this.player.flipX ? -90 : 90,
      alpha: 0.35,
      duration: DEATH_CONFIG.fallMs,
      ease: "Quad.easeIn",
    });
    this.time.delayedCall(DEATH_CONFIG.fallMs, () => this.scene.launch("DeathScene"));
  }
  // Opens the pause menu (which also leaves fullscreen). scene.pause() is
  // queued, so isActive() stays true for the rest of this frame; the flag
  // stops a second request (Esc+P, or a fullscreen exit) launching twice.
  requestPause() {
    if (this.pauseRequested || this.isDead) return false;
    this.pauseRequested = true;
    this.scene.launch("PauseScene");
    this.scene.pause();
    return true;
  }
  // Checkpoint restore: rebuilds the saved map with full HP/stamina and all
  // regular enemies reset. Used by death and by Retry from Checkpoint.
  restartFromCheckpoint() {
    this.scene.stop("PauseScene");
    this.scene.stop("DeathScene");
    this.scene.restart();
  }
  takeDamage(amount) {
    if (this.player.getData("hp") <= 0) return;
    const currentHp = this.player.getData("hp");
    const newHp = Math.max(0, currentHp - amount);
    this.player.setData("hp", newHp);
    if (this.hpDelayTween) {
      this.hpDelayTween.stop();
    }
    this.hudDelay.displayWidth =
      (currentHp / this.player.getData("maxHp")) * this.HUD_MAX_WIDTH;
    const targetWidth =
      (newHp / this.player.getData("maxHp")) * this.HUD_MAX_WIDTH;
    this.hpDelayTween = this.tweens.add({
      targets: this.hudDelay,
      displayWidth: targetWidth,
      delay: 500,
      duration: 300,
      ease: "Sine.easeInOut",
    });
    if (newHp === 0) this.die();
  }
  consumeStamina(amount) {
    const currentStam = this.player.getData("stamina");
    const newStam = Math.max(0, currentStam - amount);
    this.player.setData("stamina", newStam);
    this.player.setData("staminaRegenDelayUntil", this.time.now + 800);
    if (this.stamDelayTween) {
      this.stamDelayTween.stop();
    }
    this.hudStamDelay.displayWidth =
      (currentStam / this.player.getData("maxStamina")) * this.HUD_MAX_WIDTH;
    const targetWidth =
      (newStam / this.player.getData("maxStamina")) * this.HUD_MAX_WIDTH;
    this.stamDelayTween = this.tweens.add({
      targets: this.hudStamDelay,
      displayWidth: targetWidth,
      delay: 500,
      duration: 300,
      ease: "Sine.easeInOut",
    });
  }
  // World-space body rectangle the player would have at (spriteX, spriteY)
  // for a given hitbox key and facing (mirrors the offsets applied in update()).
  getPlayerBodyRectAt(spriteX, spriteY, key, flipX) {
    const hitboxes = this.heroConfig.hitboxes;
    const box = hitboxes[key] || hitboxes.idle;
    const originOffset =
      (this.heroConfig.spriteOffsets && this.heroConfig.spriteOffsets[key]) || 0;
    const originX = flipX ? 0.5 + originOffset : 0.5 - originOffset;
    const offsetX = flipX
      ? 100 - (box.x + box.w) + originOffset * 100
      : box.x - originOffset * 100;
    return new Phaser.Geom.Rectangle(
      spriteX - 100 * originX + offsetX,
      spriteY - 50 + box.y,
      box.w,
      box.h,
    );
  }
  isRectBlockedBySolid(rect) {
    const EPS = 0.5;
    const blocks = this.ground.getChildren();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.isPlatform || block.isRope) continue;
      const b = block.body;
      if (
        rect.right - EPS > b.x &&
        rect.x + EPS < b.x + b.width &&
        rect.bottom - EPS > b.y &&
        rect.y + EPS < b.y + b.height
      ) {
        return true;
      }
    }
    return false;
  }
  hasWallBetween(x1, y1, x2, y2) {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    const blocks = this.ground.getChildren();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.isPlatform || block.isRope) continue;
      const b = block.body;
      const rect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) return true;
    }
    return false;
  }
  // Move the player horizontally toward targetX, stopping before any solid tile.
  snapPlayerXToward(targetX, key) {
    const p = this.player;
    let x = p.x;
    const dir = Math.sign(targetX - x);
    while (dir !== 0 && (targetX - x) * dir > 0) {
      const nx = x + dir * Math.min(1, (targetX - x) * dir);
      if (
        this.isRectBlockedBySolid(
          this.getPlayerBodyRectAt(nx, p.y, key, p.flipX),
        )
      ) {
        break;
      }
      x = nx;
    }
    p.x = x;
  }
  update(time, delta) {
    const speed = 160;
    if (this.hudHp && this.hudStamina) {
      const MAX_BAR_WIDTH = 124;
      const hpRatio = this.player.getData("hp") / this.player.getData("maxHp");
      const stamRatio =
        this.player.getData("stamina") / this.player.getData("maxStamina");
      this.hudHp.displayWidth = Math.max(0, hpRatio * MAX_BAR_WIDTH);
      this.hudStamina.displayWidth = Math.max(0, stamRatio * MAX_BAR_WIDTH);
    }
    if (this.farBg) {
      this.farBg.tilePositionX = this.cameras.main.scrollX * 0.2;
    }
    if (this.isDead) return;
    const mouseAttack = this.input.activePointer.leftButtonDown();
    if (!mouseAttack) this.ignorePointerUntilUp = false;
    if (
      (this.keys.attack.isDown || (mouseAttack && !this.ignorePointerUntilUp)) &&
      !this.isAttacking &&
      !this.isRolling
    ) {
      if (this.player.getData("stamina") >= this.STAMINA_COST_ATTACK) {
        this.isAttacking = true;
        this.strikeId++;
        this.consumeStamina(this.STAMINA_COST_ATTACK);
        this.player.anims.play("attack", true);
      }
    }
    const isRollJustDown =
      Phaser.Input.Keyboard.JustDown(this.keys.roll) ||
      Phaser.Input.Keyboard.JustDown(this.keys.shift);
    const isClimbingNow = this.player.getData("isClimbing") || false;
    if (
      isRollJustDown &&
      !this.isRolling &&
      !this.isAttacking &&
      (this.player.body.touching.down || isClimbingNow)
    ) {
      if (this.player.getData("stamina") >= this.STAMINA_COST_ROLL) {
        this.isRolling = true;
        this.consumeStamina(this.STAMINA_COST_ROLL);
        this.player.setData("isRollInvulnerable", true);
        this.player.setData("isClimbing", false);
        this.player.body.allowGravity = true;
        this.player.anims.play("roll", true);
        const rollDirection = this.player.flipX ? -1 : 1;
        this.player.setVelocityX(rollDirection * 300);
      }
    }

    if (this.isRolling) {
      const rollCfg = this.heroConfig.roll;
      const isHoldingHorizontal =
        this.keys.a.isDown ||
        this.keys.d.isDown ||
        this.cursors.left.isDown ||
        this.cursors.right.isDown;
      const currentAnim = this.player.anims.currentAnim;
      const currentFrame = this.player.anims.currentFrame;

      if (currentAnim && currentAnim.key === "roll" && currentFrame && rollCfg) {
        if (!isHoldingHorizontal) {
          const skipList = rollCfg.skipFrames || [5, 6];
          const skipTarget = rollCfg.skipToFrame;
          if (
            skipList.includes(currentFrame.textureFrame) &&
            currentFrame.textureFrame !== skipTarget
          ) {
            if (skipTarget !== null && skipTarget !== undefined) {
              const targetFrame = currentAnim.frames.find(
                (f) => f.textureFrame === skipTarget,
              );
              if (targetFrame) {
                this.player.anims.setCurrentFrame(targetFrame);
                this.player.anims.accumulator = 0;
                this.player.anims.nextTick =
                  targetFrame.duration || this.player.anims.msPerFrame;
                if (rollCfg.stopVelocityOnSkip) {
                  this.player.setVelocityX(0);
                }
              }
            } else {
              this.isRolling = false;
              this.player.setData("isRollInvulnerable", false);
              this.player.anims.play("idle", true);
              if (rollCfg.stopVelocityOnSkip) {
                this.player.setVelocityX(0);
              }
            }
          }
        }
      }
    }
    const regenDelayUntil = this.player.getData("staminaRegenDelayUntil") || 0;
    if (!this.isAttacking && !this.isRolling && time >= regenDelayUntil) {
      const currentStam = this.player.getData("stamina");
      const maxStam = this.player.getData("maxStamina");
      if (currentStam < maxStam) {
        const newStam = Math.min(
          maxStam,
          currentStam + this.STAMINA_REGEN * (delta / 1000),
        );
        this.player.setData("stamina", newStam);
      }
    }
    let isMoving = false;
    const inKnockback = time < (this.player.getData("knockbackUntil") || 0);
    const onGround = this.player.body.touching.down || this.player.body.blocked.down;
    const isDown = this.cursors.down.isDown || this.keys.s.isDown;
    const isUp = this.cursors.up.isDown || this.keys.w.isDown;
    // UNBOUND W and UP from jump
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.space);

    let touchingRope = false;
    let ropeX = null;
    let ropeTop = null;
    let ropeBottom = null;
    let ropeBelow = null;
    let minRopeBelowDist = Infinity;
    
    const ropeCfg = this.heroConfig.rope;
    const ROPE_ATTACH_RANGE_X = ropeCfg.attachRangeX;
    const ROPE_ATTACH_RANGE_Y = 0;
    const ROPE_VISUAL_OFFSET_RIGHT = ropeCfg.visualOffsetRight;
    const ROPE_VISUAL_OFFSET_LEFT = ropeCfg.visualOffsetLeft;
    const VAULT_THRESHOLD = ropeCfg.vaultThreshold;
    const VAULT_HEIGHT = ropeCfg.vaultHeight;
    const VAULT_DOWN_HEIGHT = ropeCfg.vaultDownHeight || 16;
    const CLIMB_DOWN_THRESHOLD = ropeCfg.climbDownThreshold || 20;
    const DETACH_BOTTOM_OFFSET = ropeCfg.detachBottomOffset !== undefined ? ropeCfg.detachBottomOffset : 4;
    
    const pBody = this.player.body;
    let isVaulting = this.player.getData("isVaulting") || false;
    
    const columnRopes = [];
    const touchingBlocks = [];

    this.ground.getChildren().forEach((block) => {
      if (block.isRope) {
        const bBody = block.body;
        const inX = pBody.right > bBody.center.x - ROPE_ATTACH_RANGE_X && pBody.left < bBody.center.x + ROPE_ATTACH_RANGE_X;
        const inY = pBody.bottom > bBody.top - ROPE_ATTACH_RANGE_Y && pBody.top < bBody.bottom;
        
        if (inX) {
          columnRopes.push(block);
          if (inY) {
            touchingRope = true;
            ropeX = block.x;
            touchingBlocks.push(block);
          }
          const distBelow = bBody.top - pBody.bottom;
          if (distBelow >= -6 && distBelow <= CLIMB_DOWN_THRESHOLD) {
            if (distBelow < minRopeBelowDist) {
              minRopeBelowDist = distBelow;
              ropeBelow = block;
            }
          }
        }
      }
    });

    if (columnRopes.length > 0) {
      columnRopes.sort((a, b) => a.body.top - b.body.top);
      const refBlock = touchingBlocks.length > 0 ? touchingBlocks[0] : ropeBelow;
      if (refBlock) {
        ropeTop = refBlock.body.top;
        ropeBottom = refBlock.body.bottom;
        const refIdx = columnRopes.indexOf(refBlock);
        for (let i = refIdx - 1; i >= 0; i--) {
          if (Math.abs(columnRopes[i].body.bottom - ropeTop) <= 2) {
            ropeTop = columnRopes[i].body.top;
          } else {
            break;
          }
        }
        for (let i = refIdx + 1; i < columnRopes.length; i++) {
          if (Math.abs(columnRopes[i].body.top - ropeBottom) <= 2) {
            ropeBottom = columnRopes[i].body.bottom;
          } else {
            break;
          }
        }
      }
    }

    let wasClimbing = this.player.getData("isClimbing") || false;
    let isClimbing = wasClimbing;

    // After jumping off a rope, don't re-grab it until the climb keys are released.
    if (!isUp && !isDown) {
      this.player.setData("ropeRegrabBlockX", null);
    }
    const ropeRegrabBlockX = this.player.getData("ropeRegrabBlockX");
    const ropeRegrabBlocked =
      ropeRegrabBlockX !== null &&
      ropeRegrabBlockX !== undefined &&
      ropeX !== null &&
      Math.abs(ropeX - ropeRegrabBlockX) < 8;

    const isNearRopeBottom = ropeBottom !== null && pBody.bottom >= ropeBottom - 24;
    const atRopeEndGoingDown =
      isDown &&
      ((onGround && isNearRopeBottom) || (ropeBottom !== null && pBody.bottom >= ropeBottom - DETACH_BOTTOM_OFFSET));

    if (this.isAttacking || this.isRolling) {
      isClimbing = false;
      if (this.vaultTween) {
        this.vaultTween.stop();
        this.vaultTween = null;
        this.player.body.allowGravity = true;
      }
      isVaulting = false;
      this.player.setData("isVaulting", false);
      this.player.setData("isVaultingDown", false);
    } else if (isClimbing && atRopeEndGoingDown && !isVaulting) {
      // Automatically detach from rope when going down at the end of the rope
      isClimbing = false;
      this.player.setData("isClimbing", false);
      this.player.body.allowGravity = true;
    } else if (!touchingRope && !isVaulting) {
      isClimbing = false;
    }

    const canVaultDown =
      isDown &&
      onGround &&
      !this.isAttacking &&
      !this.isRolling &&
      !isVaulting &&
      !wasClimbing;

    if (canVaultDown && ropeBelow) {
      isVaulting = true;
      isClimbing = true;
      this.player.setData("isVaulting", true);
      this.player.setData("isVaultingDown", true);
      this.player.setData("isClimbing", true);
      this.player.body.allowGravity = false;
      this.player.setVelocity(0, 0);

      this.snapPlayerXToward(
        ropeBelow.x +
          (this.player.flipX
            ? ROPE_VISUAL_OFFSET_LEFT
            : ROPE_VISUAL_OFFSET_RIGHT),
        "climb",
      );
      this.player.anims.play("climb", true);

      // Clamp the drop so the body never ends up inside floor tiles.
      let dropDistance = 0;
      while (dropDistance < VAULT_DOWN_HEIGHT) {
        const nextDrop = Math.min(dropDistance + 1, VAULT_DOWN_HEIGHT);
        if (
          this.isRectBlockedBySolid(
            this.getPlayerBodyRectAt(
              this.player.x,
              this.player.y + nextDrop,
              "climb",
              this.player.flipX,
            ),
          )
        ) {
          break;
        }
        dropDistance = nextDrop;
      }
      const targetY = this.player.y + dropDistance;

      this.vaultTween = this.tweens.add({
        targets: this.player,
        y: targetY,
        duration: 100,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.vaultTween = null;
          this.player.setData("isVaulting", false);
          this.player.setData("isVaultingDown", false);
          this.player.setData("isClimbing", true);
          this.player.body.allowGravity = false;
        },
      });
    } else if (
      (isUp || (isDown && !onGround && !atRopeEndGoingDown)) &&
      touchingRope &&
      !ropeRegrabBlocked &&
      !this.isAttacking &&
      !this.isRolling &&
      !isVaulting
    ) {
      if (isUp && pBody.bottom <= ropeTop + 2) {
        // Standing exactly at the very top of the rope, do not grab
      } else {
        isClimbing = true;
      }
    }

    if (isClimbing && isUp && ropeTop !== null && !isVaulting) {
      if (pBody.bottom <= ropeTop + VAULT_THRESHOLD) {
        isClimbing = false;
        this.player.setData("isVaulting", true);
        this.player.setData("isVaultingDown", false);
        this.player.body.allowGravity = false;
        this.player.setVelocity(0, 0);

        const targetY =
          this.player.y - (pBody.bottom - (ropeTop - VAULT_HEIGHT));

        this.vaultTween = this.tweens.add({
          targets: this.player,
          y: targetY,
          duration: 100,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.vaultTween = null;
            this.player.setData("isVaulting", false);
            this.player.body.allowGravity = true;
          },
        });
      }
    }

    this.player.setData("isClimbing", isClimbing);

    let isCrouching = false;
    if (
      isDown &&
      onGround &&
      !isClimbing &&
      !this.isAttacking &&
      !this.isRolling &&
      !isVaulting
    ) {
      isCrouching = true;
    }

    if (isClimbing) {
      this.player.body.allowGravity = false;
      this.player.setVelocityX(0);

      // Allow sprite flipping while climbing
      if (this.cursors.left.isDown || this.keys.a.isDown) {
        this.player.setFlipX(true);
      } else if (this.cursors.right.isDown || this.keys.d.isDown) {
        this.player.setFlipX(false);
      }

      // Keep strictly snapped to rope center + visual offset
      const activeRopeX =
        ropeX !== null ? ropeX : ropeBelow ? ropeBelow.x : null;
      if (activeRopeX !== null) {
        this.snapPlayerXToward(
          activeRopeX +
            (this.player.flipX
              ? ROPE_VISUAL_OFFSET_LEFT
              : ROPE_VISUAL_OFFSET_RIGHT),
          "climb",
        );
      }

      if (!isVaulting) {
        if (isUp) {
          this.player.setVelocityY(-100);
        } else if (isDown && !onGround) {
          this.player.setVelocityY(100);
        } else {
          this.player.setVelocityY(0);
        }
      }
    } else if (!isVaulting) {
      this.player.body.allowGravity = true;

      if (inKnockback) {
        // Keep the knockback velocity; movement input is ignored briefly.
        // Stop sideways motion the moment a wall is hit.
        if (this.player.body.blocked.left || this.player.body.blocked.right) {
          this.player.setVelocityX(0);
        }
      } else if (isCrouching) {
        this.player.setVelocityX(0);
      } else if (this.cursors.left.isDown || this.keys.a.isDown) {
        if (!this.isRolling && !this.isAttacking) this.player.setFlipX(true);
        if (!this.isAttacking && !this.isRolling) {
          this.player.setVelocityX(-speed);
          isMoving = true;
        }
      } else if (this.cursors.right.isDown || this.keys.d.isDown) {
        if (!this.isRolling && !this.isAttacking) this.player.setFlipX(false);
        if (!this.isAttacking && !this.isRolling) {
          this.player.setVelocityX(speed);
          isMoving = true;
        }
      } else {
        if (!this.isAttacking && !this.isRolling) {
          this.player.setVelocityX(0);
        }
      }
    }

    if (!this.isAttacking && !this.isRolling && !isVaulting) {
      if (isClimbing && jumpPressed) {
        this.player.setData(
          "ropeRegrabBlockX",
          ropeX !== null ? ropeX : this.player.x,
        );
        this.player.setData("isClimbing", false);
        this.player.body.allowGravity = true;
        this.player.setVelocityY(this.JUMP_VELOCITY_SINGLE);
        this.player.setData("canDoubleJump", true);
      } else if (onGround) {
        this.player.setData("canDoubleJump", true);
        if (jumpPressed) {
          if (isDown) {
            this.player.setData("isDroppingDown", true);
            this.time.delayedCall(250, () => {
              if (this.player) this.player.setData("isDroppingDown", false);
            });
          } else {
            this.player.setVelocityY(this.JUMP_VELOCITY_SINGLE);
          }
        }
      } else if (!isClimbing) {
        if (jumpPressed && this.player.getData("canDoubleJump")) {
          this.player.setVelocityY(this.JUMP_VELOCITY_DOUBLE);
          this.player.setData("canDoubleJump", false);
        }
      }
    } else if (this.isAttacking && !inKnockback) {
      this.player.setVelocityX(0);
    }

    // The sword only hurts during the middle third of the attack animation.
    let attackActive = false;
    if (this.isAttacking) {
      const atkAnim = this.player.anims.currentAnim;
      const atkFrame = this.player.anims.currentFrame;
      if (atkAnim && atkAnim.key === "attack" && atkFrame) {
        const total = atkAnim.frames.length;
        const frameIdx = atkFrame.index - 1;
        attackActive =
          frameIdx >= Math.floor(total / 3) && frameIdx < Math.ceil((2 * total) / 3);
      }
    }
    if (this.isAttacking) {
      this.attackHitbox.body.enable = attackActive;
      const atkCfg = this.heroConfig.attackHitbox;
      if (this.player.flipX) {
        this.attackHitbox.x = this.player.x - atkCfg.offsetX;
      } else {
        this.attackHitbox.x = this.player.x + atkCfg.offsetX;
      }
      this.attackHitbox.y = this.player.y + atkCfg.offsetY;
    } else {
      this.attackHitbox.body.enable = false;
      this.attackHitbox.x = -1000;
      this.attackHitbox.y = -1000;
    }

    if (!this.isAttacking && !this.isRolling) {
      if (isVaulting) {
        if (this.player.getData("isVaultingDown")) {
          if (this.player.anims.currentAnim?.key !== "climb") {
            this.player.anims.play("climb", true);
          }
        } else {
          if (this.player.anims.currentAnim?.key !== "idle") {
            this.player.anims.play("idle", true);
          }
        }
      } else if (isClimbing) {
        if (this.player.anims.currentAnim?.key !== "climb") {
          this.player.anims.play("climb", true);
        }
        if (this.player.body.velocity.y === 0) {
          if (!this.player.anims.isPaused) {
            this.player.anims.pause();
          }
        } else {
          if (this.player.anims.isPaused) {
            this.player.anims.resume();
          }
        }
      } else {
        if (this.player.anims.isPaused) {
          this.player.anims.resume();
        }
        if (!onGround) {
          this.player.anims.play("jump", true);
        } else if (isCrouching) {
          if (this.player.anims.currentAnim?.key !== "crouch") {
            this.player.anims.play("crouch", true);
          }
        } else {
          if (isMoving) {
            this.player.anims.play("run", true);
          } else {
            this.player.anims.play("idle", true);
          }
        }
      }
    }
    if (this.rats) {
      this.rats.getChildren().forEach((rat) => {
        if (!rat.active || rat.getData("hp") <= 0) return;
        const state = rat.getData("state");
        const vision = rat.getData("visionRange");
        const attackRange = rat.getData("attackRange");
        const attackCooldown = rat.getData("attackCooldown");
        const lastAttack = rat.getData("lastAttackTime");
        const now = this.time.now;
        const distToPlayer = Phaser.Math.Distance.Between(
          rat.x,
          rat.y,
          this.player.x,
          this.player.y,
        );
        const playerInFront = rat.flipX
          ? this.player.x < rat.x
          : this.player.x > rat.x;
        const verticalDist = Math.abs(this.player.y - rat.y);
        if (
          (state === "patrol" || state === "pursue") &&
          rat.body.blocked.down
        ) {
          const dirMult = rat.flipX ? -1 : 1;
          const feelerX = rat.x + dirMult * 15;
          const feelerY = rat.body.bottom + 5;
          const groundAhead = this.physics
            .overlapRect(feelerX - 2, feelerY - 2, 4, 4, true, true)
            .some((b) => b.gameObject && this.ground.contains(b.gameObject));
          if (!groundAhead) {
            rat.setFlipX(!rat.flipX);
            if (state === "patrol") {
              rat.setVelocityX(rat.flipX ? -50 : 50);
            } else {
              rat.setVelocityX(rat.flipX ? -50 : 50);
              rat.setData("state", "patrol");
            }
          }
        }
        let hasLineOfSight = false;
        if (distToPlayer <= vision && verticalDist < 80) {
          hasLineOfSight = true;
          const sightLine = new Phaser.Geom.Line(
            rat.x,
            rat.y,
            this.player.x,
            this.player.y,
          );
          const minX = Math.min(rat.x, this.player.x);
          const maxX = Math.max(rat.x, this.player.x);
          const minY = Math.min(rat.y, this.player.y);
          const maxY = Math.max(rat.y, this.player.y);
          const groundBlocks = this.ground.getChildren();
          for (let i = 0; i < groundBlocks.length; i++) {
            const block = groundBlocks[i];
            if (block.isPlatform || block.isRope) continue;
            if (
              block.x + block.width / 2 >= minX &&
              block.x - block.width / 2 <= maxX &&
              block.y + block.height / 2 >= minY &&
              block.y - block.height / 2 <= maxY
            ) {
              const rect = new Phaser.Geom.Rectangle(
                block.body.x,
                block.body.y,
                block.body.width,
                block.body.height,
              );
              if (Phaser.Geom.Intersects.LineToRectangle(sightLine, rect)) {
                hasLineOfSight = false;
                break;
              }
            }
          }
        }
        if (state === "patrol") {
          if (
            distToPlayer <= vision &&
            playerInFront &&
            verticalDist < 32 &&
            hasLineOfSight
          ) {
            rat.setData("state", "pursue");
          } else {
            if (rat.body.blocked.left) {
              rat.setVelocityX(50);
              rat.setFlipX(false);
            } else if (rat.body.blocked.right) {
              rat.setVelocityX(-50);
              rat.setFlipX(true);
            }
            if (rat.anims.currentAnim?.key !== "rat_walk")
              rat.anims.play("rat_walk", true);
          }
        } else if (state === "pursue") {
          const ignoreUntil = rat.getData("ignorePlayerUntil") || 0;
          const isIgnoring = now < ignoreUntil;
          if (distToPlayer > vision || verticalDist > 80 || !hasLineOfSight) {
            rat.setData("state", "patrol");
          } else if (
            !isIgnoring &&
            distToPlayer <= attackRange &&
            now - lastAttack >= attackCooldown
          ) {
            rat.setVelocityX(0);
            rat.setData("state", "attack");
            rat.setData("strike", (rat.getData("strike") || 0) + 1);
            rat.setData("lastAttackTime", now);
            rat.anims.play("rat_attack", true);
            const dir = this.player.x < rat.x ? -1 : 1;
            rat.setVelocity(dir * 250, -200);
          } else {
            if (!isIgnoring && distToPlayer <= 15) {
            } else {
              const dir = isIgnoring
                ? rat.flipX
                  ? -1
                  : 1
                : this.player.x < rat.x
                  ? -1
                  : 1;
              rat.setFlipX(dir === -1);
              rat.setVelocityX(dir * 120);
            }
            if (rat.anims.currentAnim?.key !== "rat_run")
              rat.anims.play("rat_run", true);
          }
        } else if (state === "recover") {
          rat.setVelocityX(0);
          rat.setFlipX(this.player.x < rat.x);
          if (now >= rat.getData("recoverUntil")) {
            rat.setData("state", "pursue");
          }
        } else if (state === "attack") {
        }
        rat.setOrigin(0.5, 0.5);
        const rBase = rat.getData("baseOffset");
        const rSize = rat.getData("baseSize");
        if (rat.flipX) {
          rat.body.setOffset(100 - (rBase.x + rSize.w), rBase.y);
        } else {
          rat.body.setOffset(rBase.x, rBase.y);
        }
      });
    }
    const currentAnim = this.player.anims.currentAnim?.key;
    const originOffset =
      (this.heroConfig.spriteOffsets && this.heroConfig.spriteOffsets[currentAnim]) || 0;
    const hitboxes = this.heroConfig.hitboxes;
    let targetHitboxKey = currentAnim || "idle";
    let currentHitboxKey = this.player.getData("currentHitboxKey") || "idle";
    const hitboxTransitionDelay = 100;
    if (targetHitboxKey !== currentHitboxKey) {
      const needsDelay =
        currentHitboxKey === "idle" &&
        (targetHitboxKey === "run" || targetHitboxKey === "attack");
      if (needsDelay) {
        let timer = this.player.getData("hitboxTimer") || 0;
        if (timer === 0) {
          this.player.setData(
            "hitboxTimer",
            this.time.now + hitboxTransitionDelay,
          );
        } else if (this.time.now >= timer) {
          currentHitboxKey = targetHitboxKey;
          this.player.setData("currentHitboxKey", currentHitboxKey);
          this.player.setData("hitboxTimer", 0);
        }
      } else {
        currentHitboxKey = targetHitboxKey;
        this.player.setData("currentHitboxKey", currentHitboxKey);
        this.player.setData("hitboxTimer", 0);
      }
    } else {
      this.player.setData("hitboxTimer", 0);
    }
    const pBox = hitboxes[currentHitboxKey] || hitboxes["idle"];
    const currentStateHash = `${currentHitboxKey}_${this.player.flipX}_${originOffset}_${pBox.x}_${pBox.y}_${pBox.w}_${pBox.h}`;
    const previousStateHash = this.player.getData("lastHitboxState");
    let hitboxSwapBlocked = false;
    if (currentStateHash !== previousStateHash) {
      // Don't grow the body upward into a ceiling; retry next frame.
      const newRect = this.getPlayerBodyRectAt(
        this.player.x,
        this.player.y,
        currentHitboxKey,
        this.player.flipX,
      );
      hitboxSwapBlocked =
        newRect.y < this.player.body.y - 0.5 &&
        this.isRectBlockedBySolid(newRect);
    }
    if (currentStateHash !== previousStateHash && !hitboxSwapBlocked) {
      this.player.setData("lastHitboxState", currentStateHash);
      this.player.body.setSize(pBox.w, pBox.h);
      if (this.player.flipX) {
        this.player.setOrigin(0.5 + originOffset, 0.5);
        const flippedX = 100 - (pBox.x + pBox.w);
        this.player.body.setOffset(flippedX + originOffset * 100, pBox.y);
      } else {
        this.player.setOrigin(0.5 - originOffset, 0.5);
        this.player.body.setOffset(pBox.x - originOffset * 100, pBox.y);
      }
    }
  }
}
