// Parry Death (M1.4A) tests, mapped to docs/PARRY_DEATH.md acceptance tests:
// trigger by a real enemy, success at real timing, same-fight revival, failure
// (early, late, held key), single encounter per campaign, duplicate fatal hits,
// random delay bounds, pause freeze, retry/quit cleanup, reload/Continue,
// New Game reset and unavailable storage. Usage: npm run test:parry
import { openGame } from "./helpers.mjs";

const T = await openGame("docs/builds/v0.3");
const { page, check, wait, state, waitFor, tap, shot, newCampaign, arena, gameReady, warnings } = T;

const DEFAULTS = await state(() => ({ ...PARRY_DEATH_CONFIG }));
const fast = (extra = {}) =>
  state((cfg) => Object.assign(PARRY_DEATH_CONFIG, cfg), {
    downedMs: 100, approachMs: 300, forcedDelayMs: 100, telegraphMs: 250, windowMs: 400,
    successMs: 200, reviveMs: 200, failMs: 200, rng: null, ...extra,
  });
const reset = () => state((d) => Object.assign(PARRY_DEATH_CONFIG, d, { rng: null }), DEFAULTS);
const enc = () =>
  state(() => {
    const s = game.scene.getScene("GameScene");
    const pd = s.parryDeath;
    return {
      state: pd.state, outcome: pd.outcome, reason: pd.failReason, persisted: pd.persisted, elapsed: pd.elapsedMs,
      hp: s.player.getData("hp"), stamina: s.player.getData("stamina"), dead: s.isDead,
      physicsPaused: s.physics.world.isPaused,
      reapers: s.children.list.filter((c) => c.texture && c.texture.key.startsWith("reaper") && c.active).length,
      listeners: s.input.keyboard.listenerCount("keydown"),
      storedFlag: (JSON.parse(localStorage.getItem("souls.save.v1") || "{}")).parryDeathUsed,
      memFlag: SaveManager.campaign && SaveManager.campaign.parryDeathUsed,
    };
  });
const inState = (name, timeout = 8000) => waitFor((n) => game.scene.getScene("GameScene").parryDeath.state === n, timeout, name);
const fatal = () => state(() => game.scene.getScene("GameScene").takeDamage(999));
const pressC = () => tap("KeyC", 40);
// Waits through the death screen until the checkpoint restart has finished.
const throughDeath = async () => {
  await waitFor(() => game.scene.isActive("DeathScene"), 5000);
  await waitFor(() => !game.scene.isActive("DeathScene"), 6000);
  await gameReady();
  await wait(300);
};

// ---- 1. A real arrow kill at default timing, parried. ----
await newCampaign();
let a = await arena(220, "archer");
check("arena with an archer", a.ok, JSON.stringify(a));
const baseline = await state(() => {
  const s = game.scene.getScene("GameScene");
  s.__sameRun = "yes";
  window.__archerX = window.__enemy.x;
  return { listeners: s.input.keyboard.listenerCount("keydown") };
});
await state(() => {
  const p = game.scene.getScene("GameScene").player;
  p.setData("hp", 15);
  window.__enemy.setData({ state: "idle", hp: 2 });
});
check("a lethal arrow downs the knight instead of killing him", await inState("DOWNED", 4000));
let e = await enc();
check("the opportunity is spent and saved before any input", e.storedFlag === true && e.persisted === true, JSON.stringify(e));
check("the fight is frozen while downed", e.physicsPaused && !e.dead, JSON.stringify(e));
check("the knight is no longer hurt by anything", await state(() => game.scene.getScene("GameScene").isPlayerInvulnerable()));
await inState("DEATH_APPROACH", 3000);
await wait(700);
await shot("parry-01-death-approaches");
check("exactly one Death's Shadow appears", (await enc()).reapers === 1, JSON.stringify(await enc()));
check("its warning comes after a random wait", await inState("TELEGRAPH", 5000));
await wait(250);
await shot("parry-02-telegraph-glint");
check("the strike opens the parry window", await inState("SINGLE_STRIKE", 2000));
await page.keyboard.down("KeyC");
await wait(40);
await page.keyboard.up("KeyC");
await shot("parry-03-parried");
e = await enc();
check("pressing C during the strike parries (default 300 ms window)", e.outcome === "success", JSON.stringify(e));
check("revival completes", await inState("IDLE", 4000));
e = await enc();
check("full HP and stamina after revival", e.hp === 100 && e.stamina === 100, JSON.stringify(e));
const same = await state(() => {
  const s = game.scene.getScene("GameScene");
  const archer = window.__enemy;
  return {
    sameRun: s.__sameRun === "yes",
    archerAlive: archer.active && archer.getData("hp") === 2,
    archerMovedLittle: Math.abs(archer.x - window.__archerX) < 70,
    arrows: s.arrows.getLength(),
    invulnerable: s.isPlayerInvulnerable(),
    physicsRunning: !s.physics.world.isPaused,
  };
});
check("same fight resumes: no reload, the archer keeps its HP and place", same.sameRun && same.archerAlive && same.archerMovedLittle, JSON.stringify(same));
check("arrows in flight are cleared and the knight is briefly protected", same.arrows === 0 && same.invulnerable, JSON.stringify(same));
check("the world runs again", same.physicsRunning);
await wait(400);
e = await enc();
check("Death's Shadow fades away and its key listener is removed", e.reapers === 0 && e.listeners === baseline.listeners, JSON.stringify({ e, baseline }));
await shot("parry-04-revived");
// Second fatal hit in the same campaign: normal death, no second encounter.
await wait(1600);
await fatal();
e = await enc();
check("after a success, the next fatal hit is a normal death", e.dead && e.state === "IDLE" && e.reapers === 0, JSON.stringify(e));
check("death screen follows", await waitFor(() => game.scene.isActive("DeathScene"), 3000));
await gameReady();
await wait(300);
await fatal();
check("still no encounter after the checkpoint restore", (await enc()).dead && (await enc()).state === "IDLE");

