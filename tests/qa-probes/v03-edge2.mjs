// QA v0.3 edges 2, 3, 5, 6: roll/attack/lunge fatal; simultaneous sources; pause; C spam.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, tap, waitFor, check, newCampaign, page } = g;
const info = () => state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player, d = s.parryDeath;
  return { st: d.state, out: d.outcome, why: d.failReason, hp: p.getData("hp"), x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.body.velocity.x),
    roll: s.isRolling, rollInv: p.getData("isRollInvulnerable"), att: s.isAttacking, hit: s.attackHitbox.body.enable, dead: s.isDead,
    inv: s.time.now < (p.getData("hitInvulnerableUntil") || 0), anim: p.anims.currentAnim && p.anims.currentAnim.key, alpha: p.alpha, angle: p.angle };
});
const fast = () => state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 0; });
const strike = () => waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000);
const idle = () => waitFor(() => { const d = game.scene.getScene("GameScene").parryDeath; return d.state === "IDLE" && d.outcome === "success"; }, 5000);
const clear = () => state(() => { const s = game.scene.getScene("GameScene"); s.getEnemySprites().forEach(e => e.destroy()); s.arrows.clear(true, true); });
const hurt = (a = 200, d = 1) => state(([a, d]) => game.scene.getScene("GameScene").hurtPlayer(a, d, null), [a, d]);
const reapers = () => state(() => game.scene.getScene("GameScene").children.list.filter(o => o.texture && o.texture.key.startsWith("reaper_") && o.active).length);

// ---- 2a: fatal during roll ----
await newCampaign(); await fast(); await clear(); await wait(1200);
await tap("KeyD", 30); await tap("KeyX", 40); await wait(100);
let i = await info(); console.log("2a rolling", JSON.stringify(i));
check("2a: roll actually started", i.roll === true);
await hurt(200, -1); await wait(50);
i = await info(); console.log("2a downed", JSON.stringify(i));
check("2a: roll state cleared on trigger", !i.roll && !i.rollInv && i.vx === 0 && i.st === "DOWNED", JSON.stringify(i));
check("2a: strike", await strike()); await tap("KeyC"); check("2a: success", await idle());
await wait(300); i = await info(); console.log("2a revived", JSON.stringify(i));
check("2a: no stuck roll/attack flags after revive", !i.roll && !i.rollInv && !i.att && !i.hit, JSON.stringify(i));
await wait(1500);
await tap("KeyZ", 40); await wait(100); i = await info();
check("2a: attack works after revive", i.att === true, JSON.stringify(i));
await wait(900);
await tap("KeyX", 40); await wait(100); i = await info();
check("2a: roll works after revive", i.roll === true, JSON.stringify(i));
await wait(1200);

// ---- 2b: fatal mid attack swing ----
await newCampaign(); await fast(); await clear();
await tap("KeyZ", 30); await wait(120);
i = await info(); console.log("2b swinging", JSON.stringify(i));
check("2b: swing active", i.att === true);
await hurt(200, 1); await wait(50);
i = await info();
check("2b: attack state cleared, hitbox disabled", !i.att && !i.hit, JSON.stringify(i));
check("2b: strike", await strike()); await tap("KeyC"); check("2b: success", await idle());
await wait(1600); await tap("KeyZ", 40); await wait(120); i = await info();
check("2b: attack works after revive", i.att === true && i.hp === 100, JSON.stringify(i));

