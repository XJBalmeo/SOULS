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
const out = (n, v) => console.log("## " + n + ": " + (typeof v === "string" ? v : JSON.stringify(v)));
const box = () => ev(() => { const b = document.querySelector("canvas").getBoundingClientRect(); return { l: b.left, t: b.top, s: b.width / 1280 }; });
const mv = async (x, y) => { const r = await box(); await page.mouse.move(r.l + x * r.s, r.t + y * r.s); };
const click = async (x, y) => { await mv(x, y); await page.mouse.down(); await wait(30); await page.mouse.up(); await wait(150); };
const pl = () => ev(() => { const s = game.scene.getScene("GameScene"); return { x: Math.round(s.player.x), st: Math.round(s.player.getData("stamina")), atk: s.isAttacking, roll: s.isRolling }; });
const lcount = () => ev(() => {
  const g = game;
  const kb = g.input.keyboard;
  const counts = {};
  ["GameScene","MenuScene","PauseScene"].forEach((k) => { const s = g.scene.getScene(k); counts[k] = { kbKeydown: s.input.keyboard.listenerCount("keydown"), sceneEvents: s.events.eventNames().length, tweens: s.tweens.getTweens().length, children: s.children.length }; });
  counts.mgrKeydown = kb.listenerCount ? kb.listenerCount("keydown") : -1;
  counts.sysEv = game.events.eventNames().map((n) => n + ":" + game.events.listenerCount(n)).join(",");
  const gs = g.scene.getScene("GameScene");
  counts.rats = gs.rats && gs.rats.children ? gs.rats.getLength() : -1;
  const w = gs.physics.world; if (!w) return counts; counts.colliders = w.colliders.length; counts.bodies = w.bodies.size;
  counts.timers = gs.time._active ? gs.time._active.length : -1;
  return counts;
});
await page.goto(url, { waitUntil: "load" });
await ev(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await wait(1200);
await page.click("#fullscreen-overlay");
await wait(300);

// cycles
const rows = [];
for (let i = 0; i < 5; i++) {
  await click(640, 360);
  await page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player, { timeout: 8000 });
  await wait(600);
  await page.keyboard.press("KeyP"); await wait(250);
  if (i === 2) { await page.keyboard.press("Tab"); await wait(100); }
  rows.push(await lcount());
  await click(640, 476);
  await page.waitForFunction(() => game.scene.isActive("MenuScene"), { timeout: 8000 });
  await wait(400);
}
rows.forEach((r, i) => out("cycle" + i, r));
// Tab after re-entry
await click(640, 360);
await page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player, { timeout: 8000 });
await wait(600);
const dbg = () => ev(() => { const w = game.scene.getScene("GameScene").physics.world; return { draw: w.drawDebug, hb: game.scene.getScene("GameScene").attackHitbox.visible }; });
out("I debug initial", await dbg());
await page.keyboard.press("Tab"); await wait(100); out("I Tab1", await dbg());
await page.keyboard.press("Tab"); await wait(100); out("I Tab2", await dbg());
out("I Tab defaultPrevented/focus", await ev(() => document.activeElement && document.activeElement.tagName));

// hold click on Resume
await page.keyboard.press("KeyP"); await wait(300);
await mv(640, 320); await wait(100);
await page.mouse.down(); await wait(250);
const dn = await pl(); out("D2 mouse held after Resume", { scenes: await st(), p: dn });
await page.mouse.up(); await wait(300);

// Hold Esc from active
await page.keyboard.down("Escape"); await wait(150); await page.keyboard.down("Escape"); await wait(150); await page.keyboard.down("Escape"); await wait(300);
out("A2 hold Esc", await st());
await page.keyboard.up("Escape"); await wait(200);
out("A2 after release", await st());
await page.keyboard.press("Escape"); await wait(300);
out("A2 resumed", await st());

// rat knockback pause
await ev(() => { const s = game.scene.getScene("GameScene"); const r = s.rats.getChildren()[0]; s.player.setPosition(r.x - 20, r.y); });
await wait(200);
const rs = () => ev(() => { const s = game.scene.getScene("GameScene"); return s.rats.getChildren().map((r) => ({ a: r.active, vx: Math.round(r.body.velocity.x), hp: r.getData("hp"), kb: r.getData("knockback") || r.getData("isKnockedBack") })).slice(0, 3); });
await page.keyboard.down("KeyZ"); await wait(120); await page.keyboard.up("KeyZ");
await wait(80); out("K rats during hit", await rs());
await page.keyboard.press("KeyP"); await wait(500);
const k1 = await rs(); await wait(500); const k2 = await rs();
out("K during pause (should be frozen)", { k1, k2 });
await page.keyboard.press("KeyP"); await wait(1500);
out("K after resume", await rs());
out("LOGS", logs);
await browser.close(); server.close();
