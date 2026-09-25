const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#ADD8E6',
    parent: 'game-container',
    pixelArt: true, // Crucial for pixel art games to prevent blurring
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: true // Turn off later
        }
    },
    scene: [GameScene, UIScene]
};

const game = new Phaser.Game(config);
