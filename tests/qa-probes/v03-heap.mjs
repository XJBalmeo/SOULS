// QA v0.3 edge 8b: heap after forced GC over 10 restarts, half of them mid-Parry-Death.
import puppeteer from "puppeteer";
import { startServer } from "../serve.mjs";
const server = await startServer(0);
const browser = await puppeteer.launch({ headless: true, args: ["--js-flags=--expose-gc"] });
const page = await browser.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => m.type() === "error" && errs.push(m.text()));
await page.goto("http://127.0.0.1:" + server.address().port + "/", { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.waitForFunction(() => game.scene.isActive("MenuScene"));
await page.evaluate(() => { game.scene.stop("MenuScene"); SaveManager.startNewCampaign(); game.scene.start("GameScene"); });
const ready = () => page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player && !game.scene.getScene("GameScene").isDead);
const heap = async () => { await page.evaluate(() => { window.gc(); window.gc(); }); await new Promise(r => setTimeout(r, 300)); return Math.round((await page.evaluate(() => performance.memory.usedJSHeapSize)) / 1e5) / 10; };
await ready(); await new Promise(r => setTimeout(r, 500));
const samples = [await heap()];
const counts = [];
for (let i = 1; i <= 10; i++) {
  await page.evaluate((i) => {
    const s = game.scene.getScene("GameScene");
    if (i % 2 === 0) { SaveManager.campaign.parryDeathUsed = false; PARRY_DEATH_CONFIG.forcedDelayMs = 100; s.hurtPlayer(500, 1, null); }
  }, i);
  if (i % 2 === 0) await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => game.scene.getScene("GameScene").restartFromCheckpoint());
  await new Promise(r => setTimeout(r, 500));
  await ready();
  counts.push(await page.evaluate(() => ({ sounds: game.sound.sounds.length, kbl: game.scene.getScene("GameScene").input.keyboard.listenerCount("keydown"), displayObjs: game.scene.getScene("GameScene").children.list.length })));
  if (i % 2 === 0) samples.push(await heap());
}
console.log("heap MB after GC at restarts 0,2,4,6,8,10:", samples.join(", "));
console.log("per-restart counts:", JSON.stringify(counts));
console.log("errors:", JSON.stringify(errs));
await browser.close(); server.close();
