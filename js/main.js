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

// Fullscreen is mandatory during play: New Game and Continue enter it, the
// pause menu (P / Esc) leaves it, and Resume enters it again. Leaving
// fullscreen any other way mid-run opens the pause menu; if that is not
// possible (the death screen), the "game paused" overlay is shown instead.
// Clicking the overlay re-enters fullscreen and resumes.
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
    const pauseMenuOpen = game.scene.isActive("PauseScene") || game.scene.isSleeping("PauseScene");
    if (pauseMenuOpen) return;
    const gameScene = game.scene.getScene("GameScene");
    if (game.scene.isActive("GameScene") && gameScene.requestPause()) return;
    overlay.style.display = "flex";
    if (game.scene.isActive("GameScene")) game.scene.pause("GameScene");
  });
});
