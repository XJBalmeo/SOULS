// QA v0.3 edge 7: Starved at ledges, walls, line-of-sight; Archer + Starved together.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, tap, waitFor, check, newCampaign } = g;

// ---- 7a: ledge. Find a floor tile with a drop to its right; starved near the edge, knight hovering past it. ----
await newCampaign();
await g.arena(200, "starved");
const ledge = await state(() => {
  const s = game.scene.getScene("GameScene");
  const solid = new Set();
  s.ground.getChildren().forEach(b => { if (!b.isRope && !b.isPlatform) solid.add(Math.round(b.body.x / 16) + "," + Math.round(b.body.y / 16)); });
  const has = (x, y) => solid.has(x + "," + y);
  const found = [];
  for (const k of solid) {
    const [cx, cy] = k.split(",").map(Number);
    if (has(cx, cy - 1) || has(cx, cy - 2) || has(cx, cy - 3)) continue; // need open headroom
    if (has(cx - 1, cy) && has(cx - 2, cy) && has(cx - 3, cy) && has(cx - 4, cy) && has(cx - 5, cy) && has(cx - 6, cy)) {
      let drop = true;
      for (let dx = 1; dx <= 9; dx++) for (let dy = -3; dy <= 6; dy++) if (has(cx + dx, cy + dy)) drop = false;
      if (drop) found.push({ cx, cy });
    }
  }
  return found.slice(0, 3);
});
console.log("ledges found", JSON.stringify(ledge));
if (ledge.length) {
  const L = ledge[0];
  const r = await state(async ({ L }) => {
    const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
    const edgeX = (L.cx + 1) * 16, floorTop = L.cy * 16;
    e.body.reset(edgeX - 70, floorTop - 50); e.setVelocity(0, 0); Starved.face(e, 1);
    p.body.reset(edgeX + 90, floorTop - 50); p.body.allowGravity = false; p.setVelocity(0, 0);
    p.setData("hitInvulnerableUntil", s.time.now + 100000);
    e.setData({ state: "idle", nextLungeAt: 0 });
    const log = [];
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 150));
      log.push([Math.round(e.x - edgeX), Math.round(e.y - floorTop), e.getData("state")]);
    }
    return { edgeX, floorTop, log, active: e.active, hp: e.getData("hp") };
  }, { L });
  console.log("7a log (x rel edge, y rel floor, state):", JSON.stringify(r.log.filter((_, i) => i % 2 === 0)));
  const fell = r.log.some(l => l[1] > 40);
  console.log("7a starved fell off the ledge:", fell);
  check("7a: starved never stuck in an unknown state", r.log.every(l => ["idle", "windup", "lunge", "ground"].includes(l[2])));
  console.log("7a NOTE fell =", fell);
}

// ---- 7b: wall between starved and knight; starved should not jitter or lunge ----
await newCampaign();
await g.arena(200, "starved");
const wallRes = await state(async () => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  // find a wall tile east of the knight on this floor: walk the starved right until blocked, report geometry
  e.setData({ state: "idle", nextLungeAt: 0 });
  const pts = [];
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 200)); pts.push([Math.round(e.x - p.x), e.getData("state"), Math.round(e.body.velocity.x)]); }
  return pts;
});
console.log("7b approach on open floor:", JSON.stringify(wallRes.filter((_, i) => i % 3 === 0)));

// los: knight beyond vision range, then in range behind a wall
const los = await state(async () => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  e.body.reset(p.x + 400, p.y); e.setVelocity(0, 0); e.setData({ state: "idle", nextLungeAt: 0 }); Starved.face(e, -1);
  await new Promise(r => setTimeout(r, 1500));
  const far = { dx: Math.round(e.x - p.x), vx: e.body.velocity.x, st: e.getData("state") };
  // vertical offset: knight 80 px above
  e.body.reset(p.x + 120, p.y); p.body.allowGravity = false; p.body.reset(p.x, p.y - 80); p.setVelocity(0, 0);
  await new Promise(r => setTimeout(r, 2500));
  const above = { dx: Math.round(e.x - p.x), st: e.getData("state"), hp: p.getData("hp") };
  p.body.allowGravity = true;
  return { far, above };
});
console.log("7b los", JSON.stringify(los));
check("7b: starved idle when knight out of range / 80px above", los.far.st === "idle" && los.far.vx === 0 && los.above.st === "idle" && los.above.hp === 100, JSON.stringify(los));

// lose sight mid-windup: knight rolls away; starved lunges anyway into empty space
await newCampaign(); await g.arena(120, "starved");
const mid = await state(async () => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  e.setData({ state: "idle", nextLungeAt: 0 }); Starved.face(e, -1);
  await new Promise(r => setTimeout(r, 200));
  const st1 = e.getData("state");
  p.body.reset(p.x - 300, p.y); // knight vanishes mid-windup
  await new Promise(r => setTimeout(r, 1800));
  return { st1, st2: e.getData("state"), dx: Math.round(e.x - p.x) };
});
console.log("7b lose sight mid-windup", JSON.stringify(mid));
check("7b: starved recovers (not stuck) after losing the knight mid-windup", ["idle", "ground"].includes(mid.st2), JSON.stringify(mid));

// ---- 7c: archer + starved together; fatal arrow then parry; both resume sensibly ----
await newCampaign();
await g.arena(110, "starved");
await state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  const a = HollowArcher.spawn(s, p.x + 260, e.y); window.__arch = a; HollowArcher.face(a, -1);
  PARRY_DEATH_CONFIG.forcedDelayMs = 0;
  e.setData({ state: "idle", nextLungeAt: 0 }); Starved.face(e, -1);
  p.setData("hp", 15);
});
const t = await waitFor(() => game.scene.getScene("GameScene").parryDeath.state !== "IDLE", 8000);
check("7c: archer+starved produce a fatal hit -> exactly one encounter", t);
const frozen = await state(() => { const a = window.__arch, e = window.__enemy; return { aAnim: a.anims.isPaused, eAnim: e.anims.isPaused, aState: a.getData("state"), eState: e.getData("state"), arrows: game.scene.getScene("GameScene").arrows.getLength() }; });
console.log("7c at trigger", JSON.stringify(frozen));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000); await tap("KeyC");
check("7c: parry succeeds", await waitFor(() => { const d = game.scene.getScene("GameScene").parryDeath; return d.state === "IDLE" && d.outcome === "success"; }, 5000));
const hist = [];
for (let i = 0; i < 25; i++) { await wait(200); hist.push(await state(() => { const s = game.scene.getScene("GameScene"); return [Math.round(s.time.now), s.player.getData("hp"), window.__arch.getData("state"), window.__enemy.getData("state"), s.arrows.getLength()]; })); }
console.log("7c after revive [t,hp,archer,starved,arrows]:", JSON.stringify(hist.filter((_, i) => i % 3 === 0)));
check("7c: archer not stuck frozen/in draw after revive", await state(() => !window.__arch.anims.isPaused && !window.__enemy.anims.isPaused));
await g.finish("v03-edge7");
