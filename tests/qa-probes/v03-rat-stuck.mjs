// Owner 2026-11-18: some rats stood facing a wall and never moved again.
// Watches every rat for 12 s in each room layout and in the situations that
// used to strand them (after an attack/recover, after a stun, chasing the
// knight into a wall). A rat counts as stuck when it is alive, on the ground,
// not attacking/recovering/stunned/holding, and has not moved 2 px in 1.5 s.
import { openGame } from "../helpers.mjs";

const { check, state, wait, newCampaign, finish } = await openGame("tests/qa-probes/out-v03");

const watch = (ms) => state(async (ms) => {
  const s = game.scene.getScene("GameScene");
  const track = new Map();
  const stuck = new Set();
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    s.player.setData("hitInvulnerableUntil", s.time.now + 100000); // the knight just stands there
    s.rats.getChildren().forEach((r, i) => {
      if (!r.active || r.getData("hp") <= 0) return;
      const st = r.getData("state");
      const idle = ["attack", "recover", "stunned", "hold"].includes(st) || !r.body.blocked.down;
      const prev = track.get(r);
      if (idle || !prev || Math.abs(r.x - prev.x) > 2) { track.set(r, { x: r.x, since: performance.now() }); return; }
      if (performance.now() - prev.since > 1500) stuck.add(i + ":" + st + "@" + Math.round(r.x) + (r.flipX ? "L" : "R"));
    });
    await new Promise((res) => requestAnimationFrame(res));
  }
  return [...stuck];
}, ms);

for (const rooms of [["Level_0", "Level_1", "Level_2", "Level_3", "Level_4"], ["Level_0", "Level_3", "Level_2", "Level_1", "Level_4"]]) {
  await newCampaign(rooms);
  // Every rat as if it had just finished an attack or a stun, facing a random way.
  await state(() => {
    const s = game.scene.getScene("GameScene");
    s.rats.getChildren().forEach((r, i) => {
      r.setVelocityX(0);
      r.setFlipX(i % 2 === 0);
      r.setData({ state: "recover", recoverUntil: s.time.now + 50 });
    });
  });
  const stuck = await watch(12000);
  check(rooms.join(",") + ": no rat stands stuck after recovering", stuck.length === 0, stuck.join(" "));
  // Knight on the other side of a wall within sight range.
  await state(() => {
    const s = game.scene.getScene("GameScene");
    s.rats.getChildren().forEach((r) => r.setData({ state: "pursue" }));
  });
  const stuck2 = await watch(8000);
  check(rooms.join(",") + ": no rat stands stuck while chasing", stuck2.length === 0, stuck2.join(" "));
}

await finish("v03-rat-stuck");
