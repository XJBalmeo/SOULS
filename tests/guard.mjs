// Knight guard tests (owner 2026-11-14): right mouse button.
// Press = parry (NEW_PARRY.png, all frames): stuns melee attackers, deflects
// arrows, 0.4 s cooldown. Hold = block (frame 1 held): 80 % less damage from
// the front. The same parry animation is used against Death.
// Usage: npm run test:guard
import { openGame } from "./helpers.mjs";

const T = await openGame("docs/builds/v0.3");
const { page, check, wait, state, waitFor, rightClick, shot, newCampaign, arena } = T;

const knight = () => state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player;
  return { hp: p.getData("hp"), x: Math.round(p.x), anim: p.anims.currentAnim?.key, frame: p.anims.currentFrame?.index, guard: s.guard.state, flipX: p.flipX };
});
const enemy = () => state(() => {
  const e = window.__enemy;
  return { state: e.getData("state"), hp: e.getData("hp"), tinted: e.isTinted, active: e.active };
});
const canvasCenter = async () => {
  const box = await (await page.$("canvas")).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
};
const holdRight = async () => { await canvasCenter(); await page.mouse.down({ button: "right" }); };
const releaseRight = () => page.mouse.up({ button: "right" });
// Knight faces the kept enemy (arena puts it to the right).
const faceEnemy = () => state(() => game.scene.getScene("GameScene").player.setFlipX(window.__enemy.x < game.scene.getScene("GameScene").player.x));
const parryNow = () => state(() => Guard.press(game.scene.getScene("GameScene")));
const resetGuard = () => state(() => { const g = game.scene.getScene("GameScene").guard; g.lastParryAt = -Infinity; g.state = "none"; });

await newCampaign();

// ---- 1. Animations from NEW_PARRY.png ----
const anims = await state(() => ({
  parry: game.anims.get("parry").frames.map((f) => f.textureKey + ":" + f.textureFrame + ":" + f.duration),
  block: game.anims.get("block").frames.map((f) => f.textureKey + ":" + f.textureFrame),
}));
check("parry animation uses all three NEW_PARRY frames", anims.parry.join() === "hero_parry:0:60,hero_parry:1:80,hero_parry:2:160", JSON.stringify(anims));
check("block holds NEW_PARRY frame 1", anims.block.join() === "hero_parry:0", JSON.stringify(anims));

// ---- 2. Press = parry, hold = block, release = normal ----
let a = await arena(120, "rat");
check("test arena found", a.ok, JSON.stringify(a));
await holdRight();
await wait(40);
let k = await knight();
check("pressing right click plays the parry", k.anim === "parry" && k.guard === "parry", JSON.stringify(k));
await shot("guard-01-parry");
await wait(450);
k = await knight();
check("still holding: the knight blocks on frame 1", k.anim === "block" && k.frame === 1 && k.guard === "block", JSON.stringify(k));
await shot("guard-02-block");
const x0 = k.x;
await page.keyboard.down("KeyD");
await wait(400);
await page.keyboard.up("KeyD");
k = await knight();
check("blocking roots the knight", Math.abs(k.x - x0) <= 1, JSON.stringify({ x0, x: k.x }));
await page.keyboard.down("KeyA");
await wait(100);
await page.keyboard.up("KeyA");
k = await knight();
check("while blocking he can turn around", k.flipX === true && k.guard === "block", JSON.stringify(k));
await state(() => game.scene.getScene("GameScene").player.setFlipX(false));
await releaseRight();
await wait(100);
k = await knight();
check("releasing ends the guard", k.guard === "none" && k.anim !== "block", JSON.stringify(k));

// ---- 3. 0.4 s cooldown ----
await resetGuard();
await rightClick(30);
const first = await state(() => game.scene.getScene("GameScene").guard.lastParryAt);
await wait(120);
await rightClick(30);
const second = await state(() => game.scene.getScene("GameScene").guard.lastParryAt);
check("a second press inside 0.4 s does not parry again", first === second, JSON.stringify({ first, second }));
await wait(400);
await rightClick(30);
const third = await state(() => game.scene.getScene("GameScene").guard.lastParryAt);
check("after 0.4 s the next press parries", third > first + 400, JSON.stringify({ first, third }));
await wait(500);

// ---- 4. Block: 80 % less damage from the front only ----
await resetGuard();
await state(() => { const p = game.scene.getScene("GameScene").player; p.setData("hp", 100); p.setData("hitInvulnerableUntil", 0); p.setFlipX(false); });
await holdRight();
await wait(450); // past the parry window: blocking
await state(() => game.scene.getScene("GameScene").hurtPlayer(20, -1, null)); // attacker on the right (front)
k = await knight();
check("a blocked 20 damage hit only does 4", k.hp === 96, JSON.stringify(k));
check("blocking: no hurt animation, still blocking", k.anim === "block" && k.guard === "block", JSON.stringify(k));
await wait(450);
await state(() => game.scene.getScene("GameScene").hurtPlayer(20, 1, null)); // attacker behind
k = await knight();
check("a hit from behind is not blocked", k.hp === 76, JSON.stringify(k));
await releaseRight();
await wait(1100);

