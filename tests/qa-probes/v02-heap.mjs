// Heap after forced GC across repeated checkpoint restarts (leak check).
import puppeteer from "puppeteer";
import { startServer } from "../serve.mjs";

const server = await startServer(0);
const browser = await puppeteer.launch({ headless: true, args: ["--js-flags=--expose-gc"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:" + server.address().port + "/", { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.waitForFunction(() => game.scene.isActive("MenuScene"));
await page.evaluate(() => {
  SaveManager.startNewCampaign();
  game.scene.getScene("MenuScene").scene.start("GameScene");
});
const ready = () => page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player);
const heap = async () => {
  await page.evaluate(() => { window.gc(); window.gc(); });
  await new Promise((r) => setTimeout(r, 300));
  return Math.round((await page.evaluate(() => performance.memory.usedJSHeapSize)) / 1e5) / 10;
};
await ready();
const samples = [await heap()];
for (let i = 1; i <= 20; i++) {
  await page.evaluate(() => game.scene.getScene("GameScene").restartFromCheckpoint());
  await new Promise((r) => setTimeout(r, 400));
  await ready();
  if (i % 5 === 0) samples.push(await heap());
}
console.log("heap MB after GC at restarts 0,5,10,15,20:", samples.join(", "));
await browser.close();
server.close();
