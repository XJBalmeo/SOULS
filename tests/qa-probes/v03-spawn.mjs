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
// ---- Respawn after a death: NEW_RESPAWN.png instead of beam + NEW_SPAWN ----
await state(() => { SaveManager.campaign.parryDeathUsed = true; });
// Watch every frame from the death to the end of the respawn.
const watch = state(() => new Promise((resolve) => {
  const log = { gapFrames: 0, beamSeen: false, respawnSeen: false, cut: null, deathSeen: false, coverAlphas: [] };
  const t0 = performance.now();
  const tick = () => {
    const gs = game.scene.getScene("GameScene");
    const death = game.scene.isActive("DeathScene");
    const anim = gs.respawnAnim && gs.respawnAnim.active;
    if (death) log.deathSeen = true;
    if (gs.spawnBeam) log.beamSeen = true;
    if (anim) log.respawnSeen = true;
    if (gs.respawnCover && gs.respawnCover.active) log.coverAlphas.push(+gs.respawnCover.alpha.toFixed(2));
    const knight = gs.player && gs.player.visible && gs.sys.isActive();
    if (log.deathSeen && !death && !anim && !knight) log.gapFrames++;
    if (log.respawnSeen && !anim && knight && !log.cut) {
      const p = gs.player, w = gs.cameras.main.worldView;
      log.cut = { anim: p.anims.currentAnim?.key, frameLeft: +(p.x - p.displayOriginX - w.x).toFixed(1), frameTop: +(p.y - p.displayOriginY - w.y).toFixed(1), spawning: gs.isSpawning };
    }
    if ((log.cut && !gs.isSpawning) || performance.now() - t0 > 15000) return resolve(log);
    requestAnimationFrame(tick);
  };
  tick();
}));
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await waitFor(() => game.scene.getScene("GameScene").respawnAnim && game.scene.getScene("GameScene").respawnAnim.active, 10000);
await wait(500);
await shot("spawn-04-respawn-anim");
const r = await watch;
check("after a death the respawn animation plays, not the beam", r.respawnSeen && !r.beamSeen, JSON.stringify(r));
check("no uncovered frame between YOU DIED and the respawn animation", r.deathSeen && r.gapFrames === 0, JSON.stringify(r));
// The respawn's last frame draws the knight's 100x100 frame at (110, 94) in the 512x288 view.
check("the cut lands the knight exactly on the respawn's last frame, in idle", r.cut && r.cut.anim === "idle" && r.cut.frameLeft === 110 && r.cut.frameTop === 94, JSON.stringify(r.cut));
const fades = r.coverAlphas.filter((x) => x > 0.05 && x < 0.95);
check("the black fades away gradually (no hard cut)", fades.length >= 5, JSON.stringify({ steps: fades.length, sample: fades.slice(0, 8) }));
const durs = await state(() => game.anims.get("respawn").frames.map((f) => f.duration));
const downFirst = await state(() => game.anims.get("down").frames[0].duration || Math.round(1000 / game.anims.get("down").frameRate));
check("respawn frames: 100 ms each, second-to-last 200 ms, last as long as NEW_DOWN frame 1", durs.length === 25 && durs.slice(0, 23).every((d) => d === 100) && durs[23] === 200 && durs[24] === downFirst, JSON.stringify({ durs, downFirst }));
check("control and the centre pan come after the respawn", await waitFor(() => !game.scene.getScene("GameScene").isSpawning && game.scene.getScene("GameScene").cameras.main.followOffset.x === 0, 3000));
// Retry from Checkpoint (pause menu) is not a death: the beam again.
await state(() => game.scene.getScene("GameScene").restartFromCheckpoint());
check("Retry from Checkpoint still uses the beam", await waitFor(() => { const s = game.scene.getScene("GameScene"); return s.sys.isActive() && s.spawnBeam && s.spawnBeam.active && !s.respawnAnim; }, 8000));
await g.finish("v03-spawn");
