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
  scene: [MenuScene, GameScene, PauseScene, SettingsScene, CreditsScene],
};
const game = new Phaser.Game(config);

// The overlay is the click-to-start gate (it also unlocks browser audio) and
// the screen shown when fullscreen is left. Dismissing it resumes the game
// unless the pause menu (or settings opened from it) is holding it paused.
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fullscreen-overlay");

  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
    const pauseMenuOpen = game.scene.isActive("PauseScene") || game.scene.isSleeping("PauseScene");
    if (game.scene.isPaused("GameScene") && !pauseMenuOpen) {
      game.scene.resume("GameScene");
    }
    if (SoulsSettings.load().fullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.warn("Could not enter fullscreen, playing windowed instead:", e);
      });
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement || !SoulsSettings.load().fullscreen) return;
    overlay.style.display = "flex";
    if (game.scene.isActive("GameScene")) game.scene.pause("GameScene");
  });
});