// ---- 2. Duplicate fatal events in one frame; delay bounds. ----
await newCampaign();
await fast();
const dup = await state(() => {
  const s = game.scene.getScene("GameScene");
  s.takeDamage(999);
  s.takeDamage(999);
  s.hurtPlayer(50, 1);
  return s.parryDeath.state;
});
await inState("DEATH_APPROACH", 2000);
await wait(100);
e = await enc();
check("two fatal hits in one frame start exactly one encounter", dup === "DOWNED" && e.reapers === 1, JSON.stringify(e));
const bounds = await state(() => {
  const pd = game.scene.getScene("GameScene").parryDeath;
  const C = PARRY_DEATH_CONFIG;
  const keep = [C.forcedDelayMs, C.rng];
  C.forcedDelayMs = null;
  C.rng = () => 0;
  const lo = pd.rollDelay();
  C.rng = () => 0.999999;
  const hi = pd.rollDelay();
  [C.forcedDelayMs, C.rng] = keep;
  return { lo, hi, min: C.delayMinMs, max: C.delayMaxMs };
});
check("random wait stays within its bounds", Math.abs(bounds.lo - bounds.min) < 1 && Math.abs(bounds.hi - bounds.max) < 1, JSON.stringify(bounds));

// ---- 3. Early press fails. ----
await newCampaign();
await fast({ telegraphMs: 600 });
await fatal();
await inState("TELEGRAPH", 3000);
await pressC();
e = await enc();
check("pressing during the warning (too soon) fails", e.outcome === "fail" && e.reason === "early", JSON.stringify(e));
await pressC();
check("a second press after failing changes nothing", (await enc()).outcome === "fail");
check("failure leads to the normal death screen", await waitFor(() => game.scene.isActive("DeathScene"), 4000));
await throughDeath();
e = await enc();
check("checkpoint restore after failure: full HP", e.hp === 100 && !e.dead, JSON.stringify(e));
await fatal();
check("after a failure, the next fatal hit is a normal death", (await enc()).dead && (await enc()).state === "IDLE");

// ---- 4. Holding the key cannot win; no press is too late. ----
await newCampaign();
await fast({ downedMs: 300 });
await fatal();
await inState("DOWNED", 1000);
await page.keyboard.down("KeyC");               // pressed while downed: ignored
await inState("SINGLE_STRIKE", 4000);
await page.keyboard.down("KeyC");               // auto-repeat while held (repeat: true)
await inState("NORMAL_DEATH", 2000);
await page.keyboard.up("KeyC");
e = await enc();
check("a key held from before the strike cannot parry", e.outcome === "fail" && e.reason === "late", JSON.stringify(e));
await throughDeath();

await newCampaign();
await fast();
await fatal();
await inState("SINGLE_STRIKE", 4000);
await shot("parry-02b-strike-window");
await inState("NORMAL_DEATH", 4000);
e = await enc();
check("no press at all is too late", e.outcome === "fail" && e.reason === "late", JSON.stringify(e));
await throughDeath();

