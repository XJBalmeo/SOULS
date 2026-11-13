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
const cnt = () => ev(() => { const s = game.scene.getScene("GameScene"); return { kids: s.children.list.length, bodies: s.physics.world.bodies.size, tex: Object.keys(game.textures.list).length, tweens: s.tweens.getTweens().length, timers: s.time._active.length, anims: game.anims.anims.size, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1 }; });
console.log("before", JSON.stringify(await cnt()));
for (let i = 0; i < 8; i++) { await hurt(100); await wait(3200); }
console.log("after 8", JSON.stringify(await cnt()), JSON.stringify(logs.splice(0)));
// rat attack at death: put rat in attack state adjacent then lethal bite via real overlap
await ev(() => { const s = game.scene.getScene("GameScene"); const p = s.player; p.setData("hp", 20); const r = s.rats.getChildren().find((x) => x.active); window.__r = r; r.body.reset(p.x + 30, p.y); p.setFlipX(false); });
await wait(2500); await say("rat bite natural", await ev(() => ({ rstate: window.__r.getData("state"), dead: game.scene.getScene("GameScene").isDead })));
await wait(3500); await say("after rat natural death");
// real roll
await page.keyboard.down("KeyD"); await wait(100); await page.keyboard.press("KeyX"); await wait(60);
console.log("roll real", await ev(() => game.scene.getScene("GameScene").isRolling));
await hurt(100); await page.keyboard.up("KeyD"); await wait(100); await say("dead mid real roll"); await wait(3000); await say("after");
await browser.close(); server.close();
