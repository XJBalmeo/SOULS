// Famine v0.2 Combat & Survival tests: per-strike damage, death and
// checkpoint restore, retry, saves, Continue, New Game confirmation and
// save safety. Usage: npm run test:survival
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./serve.mjs";

const OUT = path.resolve("docs/builds/v0.2");
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

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail ? "  — " + detail : ""));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (fn, arg) => page.evaluate(fn, arg);
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
const stored = () => state(() => JSON.parse(localStorage.getItem("souls.save.v1")));
const run = () =>
  state(() => {
    const s = game.scene.getScene("GameScene");
    const p = s.player;
    return {
      hp: p.getData("hp"),
      stamina: p.getData("stamina"),
      x: p.x,
      angle: p.angle,
      alpha: p.alpha,
      dead: s.isDead,
      physicsPaused: s.physics.world.isPaused,
      ratsAlive: s.rats.getChildren().filter((r) => r.active && r.getData("hp") > 0).length,
      rooms: s.roomPlan.join(","),
    };
  });
const gameReady = () =>
  waitFor(() => game.scene.isActive("GameScene") && !!game.scene.getScene("GameScene").player && !game.scene.getScene("GameScene").isDead);
// Pins a rat right in front of the knight and stops its AI from moving it.
const pinRatInFront = (hp) =>
  state((hp) => {
    const s = game.scene.getScene("GameScene");
    const p = s.player;
    const rat = s.rats.getChildren().find((r) => r.active && r.getData("hp") > 0);
    p.setFlipX(false);
    rat.setData("hp", hp);
    rat.setData("state", "recover");
    rat.setData("recoverUntil", s.time.now + 60000);
    rat.body.reset(p.x + 35, p.y);
    rat.setVelocity(0, 0);
    window.__testRat = rat;
    return rat.getData("hp");
  }, hp);
const ratHp = () => state(() => (window.__testRat.active ? window.__testRat.getData("hp") : "destroyed"));
const goToMenu = async () => {
  await page.goto("http://127.0.0.1:" + server.address().port + "/", { waitUntil: "load" });
  await waitFor(() => game.scene.isActive("MenuScene"));
  await wait(400);
};

