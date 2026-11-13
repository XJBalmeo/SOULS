// The Starved tests: spawn from LDtk, approach, wind-up warning, lunge damage,
// roll dodge, ground punish window, cooldown, sword kill, death animation and
// checkpoint reset. Usage: npm run test:starved
import { openGame } from "./helpers.mjs";

const T = await openGame("docs/builds/v0.3");
const { check, wait, state, waitFor, tap, shot, newCampaign, arena, gameReady } = T;
const enemy = () =>
  state(() => {
    const e = window.__enemy;
    const s = game.scene.getScene("GameScene");
    return {
      hp: s.player.getData("hp"), knightX: s.player.x,
      x: e && e.active ? e.x : null, eHp: e && e.active ? e.getData("hp") : 0,
      state: e && e.active ? e.getData("state") : "gone",
      anim: e && e.active && e.anims.currentAnim ? e.anims.currentAnim.key : null,
    };
  });
const release = () => state(() => window.__enemy.setData({ state: "idle", nextLungeAt: 0 }));

await newCampaign();
await wait(800);
const spawn = await state(() => {
  const s = game.scene.getScene("GameScene");
  const list = s.starved.getChildren();
  return { count: list.length, grounded: list.filter((e) => e.body.blocked.down).length,
           expected: s.roomPlan.filter((r) => /Level_[123]$/.test(r)).length };
});
check("the Starved spawn from LDtk, one per middle room", spawn.count === spawn.expected && spawn.count > 0, JSON.stringify(spawn));
check("every Starved stands on a floor", spawn.grounded === spawn.count, JSON.stringify(spawn));

// 1. Approach, then the wind-up warning and the lunge.
let a = await arena(220, "starved");
check("test arena found", a.ok, JSON.stringify(a));
const x0 = (await enemy()).x;
await release();
await wait(700);
let e = await enemy();
check("it shuffles toward the knight when it sees him", e.x < x0 - 10 && e.anim === "starved_walk", `moved ${(x0 - e.x).toFixed(1)} px, anim ${e.anim}`);
check("slower than a rat (30 px/s)", (x0 - e.x) < 30, `${(x0 - e.x).toFixed(1)} px in 0.7 s`);
check("it winds up within lunge range", await waitFor(() => window.__enemy.getData("state") === "windup", 6000));
const w0 = Date.now();
await shot("starved-01-windup");
// A sword hit during the wind-up does not cancel it.
await state(() => {
  const s = game.scene.getScene("GameScene");
  s.strikeId++;
  s.damageEnemy(window.__enemy, 1);
});
check("a hit during the wind-up does not cancel it", (await enemy()).state === "windup" && (await enemy()).eHp === 2);
check("it lunges after the ~600 ms warning", await waitFor(() => window.__enemy.getData("state") === "lunge", 1500));
const windup = Date.now() - w0;
check("wind-up warning lasts about 600 ms", windup >= 450 && windup <= 900, windup + " ms");
await wait(120);
await shot("starved-02-lunge");
check("a standing knight is grabbed for 30", await waitFor(() => game.scene.getScene("GameScene").player.getData("hp") === 70, 1500), JSON.stringify(await enemy()));
check("it lies on the ground after the lunge", await waitFor(() => window.__enemy.getData("state") === "ground", 1500));
await shot("starved-03-ground");
const g0 = Date.now();
check("it gets back up after about 0.9 s", await waitFor(() => window.__enemy.getData("state") !== "ground", 2500));
const ground = Date.now() - g0;
check("ground window about 0.9 s", ground >= 650 && ground <= 1300, ground + " ms");
check("no second wind-up before the 2.5 s cooldown", await state(() => window.__enemy.getData("nextLungeAt") - game.scene.getScene("GameScene").time.now > 0));

// 2. Roll through the lunge.
a = await arena(160, "starved");
await state(() => window.__enemy.setData({ hp: 3 }));
await release();
await waitFor(() => window.__enemy.getData("state") === "lunge", 4000);
await tap("KeyX");
await waitFor(() => window.__enemy.getData("state") === "ground", 1500);
e = await enemy();
check("rolling through the lunge avoids the grab", e.hp === 100, JSON.stringify(e));

// 3. Three sword hits kill it, with a death animation.
a = await arena(34, "starved");
check("melee arena found", a.ok, JSON.stringify(a));
await state(() => window.__enemy.setData({ hp: 3, state: "ground" }));
await state(() => window.__enemy.anims.play("starved_ground"));
for (let i = 0; i < 3; i++) {
  await state(() => window.__enemy.setData("state", "ground"));
  await tap("KeyZ");
  await wait(650);
}
e = await enemy();
check("three sword hits bring it to 0 HP", e.eHp === 0, JSON.stringify(e));
check("it plays its death animation", e.anim === "starved_death", JSON.stringify(e));
await shot("starved-04-death");
check("the body fades out and is removed", await waitFor(() => !window.__enemy.active, 4000));

// 4. Checkpoint restart brings every Starved back.
await state(() => game.scene.getScene("GameScene").restartFromCheckpoint());
await wait(400);
await gameReady();
const after = await state(() => game.scene.getScene("GameScene").starved.getLength());
check("restart restores every Starved", after === spawn.expected, String(after));

await T.finish("starved");
