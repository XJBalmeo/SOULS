// QA: right-click parry against Death in real play conditions, including a click
// on the black bars beside the game (the cursor is hidden, so it can be anywhere).
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { page, state, wait, waitFor, newCampaign, check } = g;
const pd = () => state(() => { const d = game.scene.getScene("GameScene").parryDeath; return { state: d.state, outcome: d.outcome, reason: d.failReason }; });
const clickAt = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down({ button: "right" }); await wait(40); await page.mouse.up({ button: "right" }); };
const run = async (label, when, x, y, expect) => {
  await newCampaign(); await wait(500);
  await state(() => game.scene.getScene("GameScene").takeDamage(999));
  await waitFor((w) => game.scene.getScene("GameScene").parryDeath.state === w, 8000, when);
  if (when === "SINGLE_STRIKE") await wait(60);
  await clickAt(x, y);
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
// The window is 500 ms: a click 420 ms into the strike still parries.
await newCampaign(); await wait(500);
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 8000);
await wait(420);
await clickAt(640, 360);
await wait(100);
const late = await pd();
check("a click 420 ms into the strike still parries (500 ms window)", late.outcome === "success", JSON.stringify(late));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 6000);
await wait(300);
// TEMPORARY debug key: P kills at once and gives the Death parry back each time.
await page.setViewport({ width: 1280, height: 720 });
await newCampaign(); await wait(500);
for (let i = 1; i <= 2; i++) {
  await page.keyboard.press("KeyP");
  check("P #" + i + ": instant death starts the Death encounter", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state !== "IDLE", 1000));
  await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 8000);
  await wait(60);
  await clickAt(640, 360);
  check("P #" + i + ": parried", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000) && (await pd()).outcome === "success");
  await wait(1700);
}
await g.finish("v03-death-parry-mouse");
