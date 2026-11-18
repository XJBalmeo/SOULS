// QA: right-click parry against Death in real play conditions, including a click
// on the black bars beside the game (the cursor is hidden, so it can be anywhere).
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { page, state, wait, waitFor, newCampaign, check, waitForStrike, rightClickHere, shot } = g;
const pd = () => state(() => { const d = game.scene.getScene("GameScene").parryDeath; return { state: d.state, outcome: d.outcome, reason: d.failReason }; });
const clickAt = async (x, y) => { await page.mouse.move(x, y); await rightClickHere(40); };
const run = async (label, when, x, y, expect) => {
  await newCampaign(); await wait(500);
  await state(() => game.scene.getScene("GameScene").takeDamage(999));
  await page.mouse.move(x, y); // in place before the window opens
  if (when === "SINGLE_STRIKE") await waitForStrike(8000);
  else await waitFor((w) => game.scene.getScene("GameScene").parryDeath.state === w, 8000, when);
  await rightClickHere(40);
  await wait(100);
  const r = await pd();
  check(label, r.outcome === expect, JSON.stringify(r));
  await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 6000);
  await wait(300);
};
await run("strike window, mouse on the game: parried", "SINGLE_STRIKE", 640, 360, "success");
await run("press on frame 17 (the scythe stands up): too early (fail)", "TELEGRAPH", 640, 360, "fail");
await page.setViewport({ width: 1600, height: 720 });
await wait(500);
const box = await (await page.$("canvas")).boundingBox();
check("the wide window leaves black bars", box.x > 100, JSON.stringify(box));
await run("strike window, mouse on the black bar: parried", "SINGLE_STRIKE", 40, 360, "success");
await run("strike window, wide window, mouse on the game: parried", "SINGLE_STRIKE", 800, 360, "success");
// Successful parry (owner 2026-11-14): the dim becomes crack.png at once, the
// parry plays and everything freezes on its last frame for 1 s, then a white
// flash clears the crack and the HUD dim and one of 1-5.png shows (random),
// 1 s fully visible, 0.5 s fade to nothing.
const loaded = await state(() => ["death_crack", ...PARRY_DEATH_CONFIG.victoryImages].map((k) => game.textures.exists(k) && game.textures.get(k).getSourceImage().width + "x" + game.textures.get(k).getSourceImage().height));
check("crack.png and the five text images load at 512x288", loaded.length === 6 && loaded.every((d) => d === "512x288"), JSON.stringify(loaded));
const look = () => state(() => {
  const s = game.scene.getScene("GameScene"), d = s.parryDeath, p = s.player, i = d.victoryImage, c = s.deathCrack;
  return {
    phase: d.state, anim: p.anims.currentAnim?.key, frame: p.anims.currentFrame?.index, knightDepth: p.depth,
    dim: !!s.deathDim, crack: c && c.active ? { depth: c.depth, w: c.displayWidth, h: c.displayHeight } : null,
    hudTint: s.hudHp.isTinted ? s.hudHp.tintTopLeft : null,
    deathFrame: d.reaper ? d.reaper.frame.name : null,
    flash: s.cameras.main.flashEffect.isRunning,
    image: i && i.active ? { key: i.texture.key, alpha: +i.alpha.toFixed(2), depth: i.depth } : null,
  };
});
for (const [rng, want] of [[0.1, "death_defied_1"], [0.5, "death_defied_3"], [0.9, "death_defied_5"]]) {
  await newCampaign(); await wait(500);
  await state((r) => { PARRY_DEATH_CONFIG.rng = () => r; PARRY_DEATH_CONFIG.forcedSpinFrames = 4; }, rng);
  await state(() => game.scene.getScene("GameScene").takeDamage(999));
  await page.mouse.move(640, 360);
  await waitForStrike(8000);
  await rightClickHere(30);
  await wait(100);
  let v = await look();
  check(want + ": at once the dim is replaced by crack.png (full screen, under the knight), HUD stays dimmed",
    v.phase === "PARRY_SUCCESS" && !v.dim && v.crack && v.crack.w === 512 && v.crack.h === 288 && v.knightDepth > v.crack.depth && v.hudTint === 0x333333 && !v.image, JSON.stringify(v));
  await wait(500);
  v = await look();
  check(want + ": frozen on the last parry frame, Death held on frame 18, no flash yet", v.anim === "parry" && v.frame === 3 && v.deathFrame === 17 && !v.flash && v.crack && !v.image, JSON.stringify(v));
  if (rng < 0.5) await shot("parry-05a-crack-freeze");
  const flashed = await waitFor(() => game.scene.getScene("GameScene").cameras.main.flashEffect.isRunning, 1500);
  v = await look();
  check(want + ": then a white flash clears the crack and the HUD dim, and the text image shows", flashed && !v.crack && !v.dim && v.hudTint === null && v.image && v.image.key === want && v.image.alpha === 1, JSON.stringify(v));
  await wait(600);
  if (rng < 0.5) await shot("parry-05b-death-defied-image");
  v = await look();
  check(want + ": still fully visible 0.6 s after the flash", v.image && v.image.alpha === 1, JSON.stringify(v));
  await waitFor(() => { const i = game.scene.getScene("GameScene").parryDeath.victoryImage; return i && i.active && i.alpha < 0.9; }, 1500);
  v = await look();
  check(want + ": then fades out", v.image && v.image.alpha < 1 && v.image.alpha > 0, JSON.stringify(v));
  await wait(600);
  v = await look();
  check(want + ": gone after the fade, knight back to normal depth", !v.image && v.knightDepth === 10, JSON.stringify(v));
  await state(() => { PARRY_DEATH_CONFIG.rng = null; PARRY_DEATH_CONFIG.forcedSpinFrames = null; });
}
// TEMPORARY debug key: O kills at once and gives the Death parry back each time.
await page.setViewport({ width: 1280, height: 720 });
await newCampaign(); await wait(500);
for (let i = 1; i <= 2; i++) {
  await page.keyboard.press("KeyO");
  check("O #" + i + ": instant death starts the Death encounter", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state !== "IDLE", 1000));
  await page.mouse.move(640, 360);
  await waitForStrike(8000);
  await rightClickHere(40);
  check("O #" + i + ": parried", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000) && (await pd()).outcome === "success");
  await wait(1700);
}
await g.finish("v03-death-parry-mouse");
