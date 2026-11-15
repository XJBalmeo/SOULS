// QA: which arrival animation each way into the game uses (owner 2026-11-15).
// New Game / Continue from the main menu -> beam + NEW_SPAWN.
// Death by a failed Death parry, or death with the parry already used -> NEW_RESPAWN (full screen, no beam).
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { page, state, wait, waitFor, check, waitForStrike } = g;

// Records which arrival animation the next GameScene start uses.
const arrival = () => state(() => new Promise((resolve) => {
  const seen = { beam: false, spawn: false, respawn: false };
  const t0 = performance.now();
  let started = false;
  const tick = () => {
    const s = game.scene.getScene("GameScene");
    if (s && s.sys.isActive() && s.isSpawning) started = true;
    if (started) {
      if (s.spawnBeam && s.spawnBeam.active) seen.beam = true;
      if (s.player && s.player.anims.currentAnim?.key === "spawn") seen.spawn = true;
      if (s.respawnAnim && s.respawnAnim.active) seen.respawn = true;
      if (!s.isSpawning) return resolve(seen);
    }
    if (performance.now() - t0 > 20000) return resolve({ ...seen, timeout: true });
    requestAnimationFrame(tick);
  };
  tick();
}));
// The same calls the main menu's New Game / Continue entries make.
const menuSelect = async (label) => {
  await waitFor(() => game.scene.isActive("MenuScene"), 8000);
  await wait(300);
  await state((l) => {
    const m = game.scene.getScene("MenuScene");
    if (l === "New Game") m.newGame("missing");
    else m.enterGame("continue");
  }, label);
};

// 1. New Game from the main menu.
await state(() => { localStorage.removeItem("souls.save.v1"); ["GameScene", "DeathScene"].forEach((k) => game.scene.stop(k)); game.scene.start("MenuScene"); });
let watching = arrival();
await menuSelect("New Game");
let a = await watching;
check("New Game from the menu: beam + NEW_SPAWN", a.beam && a.spawn && !a.respawn, JSON.stringify(a));

// 2. Death by a failed Death parry (click too early).
await page.mouse.move(640, 360);
watching = arrival();
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "TELEGRAPH", 8000);
await page.mouse.down({ button: "right" }); await wait(30); await page.mouse.up({ button: "right" });
check("the early click fails the Death parry", await waitFor(() => game.scene.getScene("GameScene").parryDeath.outcome === "fail", 2000));
a = await watching;
check("death after a failed Death parry: NEW_RESPAWN only", a.respawn && !a.beam && !a.spawn, JSON.stringify(a));

// 3. Death with the Death parry already used.
watching = arrival();
await state(() => game.scene.getScene("GameScene").takeDamage(999));
check("parry already used: a normal death", await waitFor(() => game.scene.isActive("DeathScene"), 4000));
a = await watching;
check("death with the parry used: NEW_RESPAWN only", a.respawn && !a.beam && !a.spawn, JSON.stringify(a));

// 4. Continue from the main menu.
await state(() => { ["GameScene"].forEach((k) => game.scene.stop(k)); game.scene.start("MenuScene"); });
watching = arrival();
await menuSelect("Continue");
a = await watching;
check("Continue from the menu: beam + NEW_SPAWN", a.beam && a.spawn && !a.respawn, JSON.stringify(a));

// 5. New Game from the menu after a death (the case the bug also hit).
watching = arrival();
await state(() => game.scene.getScene("GameScene").takeDamage(999));
a = await watching;
check("another death: NEW_RESPAWN", a.respawn && !a.beam, JSON.stringify(a));
await state(() => { game.scene.stop("GameScene"); localStorage.removeItem("souls.save.v1"); game.scene.start("MenuScene"); });
watching = arrival();
await menuSelect("New Game");
a = await watching;
check("New Game after a death: beam + NEW_SPAWN", a.beam && a.spawn && !a.respawn, JSON.stringify(a));

await g.finish("v03-respawn-paths");
