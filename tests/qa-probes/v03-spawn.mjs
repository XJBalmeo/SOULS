// QA: knight spawn (owner 2026-11-15). BEAM.png comes down with its bottom row
// on the knight's frame bottom, turns into NEW_SPAWN.png, then idle; no control
// until idle; the camera holds its spawn framing (knight left of centre by
// SPAWN_CONFIG.cameraLookRightPx), then pans smoothly to centre the knight.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { page, state, wait, waitFor, check, shot } = g;

const look = () => state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player, c = s.cameras.main, b = s.spawnBeam;
  const frameBottom = p.y - p.displayOriginY + p.height;
  return {
    spawning: s.isSpawning, visible: p.visible, anim: p.anims.currentAnim?.key, frame: p.anims.currentFrame?.index,
    beam: b && b.active ? { anim: b.anims.currentAnim?.key, bottom: b.y + b.height * (1 - b.originY), x: b.x } : null,
    frameBottom, frameCenterX: p.x - p.displayOriginX + p.width / 2,
    offsetX: +c.followOffset.x.toFixed(1), knightFromCentre: +(p.x - c.midPoint.x).toFixed(1), px: Math.round(p.x),
  };
});

// Start a campaign by hand so the first frames of the spawn can be watched.
await state(() => {
  ["MenuScene", "ConfirmScene", "SettingsScene", "CreditsScene", "PauseScene", "DeathScene", "GameScene"]
    .forEach((k) => game.scene.isActive(k) || game.scene.isSleeping(k) ? game.scene.stop(k) : null);
  localStorage.removeItem("souls.save.v1");
  SaveManager.startNewCampaign();
  SaveManager.write();
  game.scene.start("GameScene");
});
await waitFor(() => { const s = game.scene.getScene("GameScene"); return s.sys.isActive() && s.spawnBeam && s.spawnBeam.active; }, 8000);
await wait(120);
let v = await look();
check("the beam plays first, the knight is hidden, no control", v.spawning && !v.visible && v.beam && v.beam.anim === "beam", JSON.stringify(v));
check("beam bottom row = knight frame bottom row, same column", v.beam && Math.abs(v.beam.bottom - v.frameBottom) < 0.01 && Math.abs(v.beam.x - v.frameCenterX) < 0.01, JSON.stringify(v));
check("camera locked: knight " + "left of centre by the spawn offset", v.offsetX === -96, JSON.stringify(v));
await shot("spawn-01-beam");
check("the beam hands over to NEW_SPAWN", await waitFor(() => { const p = game.scene.getScene("GameScene").player; return p.visible && p.anims.currentAnim?.key === "spawn"; }, 2000));
v = await look();
check("beam removed when the spawn starts, still no control", !v.beam && v.spawning, JSON.stringify(v));
await wait(150);
await shot("spawn-02-spawn");
const x0 = v.px;
await page.keyboard.down("KeyD");
await wait(200);
v = await look();
check("pressing D during the spawn does not move the knight", v.spawning && Math.abs(v.px - x0) <= 1, JSON.stringify({ x0, v }));
await page.keyboard.up("KeyD");
// The moment control returns, the knight must be in idle and the camera pan must start.
const handover = await state(() => new Promise((resolve) => {
  const s = game.scene.getScene("GameScene");
  const tick = () => s.isSpawning ? requestAnimationFrame(tick)
    : resolve({ anim: s.player.anims.currentAnim?.key, panning: s.tweens.getTweensOf(s.cameras.main.followOffset).length > 0 });
  tick();
}));
check("control returns exactly when idle starts, and the camera pan starts then", handover.anim === "idle" && handover.panning, JSON.stringify(handover));
await wait(300);
v = await look();
check("pan in progress (smooth, not a jump)", v.offsetX > -96 && v.offsetX < 0, JSON.stringify(v));
await wait(1500);
v = await look();
check("camera centred on the knight", v.offsetX === 0 && Math.abs(v.knightFromCentre) < 1, JSON.stringify(v));
const view = await state(() => { const s = game.scene.getScene("GameScene"), w = s.cameras.main.worldView, b = s.physics.world.bounds;
  return { left: w.x, right: w.right, top: w.y, bottom: w.bottom, mapLeft: b.x, mapRight: b.right, mapTop: b.y, mapBottom: b.bottom }; });
check("after the centre pan the view stays inside the map (no outside background)",
  view.left >= view.mapLeft && view.right <= view.mapRight && view.top >= view.mapTop && view.bottom <= view.mapBottom, JSON.stringify(view));
await shot("spawn-03-centred");
await page.keyboard.down("KeyD");
await wait(300);
await page.keyboard.up("KeyD");
check("the knight can move after the spawn", (await look()).px > x0 + 10);
await g.finish("v03-spawn");
