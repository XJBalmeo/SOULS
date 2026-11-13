const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "game-container",
    width: 1280,
    height: 720,
  },
  backgroundColor: "#000000",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: true,
    },
  },
  // Order is render order: PauseScene and SettingsScene draw above the game.
  scene: [BootScene, MenuScene, GameScene, DeathScene, PauseScene, SettingsScene, ConfirmScene, CreditsScene],
};
const game = new Phaser.Game(config);

// Fullscreen is mandatory during play: New Game enters it (MenuScene), and
// leaving it mid-run shows the "game paused" overlay. Clicking the overlay
// re-enters fullscreen and resumes, unless the pause menu holds the game.
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fullscreen-overlay");
  const inRun = () => game.scene.isActive("GameScene") || game.scene.isPaused("GameScene");

  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
    UI.enterFullscreen();
    const pauseMenuOpen = game.scene.isActive("PauseScene") || game.scene.isSleeping("PauseScene");
    if (game.scene.isPaused("GameScene") && !pauseMenuOpen) {
      game.scene.resume("GameScene");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement || !inRun()) return;
    overlay.style.display = "flex";
    if (game.scene.isActive("GameScene")) game.scene.pause("GameScene");
  });
});
