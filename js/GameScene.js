class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }
  preload() {
    this.load.spritesheet("hero_idle", "Sprites/HERO/HERO_IDLE.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_run", "Sprites/HERO/HERO_RUN.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_jump", "Sprites/HERO/HERO_JUMP.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_roll", "Sprites/HERO/HERO_ROLL.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_attack", "sprites/HERO/HERO_ATTACK.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_climb", "sprites/HERO/HERO_CLIMB.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("hero_crouch", "sprites/HERO/HERO_CROUCH.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("rat_walk", "Sprites/ENEMIES/FAMINE/RAT_WALK.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet("rat_run", "Sprites/ENEMIES/FAMINE/RAT_RUN.png", {
      frameWidth: 100,
      frameHeight: 100,
    });
    this.load.spritesheet(
      "rat_attack",
      "Sprites/ENEMIES/FAMINE/RAT_ATTACK.png",
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
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("hero_idle"),
      frameRate: 1000 / 500,
      repeat: -1,
    });
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("hero_run"),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNumbers("hero_jump"),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "roll",
      frames: this.anims.generateFrameNumbers("hero_roll"),
      frameRate: 15,
      repeat: 0,
    });
    this.anims.create({
      key: "attack",
      frames: this.anims.generateFrameNumbers("hero_attack"),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "climb",
      frames: this.anims.generateFrameNumbers("hero_climb"),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "crouch",
      frames: this.anims.generateFrameNumbers("hero_crouch", { start: 0, end: 1 }),
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
    this.player.setData("hitboxes", {
      idle: { w: 10, h: 50, x: 50, y: 50 },
      run: { w: 30, h: 40, x: 30, y: 60 },
      jump: { w: 10, h: 50, x: 50, y: 50 },
      roll: { w: 30, h: 40, x: 30, y: 60 },
      attack: { w: 30, h: 40, x: 35, y: 60 },
      climb: { w: 10, h: 50, x: 50, y: 50 },
      crouch: { w: 10, h: 30, x: 50, y: 70 },
    });
    this.player.body.setSize(10, 50);
    this.player.body.setOffset(50, 50);
    this.physics.add.collider(
      this.player,
      this.ground,
      null,
      (player, block) => {
        if (block.isPlatform && player.getData("isDroppingDown")) {
          return false;
        }
        return true;
      },
      this,
    );
    this.attackHitbox = this.add.rectangle(0, 0, 70, 50, 0xff0000, 0.5);
    this.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.allowGravity = false;
    this.attackHitbox.body.enable = false;
    this.anims.create({
      key: "rat_walk",
      frames: this.anims.generateFrameNumbers("rat_walk"),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "rat_run",
      frames: this.anims.generateFrameNumbers("rat_run"),
      frameRate: 15,
      repeat: -1,
    });
    this.anims.create({
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
    this.physics.world.drawDebug = false;
    this.physics.world.debugGraphic.clear();
    if (this.attackHitbox) this.attackHitbox.setVisible(false);
    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      if (this.physics.world.drawDebug) {
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear();
        if (this.attackHitbox) this.attackHitbox.setVisible(false);
      } else {
        this.physics.world.drawDebug = true;
        if (this.attackHitbox) this.attackHitbox.setVisible(true);
      }
    });
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
        this.player.setData("isInvulnerable", false);
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
    const overlay = document.getElementById("fullscreen-overlay");
    if (overlay && overlay.style.display !== "none") {
      this.scene.pause();
    }
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
      const intermediateLevels = ldtkData.levels.filter((l) =>
        ["Level_1", "Level_2", "Level_3"].includes(l.identifier),
      );
      const endLevel = ldtkData.levels.find((l) => l.identifier === "Level_4");
      const numIntermediateRooms = 3;
      for (let i = 0; i <= numIntermediateRooms; i++) {
        if (!currentRightDoor) break;
        let selectedLevel;
        if (i === numIntermediateRooms && endLevel) {
          selectedLevel = endLevel;
        } else {
          selectedLevel = Phaser.Math.RND.pick(intermediateLevels);
        }
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
        const offsetX = currentRightDoor.absoluteX - leftDoorLocalX;
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
    rat.on("animationcomplete", (anim) => {
      if (anim.key === "rat_attack" && rat.getData("hp") > 0) {
        rat.setData("state", "pursue");
        rat.setData("lastAttackTime", this.time.now);
      }
    });
    this.physics.add.overlap(this.attackHitbox, rat, (hitbox, ratHit) => {
      if (ratHit.getData("hp") > 0) {
        ratHit.setData("hp", 0);
        ratHit.setTint(0xff0000);
        ratHit.setVelocityX(0);
        this.time.delayedCall(200, () => {
          ratHit.destroy();
        });
      }
    });
    this.physics.add.overlap(this.player, rat, (player, ratHit) => {
      if (ratHit.getData("hp") > 0 && !player.getData("isInvulnerable")) {
        this.takeDamage(20);
        player.setTint(0xff0000);
        player.setData("isInvulnerable", true);
        const knockbackDirection = player.x < ratHit.x ? -1 : 1;
        player.setVelocity(knockbackDirection * 200, -200);
        ratHit.setData("ignorePlayerUntil", this.time.now + 1000);
        this.time.delayedCall(1000, () => {
          player.clearTint();
          player.setData("isInvulnerable", false);
        });
      }
    });
    this.rats.add(rat);
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
    if (
      (this.keys.attack.isDown || this.input.activePointer.leftButtonDown()) &&
      !this.isAttacking &&
      !this.isRolling
    ) {
      if (this.player.getData("stamina") >= this.STAMINA_COST_ATTACK) {
        this.isAttacking = true;
        this.consumeStamina(this.STAMINA_COST_ATTACK);
        this.player.anims.play("attack", true);
      }
    }
    const isRollJustDown =
      Phaser.Input.Keyboard.JustDown(this.keys.roll) ||
      Phaser.Input.Keyboard.JustDown(this.keys.shift);
    if (
      isRollJustDown &&
      !this.isRolling &&
      !this.isAttacking &&
      this.player.body.touching.down
    ) {
      if (this.player.getData("stamina") >= this.STAMINA_COST_ROLL) {
        this.isRolling = true;
        this.consumeStamina(this.STAMINA_COST_ROLL);
        this.player.setData("isInvulnerable", true);
        this.player.anims.play("roll", true);
        const rollDirection = this.player.flipX ? -1 : 1;
        this.player.setVelocityX(rollDirection * 300);
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
    const onGround = this.player.body.touching.down || this.player.body.blocked.down;
    const isDown = this.cursors.down.isDown || this.keys.s.isDown;
    const isUp = this.cursors.up.isDown || this.keys.w.isDown;
    // UNBOUND W and UP from jump
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.space);

    let touchingRope = false;
    let ropeX = null;
    let ropeTop = null;
    
    const ROPE_ATTACH_RANGE_X = 8; // Adjustable horizontal attach range
    const ROPE_ATTACH_RANGE_Y = 0; // Removed fake extension, we use a real vault now
    const ROPE_VISUAL_OFFSET_RIGHT = -5; // Adjustable visual sprite shift when facing right on rope
    const ROPE_VISUAL_OFFSET_LEFT = 5;   // Adjustable visual sprite shift when facing left on rope
    const VAULT_THRESHOLD = 32;           // Adjustable pixels early to trigger top platform swoosh
    const VAULT_HEIGHT = 16;             // Vault height (1 tile)
    
    const pBody = this.player.body;
    let isVaulting = this.player.getData("isVaulting") || false;
    
    this.ground.getChildren().forEach((block) => {
      if (block.isRope) {
        const bBody = block.body;
        const inX = pBody.right > bBody.center.x - ROPE_ATTACH_RANGE_X && pBody.left < bBody.center.x + ROPE_ATTACH_RANGE_X;
        const inY = pBody.bottom > bBody.top - ROPE_ATTACH_RANGE_Y && pBody.top < bBody.bottom;
        
        if (inX && inY) {
            touchingRope = true;
            ropeX = block.x;
            const adjustedTop = bBody.top - ROPE_ATTACH_RANGE_Y;
            if (ropeTop === null || adjustedTop < ropeTop) {
                ropeTop = adjustedTop;
            }
        }
      }
    });

    let wasClimbing = this.player.getData("isClimbing") || false;
    let isClimbing = wasClimbing;

    if (!touchingRope || this.isAttacking || this.isRolling) {
      isClimbing = false;
    } else if ((isUp || (isDown && !onGround)) && !this.isAttacking && !this.isRolling && !isVaulting) {
      if (isUp && pBody.bottom <= ropeTop + 2) {
          // Standing exactly at the very top of the rope, do not grab
      } else {
          isClimbing = true;
      }
    }

    if (isClimbing && isUp && ropeTop !== null && !isVaulting) {
        // Vault earlier based on VAULT_THRESHOLD
        if (pBody.bottom <= ropeTop + VAULT_THRESHOLD) {
            isClimbing = false;
            this.player.setData("isVaulting", true);
            this.player.body.allowGravity = false;
            this.player.setVelocity(0, 0);
            
            // Calculate exact target Y so feet land perfectly on the platform (ropeTop - VAULT_HEIGHT)
            const targetY = this.player.y - (pBody.bottom - (ropeTop - VAULT_HEIGHT));
            
            this.tweens.add({
                targets: this.player,
                y: targetY,
                duration: 100, // Faster swoosh
                ease: 'Sine.easeOut',
                onComplete: () => {
                    this.player.setData("isVaulting", false);
                    this.player.body.allowGravity = true;
                }
            });
        }
    }

    this.player.setData("isClimbing", isClimbing);

    let isCrouching = false;
    if (isDown && onGround && !isClimbing && !this.isAttacking && !this.isRolling && !isVaulting) {
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
      if (ropeX !== null) {
          this.player.x = ropeX + (this.player.flipX ? ROPE_VISUAL_OFFSET_LEFT : ROPE_VISUAL_OFFSET_RIGHT);
      }
      
      if (isUp) {
        this.player.setVelocityY(-100);
      } else if (isDown && !onGround) {
        this.player.setVelocityY(100);
      } else {
        this.player.setVelocityY(0);
      }
    } else if (!isVaulting) {
      this.player.body.allowGravity = true;

      if (isCrouching) {
        this.player.setVelocityX(0);
      } else if (this.cursors.left.isDown || this.keys.a.isDown) {
        if (!this.isRolling) this.player.setFlipX(true);
        if (!this.isAttacking && !this.isRolling) {
          this.player.setVelocityX(-speed);
          isMoving = true;
        }
      } else if (this.cursors.right.isDown || this.keys.d.isDown) {
        if (!this.isRolling) this.player.setFlipX(false);
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
    } else if (this.isAttacking) {
      this.player.setVelocityX(0);
    }

    if (this.isAttacking) {
      this.attackHitbox.body.enable = true;
      if (this.player.flipX) {
        this.attackHitbox.x = this.player.x - 30;
      } else {
        this.attackHitbox.x = this.player.x + 30;
      }
      this.attackHitbox.y = this.player.y + 25;
    } else {
      this.attackHitbox.body.enable = false;
      this.attackHitbox.x = -1000;
      this.attackHitbox.y = -1000;
    }

    if (!this.isAttacking && !this.isRolling) {
      if (isVaulting) {
        if (this.player.anims.currentAnim?.key !== "idle") {
            this.player.anims.play("idle", true);
        }
      } else if (isClimbing) {
        this.player.anims.play("climb", true);
        if (this.player.body.velocity.y === 0) {
          this.player.anims.pause();
        } else {
          this.player.anims.resume();
        }
      } else {
        this.player.anims.resume();
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
            if (block.isPlatform) continue;
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
    let originOffset = 0;
    const attackShiftAmount = 0.19;
    const jumpShiftAmount = 0.06;
    if (currentAnim === "attack") {
      originOffset = attackShiftAmount;
    } else if (currentAnim === "jump") {
      originOffset = jumpShiftAmount;
    }
    const hitboxes = this.player.getData("hitboxes");
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
    const currentStateHash = `${currentHitboxKey}_${this.player.flipX}_${originOffset}`;
    const previousStateHash = this.player.getData("lastHitboxState");
    if (currentStateHash !== previousStateHash) {
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
