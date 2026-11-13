// Hollow Archer demo tests: spawn from LDtk, telegraph timing, arrow damage,
// crouch and roll dodges, reload window, sight, backstep, sword kill and
// checkpoint reset. Usage: npm run test:archer
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./serve.mjs";

const OUT = path.resolve("docs/builds/v0.3-archer-demo");
const SHOTS = path.join(OUT, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const server = await startServer(0);
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => r.status() >= 400 && errors.push("HTTP " + r.status() + " " + r.url()));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail ? "  — " + detail : ""));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (fn, arg) => page.evaluate(fn, arg);
const waitFor = async (fn, timeout = 8000, arg) => {
  try {
    await page.waitForFunction(fn, { timeout, polling: 16 }, arg);
    return true;
  } catch {
    return false;
  }
};
const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + ".png") });
const gameReady = () =>
  waitFor(() => game.scene.isActive("GameScene") && !!game.scene.getScene("GameScene").player && !game.scene.getScene("GameScene").isDead);

// Arena: removes rats, then moves one archer onto the knight's floor at the
// given distance (trying both sides) with a clear line of sight. The archer
// is frozen (state "hold") until the test releases it.
const arena = (distance) =>
  state(async (distance) => {
    const s = game.scene.getScene("GameScene");
    const p = s.player;
    s.rats.getChildren().slice().forEach((r) => r.destroy());
    s.arrows.getChildren().slice().forEach((a) => a.destroy());
    const archers = s.archers.getChildren().filter((a) => a.active);
    archers.slice(1).forEach((a) => a.destroy());
    const a = archers[0];
    a.setData({ hp: 2, state: "hold", nextBackstepAt: 1e12, stepping: false });
    a.anims.play("archer_idle");
    p.setData("hp", 100);
    p.setData("hitInvulnerableUntil", 0);
    p.clearTint();
    // Longest indoor stretch of floor.
    const solid = new Set();
    s.ground.getChildren().forEach((b) => {
      if (!b.isRope) solid.add(Math.round(b.body.x / 16) + "," + Math.round(b.body.y / 16));
    });
    let best = null;
    // Indoors: 4 free tiles above the floor and a ceiling within 12 (not a roof).
    const open = (x, y) => solid.has(x + "," + y) && [1, 2, 3, 4].every((h) => !solid.has(x + "," + (y - h))) &&
      [5, 6, 7, 8, 9, 10, 11, 12].some((h) => solid.has(x + "," + (y - h)));
    for (const key of solid) {
      const [cx, cy] = key.split(",").map(Number);
      if (!open(cx, cy) || open(cx - 1, cy)) continue; // start of an open run only
      let len = 0;
      while (open(cx + len, cy)) len++;
      if (!best || len > best.len) best = { cx, cy, len };
    }
    const floorTop = best.cy * 16;
    const startX = best.cx * 16 + 40;
    if ((best.len * 16) - 80 < distance) return { ok: false, best };
    p.body.reset(startX, floorTop - 50);
    p.setVelocity(0, 0);
    a.body.reset(startX + distance, floorTop - 50);
    a.setVelocity(0, 0);
    await new Promise((r) => setTimeout(r, 400));
    const level = Math.abs(a.body.bottom - p.body.bottom) < 2;
    window.__archer = a;
    return { ok: level, floorTiles: best.len, dx: a.x - p.x };
  }, distance);
const release = () => state(() => window.__archer.setData("state", "idle"));
const knight = () =>
  state(() => {
    const s = game.scene.getScene("GameScene");
    const a = window.__archer;
    return {
      hp: s.player.getData("hp"),
      x: s.player.x,
      archerX: a && a.active ? a.x : null,
      archerHp: a && a.active ? a.getData("hp") : 0,
      archerState: a && a.active ? a.getData("state") : "gone",
      anim: a && a.active ? a.anims.currentAnim && a.anims.currentAnim.key : null,
      arrows: s.arrows.getChildren().filter((x) => x.active).length,
    };
  });
// Faces the knight toward the archer.
const faceArcher = () => state(() => game.scene.getScene("GameScene").player.setFlipX(window.__archer.x < game.scene.getScene("GameScene").player.x));

await page.goto("http://127.0.0.1:" + server.address().port + "/", { waitUntil: "load" });
await waitFor(() => game.scene.isActive("MenuScene"));
await state(() => {
  localStorage.clear();
  SaveManager.startNewCampaign();
  // Fixed layout with Level_2's long hall so the arena tests have room.
  SaveManager.chapterState().rooms = ["Level_0", "Level_2", "Level_1", "Level_3", "Level_4"].map((template, i) => ({ id: "famine-room-" + i, template }));
  SaveManager.write();
  game.scene.getScene("MenuScene").scene.start("GameScene");
});
await gameReady();
await wait(500);

