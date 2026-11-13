import puppeteer from "puppeteer";
import { startServer } from "../serve.mjs";
const server = await startServer(0);
const url = "http://127.0.0.1:" + server.address().port + "/";
const browser = await puppeteer.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs = [];
page.on("console", (m) => { if (["error","warn","warning"].includes(m.type())) logs.push(m.text()); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f) => page.evaluate(f);
const st = () => ev(() => Object.fromEntries(["GameScene","PauseScene","SettingsScene"].map((k) => [k, game.scene.isActive(k) ? "A" : game.scene.isPaused(k) ? "P" : game.scene.isSleeping(k) ? "S" : "-"])));
await page.goto(url, { waitUntil: "load" });
await ev(() => localStorage.clear()); await page.reload({ waitUntil: "load" }); await wait(1200);
await page.click("#fullscreen-overlay"); await wait(300);
await ev(() => game.scene.getScene("MenuScene").startNewGame());
await page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player); await wait(600);
const mark = (n) => { console.log("## " + n + " logs=" + JSON.stringify(logs.splice(0))); };
// Esc and P same instant
await page.keyboard.down("Escape"); await page.keyboard.down("KeyP"); await wait(300);
console.log("## Esc+P together", JSON.stringify(await st())); mark("EscP");
await page.keyboard.up("Escape"); await page.keyboard.up("KeyP"); await wait(200);
console.log("## after release", JSON.stringify(await st()));
await ev(() => { game.scene.stop("PauseScene"); game.scene.resume("GameScene"); }); await wait(200);
// 6 rapid P, zero delay
for (let i = 0; i < 6; i++) await page.keyboard.press("KeyP");
await wait(400); console.log("## 6xP", JSON.stringify(await st())); mark("6xP");
// ensure active
if ((await st()).GameScene !== "A") { await page.keyboard.press("KeyP"); await wait(300); }
// fullscreen exit while playing
console.log("## fs entered", await ev(() => !!document.fullscreenElement));
await ev(() => document.exitFullscreen()); await wait(400);
console.log("## fs exit while playing", JSON.stringify(await st()), await ev(() => document.getElementById("fullscreen-overlay").style.display)); mark("fsExit");
await page.keyboard.press("KeyP"); await wait(300);
console.log("## P with overlay up", JSON.stringify(await st())); mark("Pover");
await page.click("#fullscreen-overlay"); await wait(400);
console.log("## overlay click", JSON.stringify(await st()), await ev(() => !!document.fullscreenElement)); mark("ovclick");
await browser.close(); server.close();