// ---- 2c: Starved lunge as the fatal source ----
await newCampaign(); await fast();
const a = await g.arena(110, "starved"); console.log("2c arena", JSON.stringify(a));
await state(() => { const s = game.scene.getScene("GameScene"), e = window.__enemy; s.player.setData("hp", 25); Starved.face(e, -1); e.setData({ state: "idle", nextLungeAt: 0 }); });
check("2c: lunge kills -> encounter DOWNED", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "DOWNED", 6000));
check("2c: strike", await strike()); await tap("KeyC"); check("2c: success", await idle());
const t0 = Date.now(); const tl = [];
while (Date.now() - t0 < 6000) {
  tl.push(await state(() => { const s = game.scene.getScene("GameScene"), e = window.__enemy, p = s.player;
    return { t: Math.round(s.time.now), hp: p.getData("hp"), dx: Math.round(e.x - p.x), es: e.getData("state"), inv: s.time.now < (p.getData("hitInvulnerableUntil") || 0), ehp: e.getData("hp") }; }));
  await wait(150);
}
const first = tl.findIndex(r => r.hp < 100);
console.log("2c timeline (sampled):", JSON.stringify(tl.filter((_, k) => k % 4 === 0)));
console.log("2c first re-hit index:", first, first >= 0 ? JSON.stringify(tl[first]) : "none");
check("2c: starved does not re-hit during the 1.5 s invulnerability window", first < 0 || tl[first].t - tl[0].t > 1400, JSON.stringify(tl[Math.max(first, 0)]));
console.log("2c min hp in 6 s with knight idle:", Math.min(...tl.map(r => r.hp)), "first windup idx", tl.findIndex(r => r.es === "windup"));
await g.shot("v03-2c-after-lunge-revive");

// ---- 3: simultaneous fatal sources ----
const wrapTrigger = () => state(() => { window.__trig = 0; const s = game.scene.getScene("GameScene"), d = s.parryDeath, o = d.trigger.bind(d); d.trigger = (x) => { window.__trig++; return o(x); }; });
await newCampaign(); await fast(); await clear(); await wrapTrigger();
await state(() => { const s = game.scene.getScene("GameScene"); s.player.setData("hp", 10); s.hurtPlayer(20, 1, { kind: "rat" }); s.hurtPlayer(20, 1, { kind: "arrow" }); s.hurtPlayer(30, -1, { kind: "starved" }); });
await wait(100);
let r = await state(() => ({ trig: window.__trig, st: game.scene.getScene("GameScene").parryDeath.state }));
check("3a: three hits in one call stack -> exactly one trigger", r.trig === 1 && r.st === "DOWNED", JSON.stringify(r));
await newCampaign(); await fast(); await clear(); await wrapTrigger();
await state(() => new Promise(res => { const s = game.scene.getScene("GameScene"); s.player.setData("hp", 10); let n = 0; const step = () => { s.hurtPlayer(20, 1, { kind: ["rat", "arrow", "starved", "rat", "arrow"][n] }); if (++n < 5) requestAnimationFrame(step); else res(); }; step(); }));
await wait(1500);
r = await state(() => ({ trig: window.__trig, st: game.scene.getScene("GameScene").parryDeath.state, listeners: game.scene.getScene("GameScene").input.keyboard.listenerCount("keydown") }));
r.reapers = await reapers();
check("3b: five hits across five frames -> exactly one trigger, one reaper", r.trig === 1 && r.reapers === 1, JSON.stringify(r));
await strike(); await tap("KeyC"); check("3b: still parry-able and succeeds", await idle());
// real physics: rat bite + arrow + starved lunge on one step
await newCampaign(); await fast();
await g.arena(40, "starved");
await wrapTrigger();
await state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  p.setData("hp", 10); p.setData("hitInvulnerableUntil", 0);
  s.physics.pause();
  Starved.face(e, e.x > p.x ? -1 : 1);
  e.setData({ state: "lunge", lungeHit: false, lungeUntil: s.time.now + 5000 });
  s.spawnRat(p.x, p.y, true);
  const rat = s.rats.getChildren()[s.rats.getChildren().length - 1];
  rat.body.reset(p.x, p.y);
  rat.setData({ state: "attack", hitStrike: -1, strike: 7 });
  const arrow = s.arrows.create(p.x - 4, p.y, "archer_arrow"); arrow.body.setVelocity(300, 0);
  e.body.reset(p.x + 20, e.y);
  s.physics.resume();
});
await wait(600);
r = await state(() => ({ trig: window.__trig, st: game.scene.getScene("GameScene").parryDeath.state, hp: game.scene.getScene("GameScene").player.getData("hp") }));
r.reapers = await reapers();
console.log("3c real overlap", JSON.stringify(r));
check("3c: real rat + arrow + lunge overlap -> exactly one trigger", r.trig === 1 && r.reapers <= 1, JSON.stringify(r));

