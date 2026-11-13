// QA v0.3 edge 1: fatal hit on rope / vault / mid-air, then post-revive behaviour.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, tap, waitFor, check, newCampaign } = g;
const info = () => state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player, d = s.parryDeath;
  return { st: d.state, hp: p.getData("hp"), x: Math.round(p.x), y: Math.round(p.y), bottom: Math.round(p.body.bottom), climbing: p.getData("isClimbing"),
    vaulting: p.getData("isVaulting"), grav: p.body.allowGravity, vy: Math.round(p.body.velocity.y), onFloor: p.body.blocked.down || p.body.touching.down,
    floorY: d.floorY && Math.round(d.floorY), vt: !!s.vaultTween, inv: s.time.now < (p.getData("hitInvulnerableUntil")||0), rolling: s.isRolling, attacking: s.isAttacking };
});
const ropeCols = () => state(() => {
  const s = game.scene.getScene("GameScene"); const cols = {};
  s.ground.getChildren().filter(b => b.isRope).forEach(b => { const k = Math.round(b.x); (cols[k] = cols[k] || []).push(b.body); });
  return Object.entries(cols).map(([x, bs]) => ({ x: +x, top: Math.min(...bs.map(b => b.top)), bottom: Math.max(...bs.map(b => b.bottom)) }));
});
const fast = () => state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 0; });
const hurt = (amt = 200, dir = 1) => state(([a, d]) => { const s = game.scene.getScene("GameScene"); s.hurtPlayer(a, d, null); }, [amt, dir]);
const reviveAndCheck = async (label) => {
  check(label + ": reaches strike", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000));
  await tap("KeyC");
  check(label + ": revive completes", await waitFor(() => { const d = game.scene.getScene("GameScene").parryDeath; return d.state === "IDLE" && d.outcome === "success"; }, 4000));
  const i = await info(); console.log("   after revive", JSON.stringify(i));
  check(label + ": gravity on, not climbing, full hp", i.grav && !i.climbing && !i.vaulting && i.hp === 100, JSON.stringify(i));
  await wait(1700);
};
const moveTest = async (label) => {
  const x0 = (await info()).x;
  await g.page.keyboard.down("KeyD"); await wait(500); await g.page.keyboard.up("KeyD");
  const x1 = (await info()).x;
  check(label + ": can walk right", x1 - x0 > 40, "dx=" + (x1 - x0));
  await tap("Space", 80); await wait(300);
  console.log("   jump", JSON.stringify(await info()));
};

// ---------- 1a: on rope ----------
await newCampaign(); await fast(); await state(() => { const s = game.scene.getScene("GameScene"); s.getEnemySprites().forEach(e => e.destroy()); });
let cols = await ropeCols(); cols.sort((a, b) => (b.bottom - b.top) - (a.bottom - a.top));
console.log("rope columns", JSON.stringify(cols));
const rc = cols[0];
await state((rc) => { const s = game.scene.getScene("GameScene"), p = s.player; p.body.reset(rc.x, rc.bottom - 40); p.setVelocity(0, 0); p.setData("hitInvulnerableUntil", 0); }, rc);
await g.page.keyboard.down("KeyW"); 
const climbing = await waitFor(() => game.scene.getScene("GameScene").player.getData("isClimbing"), 2000);
check("1a: knight attaches to rope with W", climbing);
await wait(400);
console.log("   on rope", JSON.stringify(await info()));
await hurt();
await g.page.keyboard.up("KeyW");
await wait(100);
let i = await info(); console.log("   fatal on rope", JSON.stringify(i));
check("1a: encounter triggered on rope", i.st !== "IDLE");
check("1a: climbing flag cleared + gravity on during DOWNED", !i.climbing && i.grav, JSON.stringify(i));
await wait(900);
i = await info(); console.log("   rope+900ms", JSON.stringify(i));
check("1a: snapped to floor (body bottom == floorY +-3)", Math.abs(i.y + 50 - i.floorY) <= 3, "y+50=" + (i.y+50) + " floorY=" + i.floorY);
await g.shot("v03-1a-rope-downed");
await reviveAndCheck("1a");
await wait(500);
i = await info(); console.log("   settled", JSON.stringify(i));
check("1a: on floor after revive", i.onFloor, JSON.stringify(i));
await moveTest("1a");
await state((rc) => { const s = game.scene.getScene("GameScene"), p = s.player; p.body.reset(rc.x, rc.bottom - 30); p.setVelocity(0,0); }, rc);
await g.page.keyboard.down("KeyW");
check("1a: can climb rope again after revive", await waitFor(() => game.scene.getScene("GameScene").player.getData("isClimbing"), 2000));
await wait(600); const yc = (await info()).y; await wait(400);
const yn = (await info());
check("1a: climbing moves up", yn.y < yc - 5 || yn.vaulting, "y " + yc + " -> " + yn.y);
await g.page.keyboard.up("KeyW");
await wait(1500);

