class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load the spritesheets
        // The frameWidth and frameHeight match the dimensions you provided (100x100)
        this.load.spritesheet('hero_idle', 'Sprites/HERO_IDLE.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_run', 'Sprites/HERO_RUN.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_jump', 'Sprites/HERO_JUMP.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_roll', 'Sprites/HERO_ROLL.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('hero_attack', 'Sprites/HERO_ATTACK.png', { frameWidth: 100, frameHeight: 100 });
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
        
        // Adjust the collision box (hitbox) of the player
        this.player.body.setSize(40, 80);
        this.player.body.setOffset(30, 20);

        this.player.setCollideWorldBounds(true); // Don't let player walk off screen
        
        // Add a simple ground platform so the player doesn't fall endlessly
        const ground = this.add.rectangle(400, 550, 800, 50, 0x00aa00);
        this.physics.add.existing(ground, true); // true = static body
        this.physics.add.collider(this.player, ground);

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
            this.player.anims.play('roll', true);
            const rollDirection = this.player.flipX ? -1 : 1;
            this.player.setVelocityX(rollDirection * 300);
        }

        // --- Handle Movement & Jump Input ---
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

            // Jump is still blocked while attacking
            if (!this.isAttacking && (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.space)) && onGround) {
                this.player.setVelocityY(-288);
            }
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

        // --- Fix Visual Sprite Misalignment ---
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
        
        if (this.player.flipX) {
            this.player.setOrigin(0.5 + originOffset, 0.5);
            this.player.body.setOffset(30 + (originOffset * 100), 20);
        } else {
            this.player.setOrigin(0.5 - originOffset, 0.5);
            this.player.body.setOffset(30 - (originOffset * 100), 20);
        }
    }
}