// ---- 5: pause ----
const pauseResume = async () => {
  await state(() => game.scene.getScene("GameScene").requestPause());
  const ok = await waitFor(() => game.scene.isActive("PauseScene"), 2000);
  await wait(1200);
  await state(() => { game.scene.getScene("PauseScene").resumeGame(); });
  await wait(400);
  if (await state(() => game.scene.isPaused("GameScene"))) {
    console.log("   (fullscreen refused in headless: forcing resume as tests/parrydeath.mjs does)");
    await state(() => { game.scene.getScenes(false).forEach(sc => /Overlay|Pause/.test(sc.scene.key) && game.scene.stop(sc.scene.key)); game.scene.resume("GameScene"); });
  }
  return ok;
};
await newCampaign(); await fast(); await clear();
await hurt(); await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "DEATH_APPROACH", 3000);
await tap("KeyC"); await wait(120);
i = await info(); console.log("5a", JSON.stringify(i));
check("5a: in NORMAL_DEATH", i.st === "NORMAL_DEATH");
await pauseResume();
check("5a: death screen follows pause/resume", await waitFor(() => game.scene.isActive("DeathScene") || game.scene.getScene("GameScene").isDead, 4000));
check("5a: checkpoint restore completes, full HP, IDLE", await waitFor(() => { const s = game.scene.getScene("GameScene"); return game.scene.isActive("GameScene") && s.player && !s.isDead && s.player.getData("hp") === 100 && s.parryDeath.state === "IDLE"; }, 9000));
console.log("5a end", JSON.stringify(await state(() => ({ used: SaveManager.campaign.parryDeathUsed, playing: game.sound.sounds.filter(x => x.isPlaying).length }))));

await newCampaign(); await fast(); await clear();
await hurt(); await strike(); await tap("KeyC"); await wait(150);
i = await info(); check("5b: PARRY_SUCCESS", i.st === "PARRY_SUCCESS", JSON.stringify(i));
await pauseResume();
check("5b: revives after resume", await idle());
i = await info(); check("5b: full hp, alive", i.hp === 100 && !i.dead, JSON.stringify(i));
await wait(1000);
r = await state(() => ({ tinted: game.scene.getScene("GameScene").player.isTinted, physPaused: game.scene.getScene("GameScene").physics.world.isPaused, prompts: game.scene.getScene("GameScene").children.list.filter(o => o.type === "Text" && /DENIED|Press C/.test(o.text)).length }));
r.reapers = await reapers();
check("5b: reaper/prompt cleaned, physics running, no stuck tint", r.reapers === 0 && r.prompts === 0 && !r.physPaused && !r.tinted, JSON.stringify(r));

await newCampaign(); await fast(); await clear();
await hurt(); await strike(); await tap("KeyC");
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "REVIVE", 3000);
await pauseResume();
check("5c: REVIVE pause -> finishes", await idle()); i = await info();
check("5c: hp 100 alive", i.hp === 100 && !i.dead, JSON.stringify(i));

await newCampaign(); await fast(); await clear();
await hurt(); await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "TELEGRAPH", 4000);
await pauseResume();
check("5d: TELEGRAPH pause -> still reaches strike, parry works", (await strike()) && (await tap("KeyC"), await idle()));

// ---- 6: C spam ----
await newCampaign(); await fast(); await clear();
await hurt();
for (let k = 0; k < 10; k++) { await tap("KeyC", 15); await wait(15); }
i = await info(); console.log("6a after DOWNED spam", JSON.stringify(i));
check("6a: spam during DOWNED ignored", i.out === null && i.st !== "NORMAL_DEATH", JSON.stringify(i));
check("6a: strike reached", await strike()); await tap("KeyC"); check("6a: single correct press succeeds", await idle());
await newCampaign(); await fast(); await clear();
await hurt(); await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "DEATH_APPROACH", 3000);
for (let k = 0; k < 6; k++) { await tap("KeyC", 15); await wait(15); }
i = await info(); console.log("6b after APPROACH spam", JSON.stringify(i));
check("6b: spam during DEATH_APPROACH -> early fail", i.st === "NORMAL_DEATH" && i.why === "early", JSON.stringify(i));
await g.finish("v03-edge2");