// ---- 5. Parry a rat: no damage, rat stunned, then it recovers ----
a = await arena(40, "rat");
await faceEnemy();
await resetGuard();
await rightClick(30);
await state(() => { const s = game.scene.getScene("GameScene"); s.hurtPlayer(20, window.__enemy.x > s.player.x ? -1 : 1, window.__enemy); });
k = await knight();
let e = await enemy();
check("parried rat bite: no damage", k.hp === 100, JSON.stringify(k));
check("the rat is stunned", e.state === "stunned" && e.tinted, JSON.stringify(e));
await shot("guard-03-rat-stunned");
check("the stun wears off after about 1.5 s", await waitFor(() => window.__enemy.getData("state") !== "stunned", 2500));
e = await enemy();
check("the rat recovers untinted", !e.tinted && e.state !== "stunned", JSON.stringify(e));

// ---- 6. Parry a real Starved lunge ----
await newCampaign(); // a fresh level: arena() removes every other enemy
a = await arena(70, "starved");
check("starved arena found", a.ok, JSON.stringify(a));
await faceEnemy();
await resetGuard();
await state(() => { const s = game.scene.getScene("GameScene"); Starved.face(window.__enemy, -1); });
// Start the lunge and parry when the grab is about to land (inside the page, frame-exact).
const lunge = await state(() => new Promise((resolve) => {
  const s = game.scene.getScene("GameScene"), st = window.__enemy, p = s.player;
  Starved.startLunge(s, st);
  const tick = () => {
    const gap = st.body.left - p.body.right;
    if (gap < 40 && s.guard.state === "none") Guard.press(s);
    if (st.getData("state") !== "lunge") return resolve({ state: st.getData("state"), hp: p.getData("hp") });
    requestAnimationFrame(tick);
  };
  tick();
}));
check("parried Starved lunge: no damage, the Starved is stunned", lunge.hp === 100 && lunge.state === "stunned", JSON.stringify(lunge));
await shot("guard-04-starved-stunned");
check("the Starved gets up after the stun", await waitFor(() => window.__enemy.getData("state") === "idle", 2500));

// ---- 7. Deflect an arrow back into the archer ----
await newCampaign(); // a fresh level: arena() removes every other enemy
a = await arena(200, "archer");
check("archer arena found", a.ok, JSON.stringify(a));
await faceEnemy();
await resetGuard();
await state(() => { HollowArcher.face(window.__enemy, window.__enemy.x > game.scene.getScene("GameScene").player.x ? -1 : 1); window.__enemy.setData({ hp: 2, state: "idle" }); });
const deflect = await state(() => new Promise((resolve) => {
  const s = game.scene.getScene("GameScene"), p = s.player;
  let pressed = false, seenBack = false;
  const t0 = performance.now();
  const tick = () => {
    const arrow = s.arrows.getChildren()[0];
    if (arrow && !pressed && Math.abs(arrow.x - p.x) < 40) { Guard.press(s); pressed = true; }
    if (arrow && arrow.getData("deflected") && arrow.body.velocity.x > 0) seenBack = true;
    if (window.__enemy.getData("hp") < 2 || performance.now() - t0 > 5000) {
      return resolve({ pressed, seenBack, hp: p.getData("hp"), archerHp: window.__enemy.getData("hp") });
    }
    requestAnimationFrame(tick);
  };
  tick();
}));
check("a parried arrow is deflected back", deflect.pressed && deflect.seenBack, JSON.stringify(deflect));
check("the knight takes no damage", deflect.hp === 100, JSON.stringify(deflect));
check("the deflected arrow hurts the archer", deflect.archerHp === 1, JSON.stringify(deflect));

// ---- 8. Block an arrow ----
await newCampaign(); // a fresh level: arena() removes every other enemy
a = await arena(200, "archer");
await faceEnemy();
await resetGuard();
await state(() => { HollowArcher.face(window.__enemy, -1); window.__enemy.setData({ state: "idle" }); });
await holdRight();
check("blocked arrow does 3 of 15", await waitFor(() => game.scene.getScene("GameScene").player.getData("hp") === 97, 4000), JSON.stringify(await knight()));
await releaseRight();
await wait(300);

// ---- 9. Parrying Death uses the parry animation ----
await newCampaign();
await state(() => Object.assign(PARRY_DEATH_CONFIG, { forcedDelayMs: 300 }));
await state(() => game.scene.getScene("GameScene").takeDamage(999));
check("right click is ignored by the guard while downed", await state(() => { const s = game.scene.getScene("GameScene"); Guard.press(s); return s.guard.state === "none"; }));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000);
await rightClick(30);
await wait(60);
k = await knight();
check("parrying Death plays the parry animation", k.anim === "parry", JSON.stringify(k));
await shot("guard-05-death-parried");
check("the revive completes", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000));

await T.finish("guard");