const spawn = await state(() => {
  const s = game.scene.getScene("GameScene");
  const expected = s.roomPlan.filter((r) => /Level_[123]$/.test(String(r.template || r))).length;
  const grounded = s.archers.getChildren().filter((a) => a.body.blocked.down).length;
  return { archers: s.archers.getLength(), grounded, expected, plan: JSON.stringify(s.roomPlan) };
});
check("archers spawn from LDtk, one per middle room", spawn.archers > 0 && spawn.archers === spawn.expected, JSON.stringify(spawn));
check("every placed archer stands on a floor", spawn.grounded === spawn.archers, JSON.stringify(spawn));

// 1. Telegraph then a standing hit.
let a = await arena(220);
check("test arena found", a.ok, JSON.stringify(a));
await faceArcher();
await release();
const t0 = Date.now();
check("archer starts drawing when it sees the knight", await waitFor(() => window.__archer.getData("state") === "draw", 1000));
await wait(650);
await shot("01-draw-glint");
check("arrow released after the ~800 ms warning", await waitFor(() => game.scene.getScene("GameScene").arrows.getLength() > 0, 1500));
const r0 = Date.now();
const telegraph = r0 - t0;
check("warning lasts 700–1100 ms", telegraph >= 700 && telegraph <= 1100, telegraph + " ms");
await wait(150);
await shot("02-arrow-in-flight");
check("standing knight is hit for 15", await waitFor(() => game.scene.getScene("GameScene").player.getData("hp") === 85, 2000), JSON.stringify(await knight()));
check("arrow is removed on hit", (await knight()).arrows === 0);
check("archer reloads after firing", (await knight()).archerState === "reload");
check("no new draw during the 1.5 s reload", await waitFor(() => window.__archer.getData("state") === "draw", 3000));
const reload = Date.now() - r0;
check("reload window about 1.5 s", reload >= 1100 && reload <= 1900, reload + " ms");

// 2. Crouch under the arrow.
a = await arena(220);
await faceArcher();
await page.keyboard.down("KeyS");
await wait(200);
await release();
await waitFor(() => game.scene.getScene("GameScene").arrows.getLength() > 0, 2000);
await wait(300);
await shot("03-crouch-dodge");
const passed = await waitFor(() => {
  const s = game.scene.getScene("GameScene");
  return s.arrows.getLength() === 0;
}, 3000);
await page.keyboard.up("KeyS");
let k = await knight();
check("crouching knight is not hit (arrow passes over)", passed && k.hp === 100, JSON.stringify(k));

// 3. Roll through the arrow.
a = await arena(260);
await faceArcher();
await release();
await waitFor(() => game.scene.getScene("GameScene").arrows.getLength() > 0, 2000);
await waitFor(() => {
  const s = game.scene.getScene("GameScene");
  const arrow = s.arrows.getChildren()[0];
  return arrow && Math.abs(arrow.x - s.player.x) < 90;
}, 2000);
await page.keyboard.down("KeyX");
await wait(60);
await page.keyboard.up("KeyX");
await waitFor(() => game.scene.getScene("GameScene").arrows.getLength() === 0, 3000);
k = await knight();
check("rolling knight passes through the arrow", k.hp === 100, JSON.stringify(k));

// 4. Out of sight / range: no draw.
a = await arena(220);
await state(() => game.scene.getScene("GameScene").player.body.reset(window.__archer.x - 430, window.__archer.y));
await release();
await wait(900);
k = await knight();
check("archer stays idle when the knight is out of range", k.archerState === "idle" && k.arrows === 0, JSON.stringify(k));

// 5. Backstep when the knight comes close.
a = await arena(55);
await state(() => window.__archer.setData({ nextBackstepAt: 0, state: "reload", reloadUntil: game.scene.getScene("GameScene").time.now + 5000 }));
const before = (await knight()).archerX;
await wait(900);
k = await knight();
const stepped = Math.abs(k.archerX - before);
check("archer hops back once when the knight gets close", stepped > 25, "moved " + stepped.toFixed(1) + " px");

// 6. Two sword hits kill it.
a = await arena(30);
await faceArcher();
await state(() => window.__archer.setData({ state: "reload", reloadUntil: game.scene.getScene("GameScene").time.now + 60000 }));
await page.keyboard.down("KeyZ"); await wait(60); await page.keyboard.up("KeyZ");
await wait(700);
check("first sword hit: archer at 1 HP", (await knight()).archerHp === 1, JSON.stringify(await knight()));
await page.keyboard.down("KeyZ"); await wait(60); await page.keyboard.up("KeyZ");
await wait(700);
check("second sword hit kills the archer", (await knight()).archerState === "gone", JSON.stringify(await knight()));
await shot("04-archer-killed");

// 7. Checkpoint restart brings archers back and clears arrows.
await state(() => game.scene.getScene("GameScene").restartFromCheckpoint());
await wait(400);
await gameReady();
const after = await state(() => {
  const s = game.scene.getScene("GameScene");
  return { archers: s.archers.getLength(), arrows: s.arrows.getLength() };
});
check("restart restores every archer and clears arrows", after.archers === spawn.expected && after.arrows === 0, JSON.stringify(after));

// 8. A real game moment for review.
await shot("05-in-room");
check("no console errors, page errors or failed requests", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, "archer-results.json"), JSON.stringify({ date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: ${SHOTS}`);
process.exit(failed.length ? 1 : 0);
