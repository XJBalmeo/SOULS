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

// The game is only played in fullscreen. Whenever the window is not
// fullscreen (at load, on the menu, in a run, on the death screen) the
// sprites/pause.png overlay covers the page; clicking it enters fullscreen.
// Leaving fullscreen mid-run opens the pause menu under the overlay (or just
// pauses the game when the menu can't open, for example while dying); the
// click then returns to the pause menu, or resumes if no menu was opened.
// index.html loads this script after the page is parsed, so run at once then.
const setupFullscreenOverlay = () => {
  const overlay = document.getElementById("fullscreen-overlay");
  const inRun = () => game.scene.isActive("GameScene") || game.scene.isPaused("GameScene");
  const pauseMenuOpen = () => game.scene.isActive("PauseScene") || game.scene.isSleeping("PauseScene");
  const syncOverlay = () => {
    overlay.style.display = document.fullscreenElement ? "none" : "flex";
  };

  overlay.addEventListener("click", () => {
    UI.enterFullscreen().then((ok) => {
      if (ok && game.scene.isPaused("GameScene") && !pauseMenuOpen()) game.scene.resume("GameScene");
    });
  });

  document.addEventListener("fullscreenchange", () => {
    syncOverlay();
    if (document.fullscreenElement || !inRun() || pauseMenuOpen()) return;
    const gameScene = game.scene.getScene("GameScene");
    if (game.scene.isActive("GameScene") && gameScene.requestPause()) return;
    if (game.scene.isActive("GameScene")) game.scene.pause("GameScene");
  });
  syncOverlay();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupFullscreenOverlay);
else setupFullscreenOverlay();
