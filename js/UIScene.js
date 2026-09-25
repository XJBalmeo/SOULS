class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // ── Dark panel backdrop ─────────────────────────────────────
        this.add.rectangle(8, 8, 188, 90, 0x000000, 0.65).setOrigin(0, 0);

        // ── Graphics object redrawn every frame for the bars ────────
        this.barGfx = this.add.graphics();

        // ── Static text labels ──────────────────────────────────────
        const labelStyle = {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 3
        };
        this.add.text(16, 14, 'HP', labelStyle);
        this.add.text(16, 42, 'ST', labelStyle);
        this.flaskText = this.add.text(16, 70, 'FLASK ×3  [E]', {
            ...labelStyle, color: '#88dd88'
        });

        // ── "YOU DIED" full-screen overlay ─────────────────────────
        this.youDiedText = this.add
            .text(400, 275, 'YOU DIED', {
                fontSize: '56px',
                fontFamily: 'serif',
                color: '#cc1111',
                stroke: '#000000',
                strokeThickness: 8
            })
            .setOrigin(0.5)
            .setDepth(100)
            .setVisible(false);
    }

    update() {
        // Poll registry every frame — simple and reliable
        const hp     = this.registry.get('health')    ?? 100;
        const maxHp  = this.registry.get('maxHealth') ?? 100;
        const st     = this.registry.get('stamina')   ?? 100;
        const maxSt  = this.registry.get('maxStamina')?? 100;
        const flasks = this.registry.get('healFlasks') ?? 0;
        const dead   = this.registry.get('playerDead') ?? false;

        const hPct = Phaser.Math.Clamp(hp / maxHp, 0, 1);
        const sPct = Phaser.Math.Clamp(st / maxSt, 0, 1);

        const g = this.barGfx;
        const X = 16, W = 158, H = 11;
        g.clear();

        // ── HP bar ──────────────────────────────────────────────────
        g.fillStyle(0x3a0000, 1);
        g.fillRect(X, 26, W, H);
        if (hPct > 0) {
            g.fillStyle(0xdd2211, 1);
            g.fillRect(X, 26, W * hPct, H);
            g.fillStyle(0xff6644, 0.4);
            g.fillRect(X, 26, W * hPct, 3); // highlight shimmer
        }

        // ── ST bar ──────────────────────────────────────────────────
        g.fillStyle(0x2b1a00, 1);
        g.fillRect(X, 54, W, H);
        if (sPct > 0) {
            g.fillStyle(0xddaa00, 1);
            g.fillRect(X, 54, W * sPct, H);
            g.fillStyle(0xffee44, 0.4);
            g.fillRect(X, 54, W * sPct, 3); // highlight shimmer
        }

        // ── Flask counter ───────────────────────────────────────────
        this.flaskText.setText(`FLASK ×${flasks}  [E]`);

        // ── YOU DIED overlay ────────────────────────────────────────
        this.youDiedText.setVisible(dead);
    }
}
