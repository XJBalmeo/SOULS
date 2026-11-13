// QA v0.3 edge 7 (retry): Starved lunge near a ledge; sight rules, with the knight made untouchable.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, check, newCampaign } = g;
await newCampaign();
await g.arena(200, "starved");
const ledge = await state(() => {
  const s = game.scene.getScene("GameScene");
  const solid = new Set();
  s.ground.getChildren().forEach(b => { if (!b.isRope && !b.isPlatform) solid.add(Math.round(b.body.x / 16) + "," + Math.round(b.body.y / 16)); });
  const has = (x, y) => solid.has(x + "," + y);
  for (const k of solid) {
    const [cx, cy] = k.split(",").map(Number);
    if (has(cx, cy - 1) || has(cx, cy - 2) || has(cx, cy - 3)) continue;
    if ([1,2,3,4,5,6].every(d => has(cx - d, cy))) {
      let drop = true;
      for (let dx = 1; dx <= 9; dx++) for (let dy = -3; dy <= 6; dy++) if (has(cx + dx, cy + dy)) drop = false;
      if (drop) return { cx, cy, rightOfEdgeSolid: has(cx + 1, cy) };
    }
  }
  return null;
});
console.log("ledge", JSON.stringify(ledge));
const r = await state(async ({ L }) => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  const lastTileRight = (L.cx + 1) * 16, floorTop = L.cy * 16;
  p.setData("hitInvulnerableUntil", s.time.now + 1e8);
  e.body.reset(lastTileRight - 20, floorTop - 50); e.setVelocity(0, 0); Starved.face(e, 1);
  p.body.reset(lastTileRight + 100, floorTop - 50); p.body.allowGravity = false; p.setVelocity(0, 0);
  e.setData({ state: "idle", nextLungeAt: 0 });
  const log = [];
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 120)); log.push([Math.round(e.x - lastTileRight), Math.round(e.y - (floorTop - 50)), e.getData("state"), Math.round(p.y - (floorTop - 50)), Math.round(p.x - lastTileRight)]); }
  return log;
}, { L: ledge });
console.log("7a lunge-off-ledge log (x rel edge, dy, state):", JSON.stringify(r.filter((_, i) => i % 2 === 0)));
console.log("7a fell off ledge (dy>40):", r.some(l => l[1] > 40), "; finished state", r[r.length - 1][2]);
// sight
await newCampaign(); await g.arena(200, "starved");
const los = await state(async () => {
  const s = game.scene.getScene("GameScene"), p = s.player, e = window.__enemy;
  p.setData("hitInvulnerableUntil", s.time.now + 1e8); p.setData("hp", 100);
  const out = {};
  e.setData({ state: "idle", nextLungeAt: 0 }); Starved.face(e, -1);
  e.body.reset(p.x + 400, e.y); await new Promise(r => setTimeout(r, 1200));
  out.far = [Math.round(e.x - p.x), e.getData("state")];
  p.body.allowGravity = false; const y0 = p.y; p.body.reset(p.x, y0 - 90); p.setVelocity(0, 0);
  e.body.reset(p.x + 120, e.y); await new Promise(r => setTimeout(r, 2500));
  out.above90 = [Math.round(e.x - p.x), e.getData("state")];
  p.body.reset(p.x, y0); p.body.allowGravity = true;
  return out;
});
console.log("7b sight", JSON.stringify(los));
check("7b: starved ignores a knight 400px away and 90px above", los.far[1] === "idle" && los.far[0] === 400 && los.above90[0] === 120 && los.above90[1] === "idle", JSON.stringify(los));
await g.finish("v03-edge7b");
