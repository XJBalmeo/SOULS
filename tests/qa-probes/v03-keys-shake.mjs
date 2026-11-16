// Owner 2026-11-16: P pauses, O is the temporary instant death, and the
// screen shakes during NEW_SPAWN frames 2-4.
import { openGame } from "../helpers.mjs";

const { check, state, wait, waitFor, tap, newCampaign, gameReady, finish } = await openGame("tests/qa-probes/out-v03");

// Record the camera shake state on every frame of the spawn animation.
await state(() => {
  window.__shakeLog = [];
  game.events.on("step", () => {
    const s = game.scene.getScene("GameScene");
    if (!s || !s.player || !s.player.anims || !s.player.anims.currentAnim) return;
    if (s.player.anims.currentAnim.key !== "spawn") return;
    window.__shakeLog.push({ frame: s.player.anims.currentFrame.index, shaking: s.cameras.main.shakeEffect.isRunning });
  });
});
await newCampaign();
const log = await state(() => window.__shakeLog);
const byFrame = {};
for (const e of log) (byFrame[e.frame] ||= []).push(e.shaking);
const shakes = (f) => (byFrame[f] || []).some(Boolean);
const still = (f) => (byFrame[f] || []).every((x) => !x);
check("spawn frames were seen", Object.keys(byFrame).length >= 5, JSON.stringify(Object.keys(byFrame)));
check("no shake on spawn frame 1", still(1));
check("shake on spawn frames 2, 3 and 4", shakes(2) && shakes(3) && shakes(4));
check("no shake on spawn frames 5 and 6", still(5) && still(6));

await tap("KeyP");
check("P opens the pause menu", await waitFor(() => game.scene.isActive("PauseScene") && game.scene.isPaused("GameScene"), 2000));
await state(() => game.scene.getScene("PauseScene").resumeGame());
await waitFor(() => game.scene.isActive("GameScene") && !game.scene.isActive("PauseScene"), 2000);
await wait(300);
await tap("KeyO");
check("O kills the knight (Death encounter starts)", await waitFor(() => {
  const s = game.scene.getScene("GameScene");
  return s.isDead || s.parryDeath.isActive();
}, 2000));
check("O does not open the pause menu", await state(() => !game.scene.isActive("PauseScene")));

await finish("v03-keys-shake");
