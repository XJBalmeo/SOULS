const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 1280,
        height: 720
    },
    backgroundColor: '#000000',
    pixelArt: true, // Crucial for pixel art games to prevent blurring
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: true // Turn off later
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);

// --- Fullscreen & Pause Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('fullscreen-overlay');
    
    // When the user clicks the overlay, request fullscreen
    overlay.addEventListener('click', () => {
        document.documentElement.requestFullscreen().catch(e => {
            console.error("Fullscreen failed:", e);
        });
    });

    // Listen for fullscreen changes to pause/resume the game
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            // Exited fullscreen (zoomed out) -> Show overlay and PAUSE game
            overlay.style.display = 'flex';
            if (game.scene.isActive('GameScene')) {
                game.scene.pause('GameScene');
            }
        } else {
            // Entered fullscreen -> Hide overlay and RESUME game
            overlay.style.display = 'none';
            if (game.scene.isPaused('GameScene')) {
                game.scene.resume('GameScene');
            }
        }
    });
});
