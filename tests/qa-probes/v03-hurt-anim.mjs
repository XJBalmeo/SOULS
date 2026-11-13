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
await wait(600);
const dm = await state(() => { const s = game.scene.getScene("GameScene"); return { dim: s.deathDim && +s.deathDim.alpha.toFixed(2), dimDepth: s.deathDim && s.deathDim.depth, player: s.player.depth, reaper: s.parryDeath.reaper && s.parryDeath.reaper.depth }; });
check("downed: world dimmed 80 %, knight and Death above the dim", dm.dim === 0.8 && dm.player > dm.dimDepth && dm.reaper > dm.dimDepth, JSON.stringify(dm));
await shot("hurt-01-downed-awaiting-parry");
check("Death reaches the strike", await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000));
const e = await anim();
check("still on the ground frame at the strike", e.key === "down" && e.frame === 2, JSON.stringify(e));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.outcome === "fail", 2000);
const dimInfo = () => state(() => { const s = game.scene.getScene("GameScene"); return { dim: s.deathDim && +s.deathDim.alpha.toFixed(2), dimDepth: s.deathDim && s.deathDim.depth, player: s.player.depth, reaper: s.parryDeath.reaper && s.parryDeath.reaper.depth }; });
await wait(150);
const k = await dimInfo();
check("failed parry: dim heading to black, not YOU DIED yet", k.dim > 0.8 && !(await state(() => game.scene.isActive("DeathScene"))), JSON.stringify(k));
check("failed parry: YOU DIED after the 1 s fade to black", await waitFor(() => game.scene.isActive("DeathScene"), 1500));
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
await wait(1100);
const h = await anim();
check("the knight lies on the down frame before YOU DIED", h.key === "down" && h.frame === 2 && !(await state(() => game.scene.isActive("DeathScene"))), JSON.stringify(h));
await shot("hurt-04-down-before-you-died");
check("YOU DIED follows the collapse", await waitFor(() => game.scene.isActive("DeathScene"), 2500));
check("and respawns", await waitFor(() => !game.scene.isActive("DeathScene"), 6000));
// Successful parry: the dim fades away and the knight returns to normal depth.
await newCampaign();
await wait(800);
await state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 300; });
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000);
await tap("KeyC");
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000);
await wait(500);
const z = await state(() => { const s = game.scene.getScene("GameScene"); return { dim: !!s.deathDim, rects: s.children.list.filter((c) => c.type === "Rectangle" && c.depth === DEATH_CONFIG.dimDepth).length, player: s.player.depth, outcome: s.parryDeath.outcome }; });
check("parry success: dim removed, knight back at depth 10", z.outcome === "success" && !z.dim && z.rects === 0 && z.player === 10, JSON.stringify(z));
await g.finish("hurt-anim");