// ---------- 1b: vaulting ----------
await newCampaign(); await fast(); await state(() => { const s = game.scene.getScene("GameScene"); s.getEnemySprites().forEach(e => e.destroy()); });
cols = await ropeCols(); cols.sort((a, b) => (b.bottom - b.top) - (a.bottom - a.top));
const rv = cols[0];
await state((rc) => { const s = game.scene.getScene("GameScene"), p = s.player; p.body.reset(rc.x, rc.top + 40); p.setVelocity(0, 0); }, rv);
await g.page.keyboard.down("KeyW");
const vaultSeen = await waitFor(() => game.scene.getScene("GameScene").player.getData("isVaulting"), 4000);
check("1b: vault started by climbing to rope top", vaultSeen);
await hurt();
await g.page.keyboard.up("KeyW");
await wait(60);
i = await info(); console.log("   fatal during vault", JSON.stringify(i));
await wait(1000);
i = await info(); console.log("   vault+1s", JSON.stringify(i));
check("1b: vault flags cleared", !i.vaulting && !i.vt && i.grav, JSON.stringify(i));
check("1b: snapped to floor", Math.abs(i.y + 50 - i.floorY) <= 3, "y+50=" + (i.y+50) + " floorY=" + i.floorY);
await reviveAndCheck("1b"); await wait(400);
i = await info(); console.log("   settled", JSON.stringify(i));
check("1b: on a floor (not falling forever / not stuck in tile)", i.onFloor, JSON.stringify(i));
await moveTest("1b");

// ---------- 1c: mid-air jump ----------
await newCampaign(); await fast();
await g.arena(300, "starved");
await state(() => { const s = game.scene.getScene("GameScene"); s.getEnemySprites().forEach(e => e.destroy()); });
await tap("Space", 120); await wait(60);
i = await info(); console.log("   jumping", JSON.stringify(i));
await hurt(200, -1);
await wait(900);
i = await info(); console.log("   mid-air+900", JSON.stringify(i));
check("1c: mid-air: snapped to floor", Math.abs(i.y + 50 - i.floorY) <= 3 && i.vy === 0, JSON.stringify(i));
await reviveAndCheck("1c"); await wait(300);
check("1c: on floor after revive", (await info()).onFloor);
await moveTest("1c");

// ---------- 1d: high fall ----------
await newCampaign(); await fast();
await g.arena(300, "starved");
await state(() => { const s = game.scene.getScene("GameScene"); s.getEnemySprites().forEach(e => e.destroy()); s.player.body.reset(s.player.x, s.player.y - 200); s.player.setVelocity(0, 0); });
await wait(120);
await hurt(200, 1); await wait(900);
i = await info(); console.log("   high air+900", JSON.stringify(i));
check("1d: 200px up: snapped", Math.abs(i.y + 50 - i.floorY) <= 3, JSON.stringify(i));
await reviveAndCheck("1d");
await g.finish("v03-edge1");
