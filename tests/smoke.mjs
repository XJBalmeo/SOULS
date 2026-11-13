// Famine v0.1 smoke test: launch, menu, settings, credits, new game,
// baseline movement/combat, pause, quit to menu and re-entry.
// Usage: npm run test:smoke   (headless Chrome via the bundled Puppeteer)
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./serve.mjs";

const SHOTS = path.resolve("docs/builds/v0.1/screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const server = await startServer(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
const warnings = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  if (m.type() === "warn" || m.type() === "warning") warnings.push(m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (fn, arg) => page.evaluate(fn, arg);
const sceneStatus = () =>
  state(() =>
    Object.fromEntries(
      ["MenuScene", "GameScene", "PauseScene", "SettingsScene", "CreditsScene"].map((k) => [
        k,
        game.scene.isActive(k) ? "active" : game.scene.isPaused(k) ? "paused" : game.scene.isSleeping(k) ? "sleeping" : "off",
      ]),
    ),
  );
const waitFor = async (fn, timeout = 8000) => {
  try {
    await page.waitForFunction(fn, { timeout, polling: 50 });
    return true;
  } catch {
    return false;
  }
};
const press = async (key, hold = 60) => {
  await page.keyboard.down(key);
  await wait(hold);
  await page.keyboard.up(key);
  await wait(120);
};
const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + ".png") });
const player = () =>
  state(() => {
    const s = game.scene.getScene("GameScene");
    const p = s.player;
    return {
      x: p.x,
      y: p.y,
      vy: p.body.velocity.y,
      onFloor: p.body.blocked.down || p.body.touching.down,
      hp: p.getData("hp"),
      stamina: p.getData("stamina"),
      attacking: s.isAttacking,
      rolling: s.isRolling,
      rats: s.rats ? s.rats.getLength() : -1,
      ratsAlive: s.rats ? s.rats.getChildren().filter((r) => r.active).length : -1,
    };
  });

