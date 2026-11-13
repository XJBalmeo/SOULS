import puppeteer from "puppeteer";
import { startServer } from "../serve.mjs";
const server = await startServer(0);
const url = "http://127.0.0.1:" + server.address().port + "/";
const browser = await puppeteer.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs = [];
page.on("console", (m) => { if (["error","warn","warning"].includes(m.type())) logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, a) => page.evaluate(f, a);
const st = () => ev(() => Object.fromEntries(["MenuScene","GameScene","PauseScene","SettingsScene","CreditsScene"].map((k) => [k, game.scene.isActive(k) ? "A" : game.scene.isPaused(k) ? "P" : game.scene.isSleeping(k) ? "S" : "-"])));
const out = (n, v) => console.log("[logs=" + logs.length + "] " + "## " + n + ": " + (typeof v === "string" ? v : JSON.stringify(v)));
const click = async (x, y) => {
  const r = await ev(() => { const b = document.querySelector("canvas").getBoundingClientRect(); return { l: b.left, t: b.top, s: b.width / 1280 }; });
  await page.mouse.click(r.l + x * r.s, r.t + y * r.s);
  await wait(150);
};
const pl = () => ev(() => { const s = game.scene.getScene("GameScene"); return { x: Math.round(s.player.x), st: s.player.getData("stamina"), atk: s.isAttacking, roll: s.isRolling, vx: Math.round(s.player.body.velocity.x), anim: s.player.anims.currentAnim && s.player.anims.currentAnim.key }; });
await page.goto(url, { waitUntil: "load" });
await ev(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await wait(1200);
await page.click("#fullscreen-overlay");
await wait(300);
await click(640, 360);
await page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player, { timeout: 8000 });
await wait(800);
out("start", await st());

// A: rapid P presses / hold
for (let i = 0; i < 6; i++) { await page.keyboard.press("KeyP", { delay: 10 }); }
await wait(300);
out("A rapid 6xP (even => should be resumed)", await st());
await page.keyboard.press("KeyP"); await wait(300);
out("A one more P", await st());
await page.keyboard.down("Escape"); await wait(100);
await page.keyboard.down("Escape"); await wait(100); await page.keyboard.down("Escape"); await wait(500);
await page.keyboard.up("Escape"); await wait(200);
out("A hold Esc (auto-repeat)", await st());
// make sure state clean: if paused, resume
let s = await st();
if (s.PauseScene !== "-") { await page.keyboard.press("Escape"); await wait(300); }
out("A after cleanup", await st());
out("A pause scene count in manager", await ev(() => game.scene.scenes.filter(x => x.sys.settings.key === "PauseScene").length));

// B: pause while holding D, resume after release during pause
await page.keyboard.down("KeyD"); await wait(300);
const b0 = await pl();
await page.keyboard.press("KeyP"); await wait(300);
await page.keyboard.up("KeyD"); await wait(200);
await page.keyboard.press("KeyP"); await wait(300);
const b1 = await pl(); await wait(500); const b2 = await pl();
out("B D held->pause->release->resume (x should stop)", { b0, b1, b2 });
// B2: pause while D held, resume with D still held (physical)
await page.keyboard.down("KeyD"); await wait(200);
await page.keyboard.press("KeyP"); await wait(300);
await page.keyboard.press("KeyP"); await wait(300);
const b3 = await pl(); await wait(400); const b4 = await pl();
out("B2 D still held across pause (moves after resume?)", { b3, b4 });
await page.keyboard.up("KeyD"); await wait(300);

// C: pause mid-attack and mid-roll
await page.keyboard.down("KeyZ"); await wait(60); await page.keyboard.up("KeyZ");
await page.keyboard.press("KeyP"); await wait(600);
const c0 = await pl();
await page.keyboard.press("KeyP"); await wait(1200);
out("C attack->pause->resume", { atPause: c0, after: await pl() });
await page.keyboard.down("KeyX"); await wait(60); await page.keyboard.up("KeyX");
await page.keyboard.press("KeyP"); await wait(600);
const c1 = await pl();
await page.keyboard.press("KeyP"); await wait(1500);
out("C roll->pause->resume", { atPause: c1, after: await pl() });
out("C velocity-tweens still alive", await ev(() => game.scene.getScene("GameScene").tweens.getTweens().length));

// D: click Resume -> does it attack?
await page.keyboard.press("KeyP"); await wait(300);
const d0 = await pl();
await click(640, 320);
await wait(100);
out("D after clicking Resume", { scenes: await st(), before: d0, now: await pl() });
await wait(1000);

// E: hover + click disabled Retry and Settings->Back via click
await page.keyboard.press("KeyP"); await wait(300);
await click(640, 424);
out("E click disabled Retry", await st());
await click(640, 372); out("E click Settings from pause", await st());
await page.keyboard.press("KeyP"); await wait(300);
out("E P in settings (expect pause shown, game paused)", await st());
await page.keyboard.press("KeyP"); await wait(300);
out("E P again in pause (expect resumed)", await st());

// F: Settings Back via click from pause lands where, then click-through?
await page.keyboard.press("KeyP"); await wait(300);
await click(640, 372); await wait(200);
// Back item y = 240+5*50 = 490
const f0 = await pl();
await click(640, 490);
out("F click Back in settings (pause visible)", { scenes: await st(), before: f0, now: await pl() });
await page.keyboard.press("KeyP"); await wait(300);
out("F resumed", await st());

// G: fullscreen toggle headless
await page.keyboard.press("KeyP"); await wait(300);
await click(640, 372); await wait(200);
await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
await wait(100);
for (let i = 0; i < 4; i++) { await page.keyboard.press("Enter"); await wait(400); }
out("G fullscreen toggled 4x", { ov: await ev(() => document.getElementById("fullscreen-overlay").style.display), fs: await ev(() => !!document.fullscreenElement), cfg: await ev(() => localStorage.getItem("souls.settings.v1")), scenes: await st() });
await page.keyboard.press("Escape"); await wait(300);
await page.keyboard.press("Escape"); await wait(300);
out("G back to game", await st());
out("LOGS", logs);
await browser.close(); server.close();
