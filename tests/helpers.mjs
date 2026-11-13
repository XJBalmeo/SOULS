// Shared Puppeteer harness for the v0.3 gameplay suites (starved, parrydeath).
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./serve.mjs";

export async function openGame(outDir) {
  const OUT = path.resolve(outDir);
  const SHOTS = path.join(OUT, "screenshots");
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await startServer(0);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  const warnings = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warn" || m.type() === "warning") warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("response", (r) => r.status() >= 400 && errors.push("HTTP " + r.status() + " " + r.url()));
  const url = "http://127.0.0.1:" + server.address().port + "/";

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
  const tap = async (code, hold = 60) => {
    await page.keyboard.down(code);
    await wait(hold);
    await page.keyboard.up(code);
  };
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + ".png") });
  const gameReady = () =>
    waitFor(() => game.scene.isActive("GameScene") && !!game.scene.getScene("GameScene").player &&
      !game.scene.getScene("GameScene").isDead);

  // Fresh campaign with a fixed layout (Level_2's long hall is room 1).
  const newCampaign = async (rooms = ["Level_0", "Level_2", "Level_1", "Level_3", "Level_4"]) => {
    await state((rooms) => {
      // Stop every other scene: a running MenuScene would also read Z/Enter.
      ["MenuScene", "ConfirmScene", "SettingsScene", "CreditsScene", "PauseScene", "DeathScene", "GameScene"]
        .forEach((k) => game.scene.isActive(k) || game.scene.isSleeping(k) ? game.scene.stop(k) : null);
      localStorage.removeItem("souls.save.v1");
      SaveManager.startNewCampaign();
      SaveManager.chapterState().rooms = rooms.map((template, i) => ({ id: "famine-room-" + i, template }));
      SaveManager.write();
      game.scene.start("GameScene");
    }, rooms);
    await gameReady();
    await wait(400);
  };

  // Clears all enemies except `keep` (a function returning one sprite), then
  // places it `distance` px from the knight on the longest indoor floor.
  // The kept enemy is frozen with state "hold" until the test releases it.
  const arena = (distance, pick) =>
    state(async ({ distance, pick }) => {
      const s = game.scene.getScene("GameScene");
      const p = s.player;
      const keep = s.getEnemySprites().find((e) => (e.getData("kind") || "rat") === pick);
      s.getEnemySprites().forEach((e) => e !== keep && e.destroy());
      if (s.arrows) s.arrows.clear(true, true);
      keep.setData({ state: "hold" });
      p.setData("hp", 100);
      p.setData("stamina", 100);
      p.setData("hitInvulnerableUntil", 0);
      p.clearTint();
      const solid = new Set();
      s.ground.getChildren().forEach((b) => {
        if (!b.isRope) solid.add(Math.round(b.body.x / 16) + "," + Math.round(b.body.y / 16));
      });
      const open = (x, y) => solid.has(x + "," + y) && [1, 2, 3, 4].every((h) => !solid.has(x + "," + (y - h))) &&
        [5, 6, 7, 8, 9, 10, 11, 12].some((h) => solid.has(x + "," + (y - h)));
      let best = null;
      for (const key of solid) {
        const [cx, cy] = key.split(",").map(Number);
        if (!open(cx, cy) || open(cx - 1, cy)) continue;
        let len = 0;
        while (open(cx + len, cy)) len++;
        if (!best || len > best.len) best = { cx, cy, len };
      }
      if (!best || best.len * 16 - 80 < distance) return { ok: false, best };
      const floorTop = best.cy * 16;
      const startX = best.cx * 16 + 40;
      p.body.reset(startX, floorTop - 50);
      p.setVelocity(0, 0);
      p.setFlipX(false);
      keep.body.reset(startX + distance, floorTop - 50);
      keep.setVelocity(0, 0);
      await new Promise((r) => setTimeout(r, 400));
      window.__enemy = keep;
      return { ok: Math.abs(keep.body.bottom - p.body.bottom) < 2, floorTiles: best.len, dx: keep.x - p.x };
    }, { distance, pick });

  const finish = async (name) => {
    check("no console errors, page errors or failed requests", errors.length === 0, errors.slice(0, 3).join(" | "));
    await browser.close();
    server.close();
    const failed = results.filter((r) => !r.ok);
    fs.writeFileSync(path.join(OUT, name + "-results.json"), JSON.stringify({
      date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, warnings,
    }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: ${SHOTS}`);
    process.exit(failed.length ? 1 : 0);
  };

  await page.goto(url, { waitUntil: "load" });
  await waitFor(() => game.scene.isActive("MenuScene"));
  return { page, url, check, wait, state, waitFor, tap, shot, gameReady, newCampaign, arena, finish, errors, warnings };
}
