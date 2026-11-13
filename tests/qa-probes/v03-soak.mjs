// QA v0.3 edge 8a: 3-minute mixed-play soak with random input and repeated forced encounters.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, newCampaign, page } = g;
await newCampaign();
const keys = ["KeyA", "KeyD", "KeyW", "Space", "KeyZ", "KeyX", "KeyC", "KeyS"];
const t0 = Date.now(); let n = 0, enc = { trig: 0, ok: 0, fail: 0 }, deaths = 0, lastSample = 0;
await state(() => { window.__trig = 0; const s = game.scene.getScene("GameScene"); });
while (Date.now() - t0 < 180000) {
  const k = keys[Math.floor(Math.random() * keys.length)];
  await page.keyboard.down(k); await wait(40 + Math.random() * 260); await page.keyboard.up(k);
  n++;
  if (n % 40 === 0) {
    // occasionally force a fatal hit with the opportunity refreshed, mixing parry/fail
    const r = await state(() => { const s = game.scene.getScene("GameScene"); if (!s.player || s.isDead || s.parryDeath.state !== "IDLE") return "skip"; SaveManager.campaign.parryDeathUsed = false; s.hurtPlayer(500, 1, null); return "forced"; });
    if (r === "forced") {
      enc.trig++;
      const mode = Math.random();
      if (mode < 0.5) { await g.waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000); await g.tap("KeyC"); }
      await wait(2500);
    }
  }
  if (Date.now() - lastSample > 30000) { lastSample = Date.now(); console.log("t=" + Math.round((Date.now() - t0) / 1000) + "s", JSON.stringify(await state(() => { const s = game.scene.getScene("GameScene"); return { hp: s.player.getData("hp"), dead: s.isDead, enc: s.parryDeath.state, active: game.scene.getScenes(true).map(x => x.scene.key), x: Math.round(s.player.x) }; }))); }
}
console.log("inputs sent:", n, "forced encounters:", enc.trig);
console.log("console errors:", JSON.stringify(g.errors));
console.log("console warnings:", JSON.stringify(g.warnings));
g.check("8a: 3-minute soak: no console errors/page errors", g.errors.length === 0);
console.log("warnings count", g.warnings.length);
await g.finish("v03-soak");