try {
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("souls.settings.v1"));
  await page.reload({ waitUntil: "load" });

  check("Phaser 3.80.1 loaded", (await state(() => Phaser.VERSION)) === "3.80.1");
  check("boots into MenuScene", await waitFor(() => game.scene.isActive("MenuScene")));
  check("click-to-start overlay shown", await state(() => document.getElementById("fullscreen-overlay").style.display !== "none"));
  await shot("01-overlay");

  await press("Enter");
  check("menu ignores keys behind overlay", (await sceneStatus()).GameScene === "off");

  await page.click("#fullscreen-overlay");
  await wait(400);
  check("overlay dismissed by click", await state(() => document.getElementById("fullscreen-overlay").style.display === "none"));
  await shot("02-main-menu");

  const continueColor = await state(() =>
    game.scene.getScene("MenuScene").children.list.find((c) => c.text && c.text.includes("Continue")).style.color,
  );
  check("Continue shown disabled", continueColor === "#46503f", continueColor);

  await press("ArrowDown"); // Continue
  await shot("03-continue-hint");
  const hint = await state(() =>
    game.scene.getScene("MenuScene").children.list.some((c) => c.text && c.text.startsWith("No saved journey")),
  );
  check("Continue explains why unavailable", hint);
  await press("Enter");
  check("disabled Continue does nothing", (await sceneStatus()).GameScene === "off");

  await press("ArrowDown"); // Settings
  await press("Enter");
  check("Settings opens from menu", await waitFor(() => game.scene.isActive("SettingsScene")));
  check("menu sleeps under settings", (await sceneStatus()).MenuScene === "sleeping");
  await press("ArrowRight"); // master 0.8 -> 0.9
  const saved = await state(() => JSON.parse(localStorage.getItem("souls.settings.v1")));
  check("master volume change persisted", saved && saved.masterVolume === 0.9, JSON.stringify(saved));
  const soundVolume = await state(() => game.sound.volume); // WebAudio gain is float32
  check("master volume applied to sound manager", Math.abs(soundVolume - 0.9) < 1e-6, String(soundVolume));
  await shot("04-settings");
  await press("Escape");
  check("Esc returns from settings to menu", await waitFor(() => game.scene.isActive("MenuScene") && !game.scene.isActive("SettingsScene")));

  await press("ArrowDown"); // Credits
  await press("Enter");
  check("Credits opens", await waitFor(() => game.scene.isActive("CreditsScene")));
  await shot("05-credits");
  await press("Escape");
  check("Credits back to menu", await waitFor(() => game.scene.isActive("MenuScene")));

  await wait(300);
  await press("Enter"); // menu restarted, New Game selected
  check("New Game starts GameScene", await waitFor(() => game.scene.isActive("GameScene") && !!game.scene.getScene("GameScene").player));
  await wait(1500); // settle onto the floor
  let p = await player();
  check("hero spawned with full HP/stamina", p.hp === 100 && p.stamina === 100, JSON.stringify(p));
  check("rats spawned", p.ratsAlive > 0, `rats=${p.ratsAlive}`);
  await shot("06-gameplay");

  const startX = p.x;
  await press("KeyD", 600);
  p = await player();
  check("move right (D)", p.x > startX + 20, `dx=${(p.x - startX).toFixed(1)}`);
  const leftStart = p.x;
  await press("ArrowLeft", 400);
  p = await player();
  check("move left (←)", p.x < leftStart - 10, `dx=${(p.x - leftStart).toFixed(1)}`);

  await wait(600);
  const groundY = (await player()).y;
  await page.keyboard.down("Space");
  await wait(150);
  p = await player();
  await page.keyboard.up("Space");
  check("jump (Space)", p.y < groundY - 5 || p.vy < 0, `dy=${(p.y - groundY).toFixed(1)} vy=${p.vy.toFixed(0)}`);
  await wait(1500);

  await page.keyboard.down("KeyZ");
  await wait(80);
  p = await player();
  await page.keyboard.up("KeyZ");
  check("sword attack (Z) uses stamina", p.attacking && p.stamina < 100, `stamina=${p.stamina}`);
  await shot("07-attack");
  await wait(1500);

  await press("KeyX");
  p = await player();
  check("roll (X)", p.rolling || p.stamina < 100, `rolling=${p.rolling} stamina=${p.stamina}`);
  await wait(1500);

  await press("KeyP");
  check("P opens pause menu", await waitFor(() => game.scene.isActive("PauseScene")));
  check("gameplay paused under menu", (await sceneStatus()).GameScene === "paused");
  await shot("08-pause");
  const pausedX = (await player()).x;
  await press("KeyD", 300);
  check("hero frozen while paused", Math.abs((await player()).x - pausedX) < 0.01);

  await press("ArrowDown"); // Settings
  await press("Enter");
  check("Settings opens from pause", await waitFor(() => game.scene.isActive("SettingsScene")));
  for (let i = 0; i < 4; i++) await press("ArrowDown"); // Show Hitboxes
  await press("Enter");
  check("hitbox toggle applies to running game", await state(() => game.scene.getScene("GameScene").physics.world.drawDebug === true));
  await shot("09-settings-over-pause");
  await press("Escape");
  check("settings returns to pause", await waitFor(() => game.scene.isActive("PauseScene") && !game.scene.isActive("SettingsScene")));
  await press("ArrowDown"); // Retry (disabled)
  await press("Enter");
  check("disabled retry does nothing", (await sceneStatus()).PauseScene === "active");
  await press("Escape");
  check("Esc resumes game", await waitFor(() => game.scene.isActive("GameScene") && !game.scene.isActive("PauseScene")));
  const resumeX = (await player()).x;
  await press("KeyD", 400);
  check("controls work after resume", (await player()).x > resumeX + 10);

  await press("KeyP");
  await waitFor(() => game.scene.isActive("PauseScene"));
  for (let i = 0; i < 3; i++) await press("ArrowDown"); // Quit
  await press("Enter");
  check("Quit returns to main menu", await waitFor(() => game.scene.isActive("MenuScene") && !game.scene.isActive("GameScene")));

  await wait(300);
  await press("Enter");
  check("second New Game starts cleanly", await waitFor(() => game.scene.isActive("GameScene") && !!game.scene.getScene("GameScene").player));
  await wait(1500);
  p = await player();
  check("re-entry: fresh hero and rats", p.hp === 100 && p.ratsAlive > 0, JSON.stringify(p));
  const reX = p.x;
  await press("KeyD", 500);
  check("re-entry: movement works", (await player()).x > reX + 10);
  await shot("10-second-run");

  await page.reload({ waitUntil: "load" });
  await waitFor(() => game.scene.isActive("MenuScene"));
  const reloaded = await state(() => SoulsSettings.load());
  check("settings survive reload", reloaded.masterVolume === 0.9 && reloaded.showHitboxes === true, JSON.stringify(reloaded));
  const corrupt = await state(() => {
    localStorage.setItem("souls.settings.v1", "{not json");
    return SoulsSettings.load();
  });
  check("corrupt settings fall back to defaults", corrupt.masterVolume === 0.8 && corrupt.fullscreen === true);
  await state(() => localStorage.removeItem("souls.settings.v1"));
} catch (e) {
  check("test run completed without exception", false, e.stack);
}

const animWarnings = warnings.filter((w) => w.includes("Animation key exists") || w.includes("Texture key already in use"));
check("no duplicate animation/texture warnings on re-entry", animWarnings.length === 0, animWarnings.slice(0, 3).join(" | "));
check("no console errors, page errors or failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
const report = { date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, warnings };
fs.writeFileSync(path.resolve("docs/builds/v0.1/smoke-results.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.passed}/${results.length} passed. Warnings: ${warnings.length}. Screenshots: ${SHOTS}`);
process.exit(failed.length ? 1 : 0);
