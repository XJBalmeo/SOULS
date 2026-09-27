const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    backgroundColor: '#ADD8E6',
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
