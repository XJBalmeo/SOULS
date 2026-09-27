class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load the spritesheets
        this.load.spritesheet('hero_idle', 'Sprites/HERO/HERO_IDLE.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_run', 'Sprites/HERO/HERO_RUN.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_jump', 'Sprites/HERO/HERO_JUMP.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_roll', 'Sprites/HERO/HERO_ROLL.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_attack', 'Sprites/HERO/HERO_ATTACK.png', { frameWidth: 100, frameHeight: 100 });
        
        // Load enemies
        this.load.spritesheet('rat_walk', 'Sprites/ENEMIES/FAMINE/RAT_WALK.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('rat_run', 'Sprites/ENEMIES/FAMINE/RAT_RUN.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('rat_attack', 'Sprites/ENEMIES/FAMINE/RAT_ATTACK.png', { frameWidth: 100, frameHeight: 100 });
        
        // Load LDtk Level
        this.load.json('famine_ldtk', 'levels/famine/FAMINE.ldtk?v=' + Date.now());
        this.load.spritesheet('famine_tiles', 'levels/famine/TILES_LEVEL1.png?v=' + Date.now(), { frameWidth: 32, frameHeight: 32 });
        this.load.image('famine_far_bg', 'levels/famine/FARBACKGROUND_LEVEL1.png?v=' + Date.now());

        // Load HUD
        this.load.image('hud_bar', 'sprites/HERO/HEALTH_BAR.png?v=' + Date.now());
        this.load.image('hud_hp', 'sprites/HERO/HEALTH.png?v=' + Date.now());
        this.load.image('hud_delay', 'sprites/HERO/DELAY.png?v=' + Date.now());
        this.load.image('hud_stamina', 'sprites/HERO/STAMINA.png?v=' + Date.now());
    }

    create() {
        // --- Create Animations ---
        // Idle
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('hero_idle'),
            frameRate: 1000 / 500, // 500ms per frame = 2 FPS
            repeat: -1
        });

        // Run
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('hero_run'),
            frameRate: 12,
            repeat: -1
        });

        // Jump
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('hero_jump'),
            frameRate: 10, // 100ms per frame (finishes a bit before landing, holding the last frame to look less abrupt)
            repeat: 0 
        });

        // Roll
        this.anims.create({
            key: 'roll',
            frames: this.anims.generateFrameNumbers('hero_roll'),
            frameRate: 15,
            repeat: 0 // Play once
        });

        // Attack
        this.anims.create({
            key: 'attack',
            frames: this.anims.generateFrameNumbers('hero_attack'),
            frameRate: 15,
            repeat: 0 // Play once
        });


        // --- Load LDtk Level ---
        const ldtkData = this.cache.json.get('famine_ldtk');
        const level = ldtkData.levels[0];
        
        const tilesLayer = level.layerInstances.find(l => l.__identifier === 'Tiles');
        const bgLayer = level.layerInstances.find(l => l.__identifier === 'Background');
        const collisionLayer = level.layerInstances.find(l => l.__identifier === 'Collision');
        const spawnsLayer = level.layerInstances.find(l => l.__identifier === 'Spawns');

        this.ground = this.physics.add.staticGroup();
        const gridSize = 32;

        // 0. Far Background (Parallax Tiling Sprite)
        // Make it massively oversized (8000x8000) and pin it to the camera (scrollFactor 0) 
        // to guarantee it never physically ends or cuts off on large monitors!
        this.farBg = this.add.tileSprite(0, 0, 8000, 8000, 'famine_far_bg');
        this.farBg.setOrigin(0, 0);
        this.farBg.setScrollFactor(0); 
        this.farBg.setDepth(-10); // Ensure it's rendered behind everything
        
        // Reverted to 1.0 because zooming out (0.5) caused the image to become too short 
        // vertically, resulting in the ugly "vertical repetition" seam on larger monitors!
        this.farBg.tileScaleX = 1.0;
        this.farBg.tileScaleY = 1.0;

        // 1. Collisions (With Edge Filtering to prevent ghost collisions / stuttering)
        const cWidth = collisionLayer.__cWid;
        const gridData = collisionLayer.intGridCsv;
        for (let i = 0; i < gridData.length; i++) {
            const val = gridData[i];
            if (val === 1 || val === 2) { 
                const isDented = (val === 2);
                
                let w = gridSize;
                let h = gridSize;
                let bx = (i % cWidth) * gridSize;
                let by = Math.floor(i / cWidth) * gridSize;

                // Consider both 1 and 2 as solid for neighbor checks
                const hasTop = (i - cWidth >= 0) && gridData[i - cWidth] !== 0;
                const hasBottom = (i + cWidth < gridData.length) && gridData[i + cWidth] !== 0;
                const hasLeft = (i % cWidth > 0) && gridData[i - 1] !== 0;
                const hasRight = (i % cWidth < cWidth - 1) && gridData[i + 1] !== 0;
                
                // Dent the block by 2 pixels on exposed edges
                if (isDented) {
                    if (!hasTop) { by += 2; h -= 2; }
                    if (!hasBottom) { h -= 2; }
                    if (!hasLeft) { bx += 2; w -= 2; }
                    if (!hasRight) { w -= 2; }
                }

                const cx = bx + (w / 2);
                const cy = by + (h / 2);
                
                const block = this.add.rectangle(cx, cy, w, h, 0x000000, 0);
                this.physics.add.existing(block, true);
                
                // --- Edge Filtering ---
                block.body.checkCollision.up = !hasTop;
                block.body.checkCollision.down = !hasBottom;
                block.body.checkCollision.left = !hasLeft;
                block.body.checkCollision.right = !hasRight;

                this.ground.add(block);
            }
        }

        // 2. Tiles (Foreground Layer)
        tilesLayer.gridTiles.forEach(tile => {
            const img = this.add.image(tile.px[0] + 16, tile.px[1] + 16, 'famine_tiles', tile.t);
            // Place the tiles AT A HIGHER DEPTH so the player and rat render BEHIND them!
            img.setDepth(10);
            // LDtk flip flags: 1 = flipX, 2 = flipY, 3 = both
            if (tile.f === 1 || tile.f === 3) img.setFlipX(true);
            if (tile.f === 2 || tile.f === 3) img.setFlipY(true);
        });

        // 3. Spawns
        let playerX = 400, playerY = 300;
        this.ratSpawns = [];
        spawnsLayer.entityInstances.forEach(ent => {
            // Align the center X of the 100x100 sprite with the center X of the 32x32 entity.
            const spawnX = ent.px[0] + (ent.width / 2);
            // Align the BOTTOM of the 100x100 sprite with the BOTTOM of the 32x32 entity.
            // Since x,y are the center of the sprite, we subtract 50 (half of 100).
            const spawnY = (ent.px[1] + ent.height) - 50;
            
            if (ent.__identifier === 'PlayerStart') {
                playerX = spawnX;
                playerY = spawnY;
            } else if (ent.__identifier === 'Rat') {
                this.ratSpawns.push({ x: spawnX, y: spawnY });
            }
        });

        // --- Create Player ---
        this.player = this.physics.add.sprite(playerX, playerY, 'hero_idle');
        
        // Define specific hitboxes (width, height, offsetX, offsetY) for each animation!
        // This allows your character's physical body to change shape when running, rolling, etc.
        this.player.setData('hitboxes', {
            'idle':   { w: 10, h: 50, x: 50, y: 50 },
            'run':    { w: 30, h: 40, x: 30, y: 60 },
            'jump':   { w: 10, h: 40, x: 50, y: 50 },
            'roll':   { w: 30, h: 40, x: 30, y: 60 }, // Example: make w/h smaller for rolling
            'attack': { w: 30, h: 40, x: 35, y: 60 }
        });
        
        // Set initial hitbox
        this.player.body.setSize(10, 50); 
        this.player.body.setOffset(50, 50); 
        this.physics.add.collider(this.player, this.ground);

        // --- Create Attack Hitbox ---
        // A visible red semi-transparent rectangle so you can see your attack hitbox!
        this.attackHitbox = this.add.rectangle(0, 0, 70, 50, 0xff0000, 0.5);
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.allowGravity = false;
        this.attackHitbox.body.enable = false; // Disabled by default

        // --- Create Enemy (Rat) ---
        this.anims.create({
            key: 'rat_walk',
            frames: this.anims.generateFrameNumbers('rat_walk'),
            frameRate: 10,
            repeat: -1
        });
        
        this.anims.create({
            key: 'rat_run',
            frames: this.anims.generateFrameNumbers('rat_run'),
            frameRate: 15,
            repeat: -1
        });
        
        this.anims.create({
            key: 'rat_attack',
            frames: this.anims.generateFrameNumbers('rat_attack'),
            frameRate: 12,
            repeat: 0
        });

        // Spawn rat from LDtk
        if (this.ratSpawns.length > 0) {
            this.spawnRat(this.ratSpawns[0].x, this.ratSpawns[0].y, true);
        } else {
            this.spawnRat(600, 300, true);
        }

        // --- Default Hide Hitboxes ---
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear();
        if (this.attackHitbox) this.attackHitbox.setVisible(false);

        // --- Toggle Hitboxes (TAB Key) ---
        this.input.keyboard.on('keydown-TAB', (event) => {
            event.preventDefault(); // Prevent browser from tabbing out of the game
            if (this.physics.world.drawDebug) {
                this.physics.world.drawDebug = false;
                this.physics.world.debugGraphic.clear();
                if (this.attackHitbox) this.attackHitbox.setVisible(false);
            } else {
                this.physics.world.drawDebug = true;
                if (this.attackHitbox) this.attackHitbox.setVisible(true);
            }
        });

        // --- Input Setup ---
        this.cursors = this.input.keyboard.createCursorKeys();
        // Add WASD keys + Shift + Z/X
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack: Phaser.Input.Keyboard.KeyCodes.Z,
            roll: Phaser.Input.Keyboard.KeyCodes.X,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

        // Player state variables
        this.isAttacking = false;
        this.isRolling = false;

        // Listen for animation complete events to transition states back to idle/run
        this.player.on('animationcomplete', (anim) => {
            if (anim.key === 'attack') {
                // Add a small 150ms "recovery" delay before snapping back to idle.
                // This makes the attack feel weightier and less abrupt.
                this.time.delayedCall(150, () => {
                    this.isAttacking = false;
                });
            }
            if (anim.key === 'roll') {
                this.isRolling = false;
                this.player.setData('isInvulnerable', false); // End roll iframes
            }
        });

        // --- HUD Setup ---
        // Because the camera is zoomed 2.5x on a 1280x720 canvas, the true visible top-left corner 
        // is pushed inwards to X:384, Y:216. We add 10px of padding so it sits perfectly in the top-left!
        const HUD_X = 384 + 10;
        const HUD_Y = 216 + 10;
        
        // These control the exact pixel offset of the inner bars relative to the HUD frame!
        // Adjust these to visually align them perfectly with your frame's transparent window.
        const HP_OFFSET_X = 30;
        const HP_OFFSET_Y = 9;
        const STAM_OFFSET_X = 30;
        const STAM_OFFSET_Y = 17;

        // Draw background frame first
        this.hudBar = this.add.image(HUD_X, HUD_Y, 'hud_bar').setOrigin(0, 0).setScrollFactor(0).setDepth(1000);
        
        // Draw the delay bars BEHIND the HP/Stamina bars (depth 1001)
        this.hudDelay = this.add.image(HUD_X + HP_OFFSET_X, HUD_Y + HP_OFFSET_Y, 'hud_delay').setOrigin(0, 0).setScrollFactor(0).setDepth(1001);
        this.hudStamDelay = this.add.image(HUD_X + STAM_OFFSET_X, HUD_Y + STAM_OFFSET_Y, 'hud_delay').setOrigin(0, 0).setScrollFactor(0).setDepth(1001);

        // Draw the inner bars on top (depth 1002). Origin 0,0 means they scale/stretch from the left edge towards the right.
        this.hudHp = this.add.image(HUD_X + HP_OFFSET_X, HUD_Y + HP_OFFSET_Y, 'hud_hp').setOrigin(0, 0).setScrollFactor(0).setDepth(1002);
        this.hudStamina = this.add.image(HUD_X + STAM_OFFSET_X, HUD_Y + STAM_OFFSET_Y, 'hud_stamina').setOrigin(0, 0).setScrollFactor(0).setDepth(1002);

        // Define Player Stats for the HUD
        this.player.setData('maxHp', 100);
        this.player.setData('hp', 100);
        this.player.setData('maxStamina', 100);
        this.player.setData('stamina', 100);

        // --- Gameplay Constants ---
        this.STAMINA_COST_ATTACK = 15;
        this.STAMINA_COST_ROLL = 25;
        this.STAMINA_REGEN = 20; // Stamina recovered per second
        this.HUD_MAX_WIDTH = 124; // Keeping the user's tweaked width accessible class-wide
        
        // Initialize delay bar display widths
        this.hudDelay.displayWidth = this.HUD_MAX_WIDTH;
        this.hudStamDelay.displayWidth = this.HUD_MAX_WIDTH;

        // --- Camera Setup ---
        // Zoom in by 2.5x
        this.cameras.main.setZoom(2.5); 
        
        // Make the camera follow the player so they don't walk off the zoomed-in screen
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); 
        
        // Prevent the camera from panning outside the LDtk level bounds
        this.cameras.main.setBounds(0, 0, level.pxWid, level.pxHei);
        this.physics.world.setBounds(0, 0, level.pxWid, level.pxHei);
        
        this.player.setCollideWorldBounds(true); // Don't let player walk off screen
        
        // Start the scene paused if not in fullscreen!
        if (!document.fullscreenElement) {
            this.scene.pause();
        }
    }

    spawnRat(x, y, faceRight) {
        this.rat = this.physics.add.sprite(x, y, 'rat_walk');
        this.rat.setScale(1);
        
        this.rat.setData('baseSize', { w: 25, h: 10 });
        this.rat.setData('baseOffset', { x: 45, y: 90 });
        this.rat.body.setSize(25, 10); 
        this.rat.body.setOffset(45, 90);
        
        this.rat.setCollideWorldBounds(true);
        this.physics.add.collider(this.rat, this.ground);
        this.rat.anims.play('rat_walk', true);
        
        if (faceRight) {
            this.rat.setVelocityX(50);
            this.rat.setFlipX(false);
        } else {
            this.rat.setVelocityX(-50);
            this.rat.setFlipX(true);
        }

        this.rat.setData('hp', 1);
        
        // --- Rat AI State ---
        this.rat.setData('state', 'patrol');
        this.rat.setData('visionRange', 300);
        this.rat.setData('attackRange', 50);
        this.rat.setData('attackCooldown', 2000);
        this.rat.setData('lastAttackTime', 0);
        
        this.rat.on('animationcomplete', (anim) => {
            if (anim.key === 'rat_attack' && this.rat.getData('hp') > 0) {
                this.rat.setData('state', 'pursue');
                this.rat.setData('lastAttackTime', this.time.now);
            }
        });

        // --- Combat Collisions for this specific Rat ---
        this.physics.add.overlap(this.attackHitbox, this.rat, (hitbox, rat) => {
            if (rat.getData('hp') > 0) {
                rat.setData('hp', 0);
                rat.setTint(0xff0000);
                rat.setVelocityX(0);
                this.time.delayedCall(200, () => {
                    rat.destroy();
                });
            }
        });

        this.physics.add.overlap(this.player, this.rat, (player, rat) => {
            if (rat.getData('hp') > 0 && !player.getData('isInvulnerable')) {
                
                this.takeDamage(20); // Deal 20 damage to player
                
                player.setTint(0xff0000);
                player.setData('isInvulnerable', true);
                
                const knockbackDirection = player.x < rat.x ? -1 : 1;
                player.setVelocity(knockbackDirection * 200, -200);
                
                rat.setData('ignorePlayerUntil', this.time.now + 1000);

                this.time.delayedCall(1000, () => {
                    player.clearTint();
                    player.setData('isInvulnerable', false);
                });
            }
        });
    }

    takeDamage(amount) {
        if (this.player.getData('hp') <= 0) return;
        
        const currentHp = this.player.getData('hp');
        const newHp = Math.max(0, currentHp - amount);
        this.player.setData('hp', newHp);
        
        // Kill existing delay tween if player is hit again during the delay
        if (this.hpDelayTween) {
            this.hpDelayTween.stop();
        }
        
        // Instantly snap the delay bar to what the HP WAS before taking damage
        this.hudDelay.displayWidth = (currentHp / this.player.getData('maxHp')) * this.HUD_MAX_WIDTH;

        // Tween the delay bar down to match the new HP after 0.5s wait
        const targetWidth = (newHp / this.player.getData('maxHp')) * this.HUD_MAX_WIDTH;
        this.hpDelayTween = this.tweens.add({
            targets: this.hudDelay,
            displayWidth: targetWidth,
            delay: 500, // 0.5 seconds wait
            duration: 300, // 0.3 seconds shrink time
            ease: 'Sine.easeInOut'
        });
    }

    consumeStamina(amount) {
        const currentStam = this.player.getData('stamina');
        const newStam = Math.max(0, currentStam - amount);
        this.player.setData('stamina', newStam);
        this.player.setData('staminaRegenDelayUntil', this.time.now + 800);
        
        // Kill existing delay tween if stamina is consumed again during the delay
        if (this.stamDelayTween) {
            this.stamDelayTween.stop();
        }
        
        // Instantly snap the delay bar to what the Stamina WAS before consuming
        this.hudStamDelay.displayWidth = (currentStam / this.player.getData('maxStamina')) * this.HUD_MAX_WIDTH;
        
        // Tween the delay bar down to match the new Stamina after 0.5s wait
        const targetWidth = (newStam / this.player.getData('maxStamina')) * this.HUD_MAX_WIDTH;
        this.stamDelayTween = this.tweens.add({
            targets: this.hudStamDelay,
            displayWidth: targetWidth,
            delay: 500, // 0.5 seconds wait
            duration: 300, // 0.3 seconds shrink time
            ease: 'Sine.easeInOut'
        });
    }

    update(time, delta) {
        const speed = 160;

        // --- Update HUD Bars ---
        if (this.hudHp && this.hudStamina) {
            // Edit this max width (in pixels) so the filled bar exactly fits your UI frame
            const MAX_BAR_WIDTH = 124; 
            
            const hpRatio = this.player.getData('hp') / this.player.getData('maxHp');
            const stamRatio = this.player.getData('stamina') / this.player.getData('maxStamina');
            
            // displayWidth physically stretches the 4x1 image to match the desired width
            this.hudHp.displayWidth = Math.max(0, hpRatio * MAX_BAR_WIDTH);
            this.hudStamina.displayWidth = Math.max(0, stamRatio * MAX_BAR_WIDTH);
        }

        // --- Parallax Background ---
        if (this.farBg) {
            this.farBg.tilePositionX = this.cameras.main.scrollX * 0.2;
            
            // Apply a vertical offset to visually "lower" the background on the screen.
            // Negative values push the texture down.
            const verticalOffset = -110; 
            this.farBg.tilePositionY = (this.cameras.main.scrollY * 0.2) + verticalOffset;
        }

        // --- Handle Attack Input ---
        if ((this.keys.attack.isDown || this.input.activePointer.leftButtonDown()) && !this.isAttacking && !this.isRolling) {
            if (this.player.getData('stamina') >= this.STAMINA_COST_ATTACK) {
                this.isAttacking = true;
                this.consumeStamina(this.STAMINA_COST_ATTACK);
                this.player.anims.play('attack', true);
            }
        }

        // --- Handle Roll Input ---
        const isRollJustDown = Phaser.Input.Keyboard.JustDown(this.keys.roll) || Phaser.Input.Keyboard.JustDown(this.keys.shift);
        if (isRollJustDown && !this.isRolling && !this.isAttacking && this.player.body.touching.down) {
            if (this.player.getData('stamina') >= this.STAMINA_COST_ROLL) {
                this.isRolling = true;
                this.consumeStamina(this.STAMINA_COST_ROLL);
                this.player.setData('isInvulnerable', true); // Start roll iframes!
                this.player.anims.play('roll', true);
                const rollDirection = this.player.flipX ? -1 : 1;
                this.player.setVelocityX(rollDirection * 300);
            }
        }
        
        // --- Handle Stamina Regeneration ---
        const regenDelayUntil = this.player.getData('staminaRegenDelayUntil') || 0;
        if (!this.isAttacking && !this.isRolling && time >= regenDelayUntil) {
            const currentStam = this.player.getData('stamina');
            const maxStam = this.player.getData('maxStamina');
            if (currentStam < maxStam) {
                // Regenerate based on time passed to ensure smooth framerate-independent recovery
                const newStam = Math.min(maxStam, currentStam + (this.STAMINA_REGEN * (delta / 1000)));
                this.player.setData('stamina', newStam);
            }
        }

        // --- Handle Movement & Jump Input ---
        let isMoving = false;
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        // Allow changing facing direction even while attacking!
        if (this.cursors.left.isDown || this.keys.a.isDown) {
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

        if (!this.isAttacking && !this.isRolling) {
            if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.space)) && onGround) {
                this.player.setVelocityY(-288);
            }
        } else if (this.isAttacking) {
            // Stop moving if attacking
            this.player.setVelocityX(0);
        }

        // --- Update Attack Hitbox ---
        if (this.isAttacking) {
            this.attackHitbox.body.enable = true;
            // Position the hitbox in front of the player
            if (this.player.flipX) {
                this.attackHitbox.x = this.player.x - 30; // 30 pixels to the left
            } else {
                this.attackHitbox.x = this.player.x + 30; // 30 pixels to the right
            }
            this.attackHitbox.y = this.player.y + 25;
        } else {
            this.attackHitbox.body.enable = false;
            // Move it offscreen when not attacking just to be safe
            this.attackHitbox.x = -1000; 
            this.attackHitbox.y = -1000;
        }

        // --- Handle Animations ---
        if (!this.isAttacking && !this.isRolling) {
            if (!onGround) {
                this.player.anims.play('jump', true);
            } else {
                if (isMoving) {
                    this.player.anims.play('run', true);
                } else {
                    this.player.anims.play('idle', true);
                }
            }
        }

        // --- Rat AI & Hitbox Flipping ---
        if (this.rat && this.rat.active && this.rat.getData('hp') > 0) {
            const state = this.rat.getData('state');
            const vision = this.rat.getData('visionRange');
            const attackRange = this.rat.getData('attackRange');
            const attackCooldown = this.rat.getData('attackCooldown');
            const lastAttack = this.rat.getData('lastAttackTime');
            const now = this.time.now;
            
            const distToPlayer = Phaser.Math.Distance.Between(this.rat.x, this.rat.y, this.player.x, this.player.y);
            const playerInFront = this.rat.flipX ? (this.player.x < this.rat.x) : (this.player.x > this.rat.x);

            if (state === 'patrol') {
                // The rat spots you if you are in its front cone of vision,
                // OR if you physically bump into its back (distToPlayer <= 20)!
                if ((distToPlayer <= vision && playerInFront) || distToPlayer <= 20) {
                    this.rat.setData('state', 'pursue');
                } else {
                    if (this.rat.body.blocked.left) {
                        this.rat.setVelocityX(50);
                        this.rat.setFlipX(false);
                    } else if (this.rat.body.blocked.right) {
                        this.rat.setVelocityX(-50);
                        this.rat.setFlipX(true);
                    }
                    if (this.rat.anims.currentAnim?.key !== 'rat_walk') this.rat.anims.play('rat_walk', true);
                }
            } else if (state === 'pursue') {
                const ignoreUntil = this.rat.getData('ignorePlayerUntil') || 0;
                const isIgnoring = now < ignoreUntil;

                if (!isIgnoring && distToPlayer <= attackRange && now - lastAttack >= attackCooldown) {
                    // --- START ATTACK ---
                    this.rat.setVelocityX(0); // Stop just for a frame to reset momentum
                    this.rat.setData('state', 'attack');
                    this.rat.setData('lastAttackTime', now);
                    this.rat.anims.play('rat_attack', true);
                    
                    // Apply the lunge physics ONCE here!
                    const dir = this.player.x < this.rat.x ? -1 : 1;
                    this.rat.setVelocity(dir * 250, -200); // Leap forward and UP into the air!
                } else {
                    // Relentlessly pursue!
                    if (!isIgnoring && distToPlayer <= 15) {
                        // We are in the tiny deadzone (practically inside the player).
                        // Do NOTHING to the velocity or direction! This lets the rat coast 
                        // through smoothly for 1 frame before the physics engine registers 
                        // the hit and triggers the ignore state, eliminating the 1-frame stop!
                    } else {
                        // If ignoring, keep running in the current direction. Otherwise, steer towards player.
                        const dir = isIgnoring ? (this.rat.flipX ? -1 : 1) : (this.player.x < this.rat.x ? -1 : 1);
                        this.rat.setFlipX(dir === -1);
                        this.rat.setVelocityX(dir * 120);
                    }
                    
                    if (this.rat.anims.currentAnim?.key !== 'rat_run') this.rat.anims.play('rat_run', true);
                }
            } else if (state === 'attack') {
                // We let gravity and momentum carry the leap!
            }

            this.rat.setOrigin(0.5, 0.5); // Reset back to normal

            // Flip rat hitbox dynamically
            const rBase = this.rat.getData('baseOffset');
            const rSize = this.rat.getData('baseSize');
            if (this.rat.flipX) {
                this.rat.body.setOffset(100 - (rBase.x + rSize.w), rBase.y);
            } else {
                this.rat.body.setOffset(rBase.x, rBase.y);
            }
        }

        // --- Fix Visual Sprite Misalignment & Player Hitbox Flipping ---
        // This is now guaranteed to run AFTER all animations for the frame have been decided!
        const currentAnim = this.player.anims.currentAnim?.key;
        let originOffset = 0; 
        
        const attackShiftAmount = 0.19; // User value
        const jumpShiftAmount = 0.06;  // User value

        if (currentAnim === 'attack') {
            originOffset = attackShiftAmount;
        } else if (currentAnim === 'jump') {
            originOffset = jumpShiftAmount;
        }
        
        // --- Delayed Hitbox Transition Logic ---
        const hitboxes = this.player.getData('hitboxes');
        let targetHitboxKey = currentAnim || 'idle';
        
        // PREDICTIVE LANDING: If falling and close to the ground, switch to idle hitbox early!
        // This prevents the feet-clipping glitch while letting you keep your custom jump hitbox.
        if (targetHitboxKey === 'jump' && this.player.body.velocity.y > 0) {
            // Check if there is ground 35 pixels below the player
            // This window must be LARGER than the 10-pixel hitbox size difference 
            // plus the player's maximum fall speed per frame, otherwise the hitbox 
            // will violently embed into the ground and stutter when snapping!
            // IMPORTANT: includeDynamic=true, includeStatic=true!
            const bodiesBelow = this.physics.overlapRect(this.player.x - 5, this.player.body.bottom, 10, 35, true, true);
            const isGroundBelow = bodiesBelow.some(b => b.gameObject && this.ground.contains(b.gameObject));
            
            if (isGroundBelow) {
                targetHitboxKey = 'idle';
            }
        }

        let currentHitboxKey = this.player.getData('currentHitboxKey') || 'idle';
        
        // This is the adjustable delay (in milliseconds). 2000ms = 2 seconds.
        const hitboxTransitionDelay = 100; 

        if (targetHitboxKey !== currentHitboxKey) {
            const needsDelay = currentHitboxKey === 'idle' && (targetHitboxKey === 'run' || targetHitboxKey === 'attack');
            
            if (needsDelay) {
                let timer = this.player.getData('hitboxTimer') || 0;
                if (timer === 0) {
                    // Start timer
                    this.player.setData('hitboxTimer', this.time.now + hitboxTransitionDelay);
                } else if (this.time.now >= timer) {
                    // Timer finished
                    currentHitboxKey = targetHitboxKey;
                    this.player.setData('currentHitboxKey', currentHitboxKey);
                    this.player.setData('hitboxTimer', 0);
                }
            } else {
                // Instant transition for all other states (like falling, jumping, etc)
                currentHitboxKey = targetHitboxKey;
                this.player.setData('currentHitboxKey', currentHitboxKey);
                this.player.setData('hitboxTimer', 0);
            }
        } else {
            // If they cancel the action before the timer finishes, reset the timer
            this.player.setData('hitboxTimer', 0);
        }

        const pBox = hitboxes[currentHitboxKey] || hitboxes['idle'];
        
        // Cache the state so we ONLY update the physics body when something actually changes.
        // Calling setSize() every frame breaks Phaser's collision resting state and causes sinking!
        const currentStateHash = `${currentHitboxKey}_${this.player.flipX}_${originOffset}`;
        const previousStateHash = this.player.getData('lastHitboxState');

        if (currentStateHash !== previousStateHash) {
            this.player.setData('lastHitboxState', currentStateHash);

            // Update the body size dynamically!
            this.player.body.setSize(pBox.w, pBox.h);

            if (this.player.flipX) {
                this.player.setOrigin(0.5 + originOffset, 0.5);
                // Flip the base X offset, then apply the visual shift logic
                const flippedX = 100 - (pBox.x + pBox.w);
                this.player.body.setOffset(flippedX + (originOffset * 100), pBox.y);
            } else {
                this.player.setOrigin(0.5 - originOffset, 0.5);
                this.player.body.setOffset(pBox.x - (originOffset * 100), pBox.y);
            }
        }
    }
}
