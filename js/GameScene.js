class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.spritesheet('hero_idle',   'Sprites/HERO_IDLE.png',   { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_run',    'Sprites/HERO_RUN.png',    { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_jump',   'Sprites/HERO_JUMP.png',   { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_roll',   'Sprites/HERO_ROLL.png',   { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_attack', 'Sprites/HERO_ATTACK.png', { frameWidth: 100, frameHeight: 100 });
    }

    create() {

        // ═══════════════════════════════════════════════════════════
        // ENEMY PLACEHOLDER TEXTURE (generated once, cached after restart)
        // ═══════════════════════════════════════════════════════════
        if (!this.textures.exists('enemy_placeholder')) {
            const eg = this.make.graphics({ add: false });
            eg.fillStyle(0xaa1111); eg.fillRect(0, 0, 36, 58);   // body
            eg.fillStyle(0xff4444); eg.fillRect(8,  2, 20, 18);  // head
            eg.fillStyle(0xffcc00); eg.fillRect(11, 6,  5,  5);  // eye L
            eg.fillStyle(0xffcc00); eg.fillRect(20, 6,  5,  5);  // eye R
            eg.generateTexture('enemy_placeholder', 36, 58);
            eg.destroy();
        }

        // ═══════════════════════════════════════════════════════════
        // ANIMATIONS
        // ═══════════════════════════════════════════════════════════
        [
            ['idle',   'hero_idle',    2, -1],
            ['run',    'hero_run',    12, -1],
            ['jump',   'hero_jump',   10,  0],
            ['roll',   'hero_roll',   15,  0],
            ['attack', 'hero_attack', 15,  0],
        ].forEach(([key, sheet, fps, repeat]) => {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(sheet),
                    frameRate: fps,
                    repeat
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // PLATFORMS
        // Layout: 6 platforms across 800×600 world
        //   [centerX, centerY, width, height, fillColor]
        // ═══════════════════════════════════════════════════════════
        const platformDefs = [
            [400, 578, 800, 44,  0x2d5a1e],  // ground floor (full width)
            [130, 462, 200, 18,  0x3a6e2a],  // left  low
            [670, 462, 200, 18,  0x3a6e2a],  // right low
            [400, 372, 220, 18,  0x4a7e3a],  // center mid  ← player spawns here
            [185, 278, 170, 18,  0x5a8e4a],  // left  high
            [615, 278, 170, 18,  0x5a8e4a],  // right high
        ];

        // StaticGroup so we get a single collider call for all platforms
        this.platforms = this.physics.add.staticGroup();
        platformDefs.forEach(([x, y, w, h, color]) => {
            const rect = this.add.rectangle(x, y, w, h, color);
            this.physics.add.existing(rect, true); // static body sized to rect
            this.platforms.add(rect);              // StaticGroup checks body exists first
        });

        // ═══════════════════════════════════════════════════════════
        // PLAYER  — spawned above center-mid platform
        // ═══════════════════════════════════════════════════════════
        this.player = this.physics.add.sprite(400, 310, 'hero_idle');
        this.player.body.setSize(40, 80);
        this.player.body.setOffset(30, 20);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // ═══════════════════════════════════════════════════════════
        // INPUT
        // ═══════════════════════════════════════════════════════════
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            w:      Phaser.Input.Keyboard.KeyCodes.W,
            a:      Phaser.Input.Keyboard.KeyCodes.A,
            s:      Phaser.Input.Keyboard.KeyCodes.S,
            d:      Phaser.Input.Keyboard.KeyCodes.D,
            space:  Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack: Phaser.Input.Keyboard.KeyCodes.Z,
            roll:   Phaser.Input.Keyboard.KeyCodes.X,
            shift:  Phaser.Input.Keyboard.KeyCodes.SHIFT,
            heal:   Phaser.Input.Keyboard.KeyCodes.E,
        });

        // ═══════════════════════════════════════════════════════════
        // PLAYER STATE
        // ═══════════════════════════════════════════════════════════
        this.isAttacking  = false;
        this.isRolling    = false;
        this.attackHasHit = false;
        this.isDead       = false;

        this.player.on('animationcomplete', (anim) => {
            if (anim.key === 'attack') {
                this.time.delayedCall(150, () => {
                    this.isAttacking  = false;
                    this.attackHasHit = false;
                });
            }
            if (anim.key === 'roll') {
                this.isRolling = false;
            }
        });

        // ═══════════════════════════════════════════════════════════
        // ENEMIES
        // Graphics object that redraws HP bars each frame in world space
        // ═══════════════════════════════════════════════════════════
        this.enemyGroup = this.physics.add.group();
        this.enemies    = [];
        this.enemyHpGfx = this.add.graphics().setDepth(10);

        // Each entry: [spawnX, spawnY, patrolLeft, patrolRight]
        //   patrolLeft/Right keep the enemy on its own platform
        [
            [130, 430, 40,  218],   // left  low platform
            [670, 430, 582, 758],   // right low platform
            [580, 540, 420, 754],   // ground, right half
        ].forEach(([sx, sy, pl, pr]) => this.spawnEnemy(sx, sy, pl, pr));

        this.physics.add.collider(this.enemyGroup, this.platforms);

        // Contact damage: player walks into an enemy
        this.physics.add.overlap(
            this.player, this.enemyGroup,
            this.onPlayerContactEnemy, null, this
        );

        // ═══════════════════════════════════════════════════════════
        // HEALTH & STAMINA
        // ═══════════════════════════════════════════════════════════
        this.maxHealth       = 100;
        this.currentHealth   = 100;
        this.maxStamina      = 100;
        this.currentStamina  = 100;
        this.healFlasks      = 3;

        // Stamina costs & rates
        this.STAMINA_ATTACK_COST = 20;
        this.STAMINA_ROLL_COST   = 25;
        this.STAMINA_RUN_DRAIN   = 10;   // per second while running on ground
        this.STAMINA_REGEN_RATE  = 30;   // per second
        this.STAMINA_REGEN_DELAY = 1200; // ms of inactivity before regen
        this.lastStaminaUse      = -9999;

        // Damage i-frames
        this.lastDamageTime      = -9999;
        this.INVINCIBLE_DURATION = 900;  // ms

        // Push initial values to shared registry (UIScene reads these)
        this.registry.set('maxHealth',  this.maxHealth);
        this.registry.set('maxStamina', this.maxStamina);
        this.registry.set('health',     this.currentHealth);
        this.registry.set('stamina',    this.currentStamina);
        this.registry.set('healFlasks', this.healFlasks);
        this.registry.set('playerDead', false);

        // ═══════════════════════════════════════════════════════════
        // CAMERA
        // ═══════════════════════════════════════════════════════════
        this.cameras.main.setZoom(2.5);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, 800, 600);

        // Launch HUD overlay (separate scene, no zoom)
        this.scene.launch('UIScene');
    }

    // ─────────────────────────────────────────────────────────────
    // SPAWN ENEMY
    // ─────────────────────────────────────────────────────────────
    spawnEnemy(x, y, patrolLeft, patrolRight) {
        const sprite = this.enemyGroup.create(x, y, 'enemy_placeholder');
        sprite.setCollideWorldBounds(true);
        sprite.body.setSize(30, 50);
        sprite.body.setOffset(3, 8);

        const data = {
            sprite,
            maxHp:           60,
            currentHp:       60,
            patrolLeft,
            patrolRight,
            direction:       1,          // 1 = right, -1 = left
            speed:           60,         // patrol speed
            chaseSpeed:      110,        // chase speed
            detectionRange:  260,        // horizontal pixel range to detect player
            sameLevelThresh: 88,         // max Y-distance to consider "same level"
            state:           'patrol',
            attackDamage:    10,         // damage per contact
            hitFlashTimer:   -9999,      // timestamp of last hit flash
        };

        sprite.enemyData = data;
        this.enemies.push(data);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────
    update(time, delta) {
        // Freeze everything on death
        if (this.isDead) return;

        const speed = 160;

        // ── ATTACK ────────────────────────────────────────────────
        if ((this.keys.attack.isDown || this.input.activePointer.leftButtonDown()) &&
            !this.isAttacking && !this.isRolling) {
            if (this.currentStamina >= this.STAMINA_ATTACK_COST) {
                this.isAttacking  = true;
                this.attackHasHit = false;
                this.currentStamina -= this.STAMINA_ATTACK_COST;
                this.lastStaminaUse  = time;
                this.player.anims.play('attack', true);
            }
        }

        // ── ROLL ──────────────────────────────────────────────────
        const rollJustDown = Phaser.Input.Keyboard.JustDown(this.keys.roll) ||
                             Phaser.Input.Keyboard.JustDown(this.keys.shift);
        if (rollJustDown && !this.isRolling && !this.isAttacking &&
            this.player.body.touching.down) {
            if (this.currentStamina >= this.STAMINA_ROLL_COST) {
                this.isRolling = true;
                this.currentStamina -= this.STAMINA_ROLL_COST;
                this.lastStaminaUse  = time;
                this.player.anims.play('roll', true);
                this.player.setVelocityX((this.player.flipX ? -1 : 1) * 300);
            }
        }

        // ── MOVEMENT & JUMP ───────────────────────────────────────
        let isMoving = false;
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        if (!this.isRolling) {
            if (this.cursors.left.isDown || this.keys.a.isDown) {
                this.player.setVelocityX(-speed);
                this.player.setFlipX(true);
                isMoving = true;
            } else if (this.cursors.right.isDown || this.keys.d.isDown) {
                this.player.setVelocityX(speed);
                this.player.setFlipX(false);
                isMoving = true;
            } else {
                this.player.setVelocityX(0);
            }

            // Jump is blocked while attacking
            if (!this.isAttacking &&
                (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.keys.w)     ||
                 Phaser.Input.Keyboard.JustDown(this.keys.space)) && onGround) {
                this.player.setVelocityY(-288);
            }
        }

        // ── ANIMATIONS ───────────────────────────────────────────
        if (!this.isAttacking && !this.isRolling) {
            if (!onGround)     this.player.anims.play('jump', true);
            else if (isMoving) this.player.anims.play('run',  true);
            else               this.player.anims.play('idle', true);
        }

        // ── SPRITE ALIGNMENT FIX ──────────────────────────────────
        const animKey      = this.player.anims.currentAnim?.key;
        const originOffset = animKey === 'attack' ? 0.19 : animKey === 'jump' ? 0.06 : 0;
        if (this.player.flipX) {
            this.player.setOrigin(0.5 + originOffset, 0.5);
            this.player.body.setOffset(30 + originOffset * 100, 20);
        } else {
            this.player.setOrigin(0.5 - originOffset, 0.5);
            this.player.body.setOffset(30 - originOffset * 100, 20);
        }

        // ── ATTACK HIT DETECTION ──────────────────────────────────
        if (this.isAttacking && !this.attackHasHit) {
            this.checkAttackHits(time);
        }

        // ── HEAL  (E) ─────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.keys.heal) &&
            this.healFlasks > 0 && this.currentHealth < this.maxHealth) {
            this.healFlasks--;
            this.currentHealth = Math.min(this.maxHealth, this.currentHealth + 30);
            this.registry.set('healFlasks', this.healFlasks);
        }

        // ── ENEMY AI + HP BARS ────────────────────────────────────
        this.enemyHpGfx.clear();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.updateEnemy(this.enemies[i], time);
        }

        // ── STAMINA DRAIN (running on ground) ─────────────────────
        if (isMoving && onGround && !this.isAttacking && !this.isRolling) {
            this.currentStamina -= this.STAMINA_RUN_DRAIN * (delta / 1000);
            this.lastStaminaUse  = time;
        }

        // ── STAMINA REGEN ─────────────────────────────────────────
        if (time - this.lastStaminaUse > this.STAMINA_REGEN_DELAY) {
            this.currentStamina += this.STAMINA_REGEN_RATE * (delta / 1000);
        }

        // ── CLAMP & SYNC TO UI ────────────────────────────────────
        this.currentStamina = Phaser.Math.Clamp(this.currentStamina, 0, this.maxStamina);
        this.currentHealth  = Phaser.Math.Clamp(this.currentHealth,  0, this.maxHealth);
        this.registry.set('stamina', this.currentStamina);
        this.registry.set('health',  this.currentHealth);

        // ── DEATH CHECK ───────────────────────────────────────────
        if (this.currentHealth <= 0 && !this.isDead) {
            this.isDead = true;
            this.player.setVelocityX(0);
            this.registry.set('playerDead', true);

            // Restart after YOU DIED screen shows for ~2.2 s
            this.time.delayedCall(2200, () => {
                this.registry.set('playerDead', false);
                this.scene.stop('UIScene');
                this.scene.restart();
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ENEMY AI
    // Enemy chases the player only when:
    //   1. Within horizontal detection range
    //   2. Player Y is within sameLevelThresh of the enemy Y
    //      (i.e. both standing on the same general platform level)
    // Enemy will NOT walk off its patrol bounds to chase.
    // ─────────────────────────────────────────────────────────────
    updateEnemy(enemy, time) {
        const s = enemy.sprite;
        if (!s || !s.active) return;

        const dx    = this.player.x - s.x;
        const dyAbs = Math.abs(this.player.y - s.y);

        const inRange = Math.abs(dx) < enemy.detectionRange;
        const sameLvl = dyAbs < enemy.sameLevelThresh;

        // State: chase only when player is close AND on the same level
        enemy.state = (inRange && sameLvl) ? 'chase' : 'patrol';

        if (enemy.state === 'chase') {
            const dir    = dx > 0 ? 1 : -1;
            // Stop at platform edge — enemy won't jump off to keep chasing
            const atEdge = (dir < 0 && s.x <= enemy.patrolLeft) ||
                           (dir > 0 && s.x >= enemy.patrolRight);
            s.setVelocityX(atEdge ? 0 : dir * enemy.chaseSpeed);
            s.setFlipX(dir < 0);
        } else {
            // Patrol: bounce back and forth within platform bounds
            s.setVelocityX(enemy.direction * enemy.speed);
            s.setFlipX(enemy.direction < 0);
            if (s.x <= enemy.patrolLeft)  enemy.direction =  1;
            if (s.x >= enemy.patrolRight) enemy.direction = -1;
        }

        // ── Draw HP bar above enemy in world space ─────────────────
        const pct = Phaser.Math.Clamp(enemy.currentHp / enemy.maxHp, 0, 1);
        const bx  = s.x - 18;
        const by  = s.y - 42;
        this.enemyHpGfx.fillStyle(0x330000, 1);
        this.enemyHpGfx.fillRect(bx, by, 36, 5);
        if (pct > 0) {
            this.enemyHpGfx.fillStyle(0xff2200, 1);
            this.enemyHpGfx.fillRect(bx, by, 36 * pct, 5);
        }

        // ── Tint: white flash on hit, then reddening as HP drops ───
        if (time - enemy.hitFlashTimer < 100) {
            s.setTint(0xffffff);
        } else {
            const g = Math.floor(Phaser.Math.Clamp(pct, 0, 1) * 0x22);
            s.setTint(Phaser.Display.Color.GetColor(0xff, g, g));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ATTACK HIT CHECK
    // Projects a hitbox in the direction the player is facing.
    // Only fires once per attack swing (attackHasHit flag).
    // ─────────────────────────────────────────────────────────────
    checkAttackHits(time) {
        const dir    = this.player.flipX ? -1 : 1;
        const hitX   = this.player.x + dir * 38; // hitbox center
        const rangeX = 72;
        const rangeY = 52;

        this.enemies.forEach(enemy => {
            if (!enemy.sprite.active) return;
            const inX = Math.abs(enemy.sprite.x - hitX)        < rangeX;
            const inY = Math.abs(enemy.sprite.y - this.player.y) < rangeY;

            if (inX && inY) {
                this.attackHasHit    = true;
                enemy.currentHp     -= 30;
                enemy.hitFlashTimer  = time;

                if (enemy.currentHp <= 0) {
                    enemy.sprite.destroy();
                    this.enemies = this.enemies.filter(e => e !== enemy);
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // PLAYER CONTACT DAMAGE
    // Called when player overlaps an enemy body.
    // Has an invincibility window so damage doesn't spam.
    // ─────────────────────────────────────────────────────────────
    onPlayerContactEnemy(player, enemySprite) {
        const now   = this.time.now;
        const enemy = enemySprite.enemyData;
        if (!enemy) return;
        if (now - this.lastDamageTime < this.INVINCIBLE_DURATION) return;

        this.lastDamageTime  = now;
        this.currentHealth  -= enemy.attackDamage;

        // Flashing i-frame effect
        this.tweens.add({
            targets:  this.player,
            alpha:    0.2,
            duration: 65,
            yoyo:     true,
            repeat:   6,
            onComplete: () => { this.player.setAlpha(1); }
        });

        // Knockback: push player away from enemy
        const kDir = player.x >= enemySprite.x ? 1 : -1;
        player.setVelocityX(kDir * 230);
        player.setVelocityY(-145);
    }
}