try {
  await page.goto("http://127.0.0.1:" + server.address().port + "/", { waitUntil: "load" });
  await state(() => localStorage.clear());
  await goToMenu();
  check("no save: Continue disabled", await state(() => SaveManager.inspect().status === "none"));

  // --- New Game writes a campaign with a fixed layout ---
  await press("Enter");
  check("New Game without a save starts directly (no confirm)", await gameReady());
  await wait(1200);
  let save = await stored();
  const firstRun = await run();
  check("save written with version, campaign and checkpoint",
    save && save.version === 1 && save.chapter === "famine" && save.chapters.famine.checkpointId === "famine-start" && save.parryDeathUsed === false,
    JSON.stringify({ v: save && save.version, cp: save && save.chapters.famine.checkpointId }));
  check("save lists 5 room instances with stable unique IDs",
    save.chapters.famine.rooms.length === 5 && save.chapters.famine.rooms.every((r, i) => r.id === "famine-room-" + i),
    save.chapters.famine.rooms.map((r) => r.template).join(","));
  check("built layout matches the save", firstRun.rooms === save.chapters.famine.rooms.map((r) => r.template).join(","));
  const campaignId = save.campaignId;
  const ratsAtStart = firstRun.ratsAlive;

  // --- Per-strike damage through the real sword ---
  await pinRatInFront(3);
  await press("KeyZ");
  await wait(700);
  check("one sword swing deals exactly one hit (3 -> 2)", (await ratHp()) === 2, String(await ratHp()));
  await wait(400);
  await press("KeyZ");
  await wait(700);
  check("second swing deals the next hit (2 -> 1)", (await ratHp()) === 1, String(await ratHp()));
  const sameStrike = await state(() => {
    const s = game.scene.getScene("GameScene");
    const rat = window.__testRat;
    s.damageEnemy(rat, 1);
    s.damageEnemy(rat, 1);
    return rat.getData("hp");
  });
  check("repeat hits within one strike are ignored (shared damage path)", sameStrike === 1, String(sameStrike));
  await wait(400);
  await press("KeyZ");
  await wait(900);
  check("third swing kills the rat", (await ratHp()) === "destroyed", String(await ratHp()));
  check("one fewer rat alive", (await run()).ratsAlive === ratsAtStart - 1, (await run()).ratsAlive + " of " + ratsAtStart);

  // --- Normal death from an enemy attack ---
  await state(() => {
    const s = game.scene.getScene("GameScene");
    s.player.setData("hp", 20); // one rat bite left
    s.player.setData("hitInvulnerableUntil", 0);
    const p = s.player;
    const rat = s.rats.getChildren().find((r) => r.active && r.getData("hp") > 0);
    rat.body.reset(p.x + 40, p.y);
    rat.setData("state", "pursue");
    rat.setData("lastAttackTime", -99999);
  });
  const diedFromRat = await waitFor(() => game.scene.getScene("GameScene").isDead, 8000);
  check("a rat bite at 20 HP kills the knight (normal death)", diedFromRat);
  if (!diedFromRat) {
    // Fall back to the same damage path so the rest of the death flow is still tested.
    await state(() => game.scene.getScene("GameScene").takeDamage(999));
  }
  let r = await run();
  check("death locks the knight: HP 0, physics paused", r.dead && r.hp === 0 && r.physicsPaused, JSON.stringify(r));
  await press("KeyP");
  check("pause is blocked while dead", !(await state(() => game.scene.isActive("PauseScene"))));
  check("death screen appears", await waitFor(() => game.scene.isActive("DeathScene"), 3000));
  await wait(600);
  await shot("01-death-screen");

  check("respawns at the checkpoint after the death screen", await gameReady(), "");
  await wait(800);
  r = await run();
  check("respawn: full HP and stamina", r.hp === 100 && r.stamina === 100, JSON.stringify(r));
  check("respawn: same map layout", r.rooms === firstRun.rooms, r.rooms);
  check("respawn: regular enemies reset (killed rat is back)", r.ratsAlive === ratsAtStart, r.ratsAlive + " of " + ratsAtStart);
  check("respawn: knight upright and visible, physics running", r.angle === 0 && r.alpha === 1 && !r.physicsPaused);
  check("death screen closed", !(await state(() => game.scene.isActive("DeathScene"))));
  const beforeMove = r.x;
  await press("KeyD", 500);
  check("respawn: controls work", (await run()).x > beforeMove + 10);
  await shot("02-respawn");
  check("death did not rewrite the campaign", (await stored()).campaignId === campaignId);

  // --- Retry from Checkpoint in the pause menu ---
  await state(() => {
    const s = game.scene.getScene("GameScene");
    s.takeDamage(40);
    s.consumeStamina(50);
  });
  await press("KeyP");
  await waitFor(() => game.scene.isActive("PauseScene"));
  await press("ArrowDown");
  await press("ArrowDown"); // Retry from Checkpoint
  await shot("03-pause-retry");
  await press("Enter");
  check("Retry restarts from the checkpoint", await gameReady());
  await wait(500);
  r = await run();
  check("Retry: full HP/stamina, same layout, enemies reset",
    r.hp === 100 && r.stamina === 100 && r.rooms === firstRun.rooms && r.ratsAlive === ratsAtStart, JSON.stringify(r));
  check("Retry closes the pause menu", !(await state(() => game.scene.isActive("PauseScene") || game.scene.isPaused("GameScene"))));

  // --- Continue after a full reload ---
  await goToMenu();
  check("after reload: valid save found", await state(() => SaveManager.inspect().status === "ok"));
  await shot("04-menu-continue");
  await press("ArrowDown");
  await press("Enter");
  check("Continue enters the game", await gameReady());
  await wait(800);
  r = await run();
  check("Continue: same campaign and same layout", r.rooms === firstRun.rooms && (await stored()).campaignId === campaignId, r.rooms);
  check("Continue: full HP/stamina, all regular enemies", r.hp === 100 && r.ratsAlive === ratsAtStart);

  // --- New Game confirmation ---
  await goToMenu();
  await press("Enter");
  check("New Game with a save asks for confirmation", await waitFor(() => game.scene.isActive("ConfirmScene")));
  await shot("05-new-game-confirm");
  await press("Enter"); // Cancel is selected first
  check("Cancel returns to the menu", await waitFor(() => game.scene.isActive("MenuScene") && !game.scene.isActive("ConfirmScene")));
  check("Cancel keeps the save", (await stored()).campaignId === campaignId);
  await press("Enter");
  await waitFor(() => game.scene.isActive("ConfirmScene"));
  await press("ArrowDown");
  await press("Enter"); // Begin Anew
  check("Begin Anew starts a new game", await gameReady());
  await wait(800);
  save = await stored();
  check("Begin Anew replaces the campaign", save.campaignId !== campaignId && save.parryDeathUsed === false && save.chapters.famine.rooms.length === 5);

  // --- Unreadable save ---
  await state(() => localStorage.setItem("souls.save.v1", "{broken"));
  await goToMenu();
  const corruptMenu = await state(() => ({
    status: SaveManager.inspect().status,
    continueColor: game.scene.getScene("MenuScene").children.list.find((c) => c.text === "Continue").style.color,
  }));
  check("unreadable save: Continue disabled", corruptMenu.status === "corrupt" && corruptMenu.continueColor === "#46503f", JSON.stringify(corruptMenu));
  await press("ArrowDown");
  await shot("06-corrupt-save-hint");
  check("unreadable save: hint explains it is kept", await state(() =>
    game.scene.getScene("MenuScene").children.list.some((c) => c.text && c.text.includes("could not be read"))));
  await press("ArrowUp");
  await press("Enter");
  check("unreadable save: New Game asks for confirmation", await waitFor(() => game.scene.isActive("ConfirmScene")));
  await press("ArrowDown");
  await press("Enter");
  await gameReady();
  await wait(500);
  check("unreadable save copied aside before replacing", (await state(() => localStorage.getItem("souls.save.v1.unreadable"))) === "{broken");
  check("new valid save written", await state(() => SaveManager.inspect().status === "ok"));

  // --- Save safety rules (SaveManager directly) ---
  const safety = await state(() => {
    const out = {};
    const mine = SaveManager.campaign;
    // Stale tab: another tab started a different campaign.
    const other = JSON.parse(JSON.stringify(mine));
    other.campaignId = "other-tab";
    localStorage.setItem(SaveManager.KEY, JSON.stringify(other));
    out.staleWrite = SaveManager.write();
    out.staleStopped = SaveManager.persistent === false;
    out.otherKept = JSON.parse(localStorage.getItem(SaveManager.KEY)).campaignId === "other-tab";
    // Same campaign: parryDeathUsed never goes back to false.
    SaveManager.persistent = true;
    const sameButUsed = JSON.parse(JSON.stringify(mine));
    sameButUsed.parryDeathUsed = true;
    localStorage.setItem(SaveManager.KEY, JSON.stringify(sameButUsed));
    mine.parryDeathUsed = false;
    out.mergeWrite = SaveManager.write();
    out.flagMerged = mine.parryDeathUsed === true && JSON.parse(localStorage.getItem(SaveManager.KEY)).parryDeathUsed === true;
    // Validation.
    const dup = JSON.parse(JSON.stringify(mine));
    dup.chapters.famine.rooms[1].id = dup.chapters.famine.rooms[0].id;
    out.duplicateRejected = /duplicate/.test(SaveManager.validate(dup) || "");
    out.badChapterRejected = !!SaveManager.validate({ ...mine, completedChapters: ["war?"] });
    out.futureVersionRejected = !!SaveManager.validate({ ...mine, version: 2 });
    out.extraFieldAllowed = SaveManager.validate({ ...mine, futureField: 1 }) === null;
    return out;
  });
  check("stale tab cannot overwrite another campaign", safety.staleWrite === false && safety.staleStopped && safety.otherKept, JSON.stringify(safety));
  check("parryDeathUsed merges monotonically", safety.mergeWrite && safety.flagMerged);
  check("validation rejects duplicate room IDs, bad chapters, unknown versions", safety.duplicateRejected && safety.badChapterRejected && safety.futureVersionRejected);
  check("validation allows extra fields for later builds", safety.extraFieldAllowed);

  const unavailable = await state(() => {
    const real = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("storage denied"); } });
    let result;
    try {
      const status = SaveManager.inspect().status;
      const c = SaveManager.startNewCampaign();
      result = { status, hasCampaign: !!c, persistent: SaveManager.persistent };
    } catch (e) {
      result = { threw: e.message };
    }
    Object.defineProperty(window, "localStorage", real);
    return result;
  });
  check("storage unavailable: reported, game keeps a campaign in memory, no crash",
    unavailable.status === "unavailable" && unavailable.hasCampaign && unavailable.persistent === false, JSON.stringify(unavailable));
} catch (e) {
  check("test run completed without exception", false, e.stack);
}

const expectedWarnings = /could not be saved|no longer saved|unreadable|Could not enter fullscreen/;
const unexpected = warnings.filter((w) => !expectedWarnings.test(w));
check("no unexpected console warnings", unexpected.length === 0, unexpected.slice(0, 3).join(" | "));
check("no console errors, page errors or failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));

await browser.close();
server.close();
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(OUT, "survival-results.json"),
  JSON.stringify({ date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, warnings }, null, 2));
console.log("\n" + (results.length - failed.length) + "/" + results.length + " passed. Screenshots: " + SHOTS);
process.exit(failed.length ? 1 : 0);
