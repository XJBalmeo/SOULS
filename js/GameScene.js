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


        // --- Create Player ---
        this.player = this.physics.add.sprite(400, 300, 'hero_idle');
        
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

        this.player.setCollideWorldBounds(true); // Don't let player walk off screen
        
        // Add a simple ground platform so the player doesn't fall endlessly
        const ground = this.add.rectangle(400, 550, 800, 50, 0x00aa00);
        this.physics.add.existing(ground, true); // true = static body
        this.physics.add.collider(this.player, ground);

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

        this.ground = ground; // Save reference for spawnRat

        this.spawnRat(600, 300, true); // true = face right

        // --- HTML Button to Spawn Rat ---
        const btn = document.getElementById('spawnRatBtn');
        if (btn) {
            // We use an arrow function so 'this' still refers to the GameScene
            btn.onclick = () => {
                if (this.rat) this.rat.destroy();
                this.spawnRat(600, 300, true);
            };
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

        // --- Camera Setup ---
        // Zoom in by 2.5x
        this.cameras.main.setZoom(2.5); 
        
        // Make the camera follow the player so they don't walk off the zoomed-in screen
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // The 0.08 adds a smooth lerp
        
        // Prevent the camera from panning outside the 800x600 game world
        this.cameras.main.setBounds(0, 0, 800, 600);
    }

    update() {
        const speed = 160;

        // --- Handle Attack Input ---
        if ((this.keys.attack.isDown || this.input.activePointer.leftButtonDown()) && !this.isAttacking && !this.isRolling) {
            this.isAttacking = true;
            this.player.anims.play('attack', true);
        }

        // --- Handle Roll Input ---
        const isRollJustDown = Phaser.Input.Keyboard.JustDown(this.keys.roll) || Phaser.Input.Keyboard.JustDown(this.keys.shift);
        if (isRollJustDown && !this.isRolling && !this.isAttacking && this.player.body.touching.down) {
            this.isRolling = true;
            this.player.setData('isInvulnerable', true); // Start roll iframes!
            this.player.anims.play('roll', true);
            const rollDirection = this.player.flipX ? -1 : 1;
            this.player.setVelocityX(rollDirection * 300);
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
            // The ground top edge is at Y=525. If our hitbox bottom is past 510, we are about to land!
            if (this.player.body.bottom >= 510) {
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
