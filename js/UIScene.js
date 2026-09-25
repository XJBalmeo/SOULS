class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // ---- Layout constants (screen pixels, no zoom) ----
        const X       = 16;
        const Y       = 16;
        const W       = 160;  // bar width
        const H       = 13;   // bar height
        const ROW_GAP = 28;   // vertical spacing between HP and ST rows

        this.BAR_W = W;
        this.BAR_H = H;

        // ---- Shared text style ----
        const labelStyle = {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        };

        // ---- Dark panel backdrop ----
        this.add.rectangle(X - 8, Y - 6, W + 16, ROW_GAP + H + 10, 0x000000, 0.55).setOrigin(0, 0);

        // ========== HP Bar ==========
        this.add.text(X, Y, 'HP', labelStyle);

        // Background track
        this.add.rectangle(X, Y + 14, W, H, 0x3b0000).setOrigin(0, 0);

        // Animated fill
        this.healthFill = this.add.rectangle(X, Y + 14, W, H, 0xdd2211).setOrigin(0, 0);

        // Subtle highlight line at top of bar
        this.add.rectangle(X, Y + 14, W, 2, 0xff6655, 0.5).setOrigin(0, 0);

        // ========== ST Bar ==========
        this.add.text(X, Y + ROW_GAP, 'ST', labelStyle);

        // Background track
        this.add.rectangle(X, Y + ROW_GAP + 14, W, H, 0x2b1a00).setOrigin(0, 0);

        // Animated fill
        this.staminaFill = this.add.rectangle(X, Y + ROW_GAP + 14, W, H, 0xddaa00).setOrigin(0, 0);

        // Subtle highlight line at top of bar
        this.add.rectangle(X, Y + ROW_GAP + 14, W, 2, 0xffee88, 0.5).setOrigin(0, 0);

        // ---- Listen to registry changes pushed by GameScene ----
        this.registry.events.on('changedata', this.onRegistryChange, this);
    }

    onRegistryChange(parent, key, value) {
        if (key === 'health') {
            const pct = Phaser.Math.Clamp(value / (this.registry.get('maxHealth') || 100), 0, 1);
            this.healthFill.setSize(Math.max(0, this.BAR_W * pct), this.BAR_H);
        }
        if (key === 'stamina') {
            const pct = Phaser.Math.Clamp(value / (this.registry.get('maxStamina') || 100), 0, 1);
            this.staminaFill.setSize(Math.max(0, this.BAR_W * pct), this.BAR_H);
        }
    }
}