// ---- 5. Pause freezes the encounter; C is ignored while paused. ----
await newCampaign();
await fast({ approachMs: 1500, forcedDelayMs: 400 });
await fatal();
await inState("DEATH_APPROACH", 2000);
await state(() => game.scene.getScene("GameScene").requestPause());
check("the pause menu opens during the encounter", await waitFor(() => game.scene.isActive("PauseScene"), 2000));
const before = (await enc()).elapsed;
await wait(1500);
await pressC();
e = await enc();
check("the encounter clock stops while paused", Math.abs(e.elapsed - before) < 1 && e.state === "DEATH_APPROACH", JSON.stringify({ before, e }));
check("C pressed while paused is ignored", e.outcome === null);
await state(() => {
  game.scene.stop("PauseScene");
  game.scene.resume("GameScene");
});
check("after resuming, the encounter continues to the strike", await inState("SINGLE_STRIKE", 4000));
await pressC();
check("and can still be parried", await waitFor(() => game.scene.getScene("GameScene").parryDeath.outcome === "success", 1000));
await inState("IDLE", 3000);

// ---- 6. Leaving fullscreen mid-encounter opens the pause menu. ----
await newCampaign();
await fast({ approachMs: 1500 });
await fatal();
await inState("DEATH_APPROACH", 2000);
await state(() => document.dispatchEvent(new Event("fullscreenchange")));
check("leaving fullscreen during the encounter opens the pause menu", await waitFor(() => game.scene.isActive("PauseScene"), 2000));
// ---- 7. Retry from Checkpoint mid-encounter cleans everything up. ----
await state(() => game.scene.getScene("GameScene").restartFromCheckpoint());
await wait(300);
await gameReady();
await wait(300);
e = await enc();
check("Retry mid-encounter: no Death left behind, listener count normal", e.state === "IDLE" && e.reapers === 0 && e.listeners === baseline.listeners, JSON.stringify(e));
check("Retry mid-encounter: the opportunity stays spent", e.memFlag === true && e.storedFlag === true);
await fatal();
check("Retry mid-encounter: the next fatal hit is a normal death", (await enc()).dead && (await enc()).state === "IDLE");

// ---- 8. Reload mid-encounter, then Continue; New Game resets. ----
await newCampaign();
await fast({ approachMs: 3000 });
await fatal();
await inState("DEATH_APPROACH", 2000);
await page.reload({ waitUntil: "load" });
await waitFor(() => game.scene.isActive("MenuScene"));
const cont = await state(() => SaveManager.inspect().status === "ok" && SaveManager.continueCampaign());
await state(() => {
  game.scene.stop("MenuScene");
  game.scene.start("GameScene");
});
await gameReady();
await wait(300);
e = await enc();
check("reload mid-encounter + Continue: opportunity stays spent", cont && e.memFlag === true && e.state === "IDLE", JSON.stringify(e));
await fatal();
check("reload mid-encounter + Continue: no replay of the encounter", (await enc()).dead && (await enc()).state === "IDLE");
await gameReady();
await state(() => {
  ["DeathScene", "GameScene"].forEach((k) => game.scene.stop(k));
  SaveManager.startNewCampaign();
});
check("New Game gives a fresh opportunity", (await state(() => SaveManager.campaign.parryDeathUsed)) === false &&
  (await state(() => JSON.parse(localStorage.getItem("souls.save.v1")).parryDeathUsed)) === false);

// ---- 9. Storage unavailable: still works, warns, and stays spent in memory. ----
await newCampaign();
await fast();
await state(() => {
  window.__realSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error("quota (test)"); };
});
await fatal();
e = await enc();
check("with storage unavailable the encounter still runs", e.state === "DOWNED" && e.persisted === false, JSON.stringify(e));
check("and a warning is logged", warnings.some((w) => w.includes("Parry Death used; could not be saved")));
await inState("NORMAL_DEATH", 4000);
await throughDeath();
check("with storage unavailable the checkpoint restart happened", (await enc()).hp === 100);
await fatal();
e = await enc();
check("with storage unavailable a checkpoint restart still skips it (in memory)", e.dead && e.state === "IDLE" && e.memFlag === true, JSON.stringify(e));
await state(() => { Storage.prototype.setItem = window.__realSetItem; });

await reset();
await T.finish("parrydeath");
