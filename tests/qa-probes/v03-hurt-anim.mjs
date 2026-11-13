// QA: the owner's knight hurt/down/YOU DIED sheets.
// - a non-lethal hit plays NEW_HURT with a smaller knockback, then normal animations resume;
// - with Parry Death available, the fatal hit plays hurt -> down and holds the ground frame;
// - a failed parry goes straight to the YOU DIED screen;
// - a normal death plays hurt -> down -> YOU DIED, then respawns.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, check, waitFor, newCampaign, shot, tap } = g;
const anim = () => state(() => {
  const s = game.scene.getScene("GameScene"), p = s.player;
  return { key: p.anims.currentAnim?.key, frame: p.anims.currentFrame?.index, playing: p.anims.isPlaying, tint: p.isTinted, vx: Math.round(p.body.velocity.x), vy: Math.round(p.body.velocity.y), pd: s.parryDeath.state };
});

await newCampaign();
await wait(800);
await state(() => game.scene.getScene("GameScene").hurtPlayer(10, 1, null));
const a = await anim();
check("hit plays the hurt animation, no tint", a.key === "hurt" && a.playing && !a.tint, JSON.stringify(a));
check("smaller knockback (90 px/s each way)", Math.abs(a.vx) <= 90 && a.vy >= -90, JSON.stringify(a));
await wait(1000);
const b = await anim();
check("animation returns to normal after the hurt", b.key !== "hurt", JSON.stringify(b));

// Fatal hit with Parry Death available.
await state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 1500; });
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await wait(100);
const c = await anim();
check("fatal hit starts with the hurt animation", c.key === "hurt", JSON.stringify(c));
await wait(1100);
const d = await anim();
check("then holds the second down frame while Death approaches", d.key === "down" && d.frame === 2 && !d.playing, JSON.stringify(d));
await shot("hurt-01-downed-awaiting-parry");
check("Death reaches the strike", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000));
const e = await anim();
check("still on the ground frame at the strike", e.key === "down" && e.frame === 2, JSON.stringify(e));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.outcome === "fail", 2000);
check("failed parry goes straight to YOU DIED", await waitFor(() => game.scene.isActive("DeathScene"), 300));
await wait(700);
await shot("hurt-02-you-died-mid");
await wait(1200);
await shot("hurt-03-you-died-end");
check("respawns after YOU DIED", await waitFor(() => !game.scene.isActive("DeathScene") && game.scene.isActive("GameScene"), 6000));

// Normal death (Parry Death already spent).
await wait(1500);
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await wait(100);
const f = await anim();
check("normal death plays hurt first", f.key === "hurt", JSON.stringify(f));
await wait(800);
const h = await anim();
check("the knight lies on the down frame before YOU DIED", h.key === "down" && h.frame === 2 && !(await state(() => game.scene.isActive("DeathScene"))), JSON.stringify(h));
await shot("hurt-04-down-before-you-died");
check("YOU DIED follows the collapse", await waitFor(() => game.scene.isActive("DeathScene"), 2500));
check("and respawns", await waitFor(() => !game.scene.isActive("DeathScene"), 6000));
await g.finish("hurt-anim");
