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
const scenes = () => ev(() => Object.fromEntries(["MenuScene","GameScene","PauseScene","DeathScene","ConfirmScene"].map((k) => [k, game.scene.isActive(k) ? "A" : game.scene.isPaused(k) ? "P" : game.scene.isSleeping(k) ? "S" : "-"])));
const info = () => ev(() => { const s = game.scene.getScene("GameScene"); if (!s || !s.player) return null; return { hp: s.player.getData("hp"), st: Math.round(s.player.getData("stamina")), dead: s.isDead, atk: s.isAttacking, roll: s.isRolling, ang: Math.round(s.player.angle), alpha: s.player.alpha, pp: s.physics.world.isPaused, rats: s.rats.getChildren().filter((r) => r.active && r.getData("hp") > 0).length, hbEn: s.attackHitbox.body.enable, tw: s.tweens.getTweens().length, ratsTotal: s.rats.getChildren().length }; });
const say = async (n, extra) => console.log("## " + n + " " + JSON.stringify(extra === undefined ? await info() : extra) + " scenes=" + JSON.stringify(await scenes()) + " logs=" + JSON.stringify(logs.splice(0)));
async function fresh() {
  await page.goto(url, { waitUntil: "load" });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: "load" }); await wait(1200);
  await page.click("#fullscreen-overlay").catch(() => {}); await wait(200);
  await ev(() => game.scene.getScene("MenuScene").enterGame("new"));
  await page.waitForFunction(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player);
  await wait(800);
}
const hurt = (n) => ev((n) => game.scene.getScene("GameScene").takeDamage(n), n);
const waitDead = async () => { await wait(2900); };
const fsState = () => ev(() => ({ fs: !!document.fullscreenElement, ov: document.getElementById("fullscreen-overlay").style.display }));
await fresh();
// 7: esc + lethal same frame, then resume
await ev(() => { const s = game.scene.getScene("GameScene"); s.input.keyboard.emit("keydown-ESC", { repeat: false }); s.takeDamage(100); });
await wait(1000); await say("7 paused+dead");
await page.keyboard.press("Escape"); await wait(3500); await say("7 after resume +3.5s");
// 7b same, then Retry
await ev(() => { const s = game.scene.getScene("GameScene"); s.input.keyboard.emit("keydown-ESC", { repeat: false }); s.takeDamage(100); });
await wait(500);
for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
for (let i = 0; i < 6; i++) await page.keyboard.press("Enter");
await wait(3500); await say("7b retry spam while dead+paused");
// 8 retry spam normal
await page.keyboard.press("Escape"); await wait(400); await say("8 pause open");
for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
for (let i = 0; i < 6; i++) await page.keyboard.press("Enter");
await wait(1500); await say("8 after retry spam");
// 9 five deaths
const base = await info();
for (let i = 0; i < 5; i++) { await hurt(100); await wait(3200); }
await say("9 after 5 deaths", { before: base, after: await info() });
await say("9 counts", await ev(() => { const s = game.scene.getScene("GameScene"); return { esc: s.input.keyboard.listenerCount("keydown-ESC"), resume: s.events.listenerCount("resume"), kids: s.children.list.length, bodies: s.physics.world.bodies.size, scenes: game.scene.scenes.length }; }));
// 10 rat during death
await ev(() => { const s = game.scene.getScene("GameScene"); const r = s.rats.getChildren().find((x) => x.active); window.__r = r; s.player.setData("hp", 20); r.body.reset(s.player.x + 20, s.player.y); window.__rx = r.x; s.takeDamage(20); });
await wait(1000); await say("10 rat during death", await ev(() => ({ rx0: window.__rx, rx1: window.__r.x, vx: window.__r.body.velocity.x, rstate: window.__r.getData("state") })));
await waitDead();
// 11 out of world
await ev(() => { const s = game.scene.getScene("GameScene"); s.player.body.reset(s.player.x, 6000); });
await wait(3000); await say("11 knight at y=6000", await ev(() => ({ y: game.scene.getScene("GameScene").player.y })));
await ev(() => { const s = game.scene.getScene("GameScene"); s.player.body.reset(-500, 100); });
await wait(3000); await say("11b knight at x=-500", await ev(() => ({ x: game.scene.getScene("GameScene").player.x, y: game.scene.getScene("GameScene").player.y })));
// 12 HUD
await ev(() => { const s = game.scene.getScene("GameScene"); s.takeDamage(60); s.consumeStamina(80); });
await wait(1200); await hurt(100); await waitDead();
await say("12 HUD after respawn", await ev(() => { const s = game.scene.getScene("GameScene"); const out = {}; Object.keys(s).filter((k) => /hud/i.test(k)).forEach((k) => { const o = s[k]; if (o && o.displayWidth !== undefined) out[k] = Math.round(o.displayWidth); }); out.max = s.HUD_MAX_WIDTH; return out; }));
// 13 menu start mid-fall
await hurt(100); await wait(300);
await ev(() => game.scene.getScene("GameScene").scene.start("MenuScene"));
await wait(3500); await say("13 menu during fall", {});
await wait(300);
// 14 New Game over save, rapid Enter
await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await wait(400);
await say("14 menu double Enter", {});
await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await wait(3000);
await say("14b confirm+extra enters");
await browser.close(); server.close();
