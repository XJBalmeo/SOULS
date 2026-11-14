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
await run("press during the scythe raise: too early (fail)", "TELEGRAPH", 640, 360, "fail");
await page.setViewport({ width: 1600, height: 720 });
await wait(500);
const box = await (await page.$("canvas")).boundingBox();
check("the wide window leaves black bars", box.x > 100, JSON.stringify(box));
await run("strike window, mouse on the black bar: parried", "SINGLE_STRIKE", 40, 360, "success");
await run("strike window, wide window, mouse on the game: parried", "SINGLE_STRIKE", 800, 360, "success");
// Victory image after a successful parry: random 1.png / 2.png, 0.5 s later,
// above the dim, below the knight, 1 s visible, 0.5 s fade to nothing.
for (const [rng, want] of [[0.1, "death_defied_1"], [0.9, "death_defied_2"]]) {
  await newCampaign(); await wait(500);
  await state((r) => { PARRY_DEATH_CONFIG.rng = () => r; PARRY_DEATH_CONFIG.forcedDelayMs = 300; }, rng);
  await state(() => game.scene.getScene("GameScene").takeDamage(999));
  await page.mouse.move(640, 360);
  await waitForStrike(8000);
  await rightClickHere(30);
  const img = () => state(() => { const s = game.scene.getScene("GameScene"); const i = s.parryDeath.victoryImage;
    return i && i.active ? { key: i.texture.key, alpha: +i.alpha.toFixed(2), depth: i.depth, dim: DEATH_CONFIG.dimDepth, knight: s.player.depth, w: i.displayWidth, h: i.displayHeight } : null; });
  await wait(300);
  check(want + ": nothing yet at 0.3 s", (await img()) === null);
  await wait(400);
  let v = await img();
  check(want + ": shown at 0.5 s, full screen, above the dim, below the knight", v && v.key === want && v.alpha === 1 && v.depth > v.dim && v.knight > v.depth && v.w === 512 && v.h === 288, JSON.stringify(v));
  // Timings below are counted from the parry (about 0.7 s so far).
  await wait(400);
  v = await img();
  check(want + ": still fully visible at about 1.1 s", v && v.alpha === 1, JSON.stringify(v));
  if (rng < 0.5) await shot("parry-05-death-defied-image");
  await waitFor(() => { const i = game.scene.getScene("GameScene").parryDeath.victoryImage; return i && i.active && i.alpha < 0.9; }, 1500);
  v = await img();
  check(want + ": then fades out", v && v.alpha < 1 && v.alpha > 0, JSON.stringify(v));
  await wait(600);
  check(want + ": gone after the fade, knight back to normal depth", (await img()) === null && (await state(() => game.scene.getScene("GameScene").player.depth)) === 10);
  await state(() => { PARRY_DEATH_CONFIG.rng = null; PARRY_DEATH_CONFIG.forcedDelayMs = null; });
}
// TEMPORARY debug key: P kills at once and gives the Death parry back each time.
await page.setViewport({ width: 1280, height: 720 });
await newCampaign(); await wait(500);
for (let i = 1; i <= 2; i++) {
  await page.keyboard.press("KeyP");
  check("P #" + i + ": instant death starts the Death encounter", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state !== "IDLE", 1000));
  await page.mouse.move(640, 360);
  await waitForStrike(8000);
  await rightClickHere(40);
  check("P #" + i + ": parried", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000) && (await pd()).outcome === "success");
  await wait(1700);
}
await g.finish("v03-death-parry-mouse");
