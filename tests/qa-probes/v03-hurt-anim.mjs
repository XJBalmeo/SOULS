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
const hud = await state(() => { const s = game.scene.getScene("GameScene"); const d = s.deathDimHud; return { alpha: d && +d.alpha.toFixed(2), depth: d && d.depth, sf: d && d.scrollFactorX, hudMax: Math.max(...[s.hudHp, s.hudStamina, s.hudDelay].map((o) => o.depth)) }; });
check("downed: HUD bars dimmed 80 % too", hud.alpha === 0.8 && hud.depth > hud.hudMax && hud.sf === 0, JSON.stringify(hud));
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
await wait(100);
const nk = await state(() => game.scene.getScene("DeathScene").children.list.find((c) => c.type === "Sprite").texture.key);
check("facing right uses the normal YOU DIED", nk === "you_died", nk);
await wait(700);
await shot("hurt-02-you-died-mid");
await wait(1200);
await shot("hurt-03-you-died-end");
check("respawns after YOU DIED", await waitFor(() => !game.scene.isActive("DeathScene") && game.scene.isActive("GameScene"), 6000));

// Mouse cursor hidden in play, back for the pause menu.
const cursor = () => state(() => game.canvas.style.cursor);
check("no mouse cursor during play", (await cursor()) === "none", await cursor());
await state(() => game.scene.getScene("GameScene").requestPause());
await wait(300);
check("cursor shows in the pause menu", (await cursor()) === "default", await cursor());
await state(() => { game.scene.stop("PauseScene"); game.scene.resume("GameScene"); game.scene.getScene("GameScene").pauseRequested = false; });
await wait(300);
check("cursor hidden again after resuming", (await cursor()) === "none", await cursor());

// Normal death (Parry Death already spent), knight facing left -> mirrored YOU DIED.
await wait(1500);
await state(() => game.scene.getScene("GameScene").player.setFlipX(true));
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await wait(100);
const f = await anim();
check("normal death plays hurt first", f.key === "hurt", JSON.stringify(f));
await wait(1100);
const h = await anim();
check("the knight lies on the down frame before YOU DIED", h.key === "down" && h.frame === 2 && !(await state(() => game.scene.isActive("DeathScene"))), JSON.stringify(h));
await shot("hurt-04-down-before-you-died");
check("YOU DIED follows the collapse", await waitFor(() => game.scene.isActive("DeathScene"), 2500));
await wait(200);
const mk = await state(() => game.scene.getScene("DeathScene").children.list.find((c) => c.type === "Sprite").texture.key);
check("facing left uses YOU DIED MIRROR", mk === "you_died_mirror", mk);
await shot("hurt-05-you-died-mirror");
check("and respawns", await waitFor(() => !game.scene.isActive("DeathScene"), 6000));
// Successful parry: the dim fades away and the knight returns to normal depth.
await newCampaign();
await wait(800);
await state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 300; });
await state(() => game.scene.getScene("GameScene").takeDamage(999));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000);
await g.rightClick();
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "IDLE", 4000);
await wait(500);
const z = await state(() => { const s = game.scene.getScene("GameScene"); return { dim: !!s.deathDim, rects: s.children.list.filter((c) => c.type === "Rectangle" && c.depth === DEATH_CONFIG.dimDepth).length, player: s.player.depth, outcome: s.parryDeath.outcome }; });
const hudLeft = await state(() => game.scene.getScene("GameScene").children.list.filter((c) => c.type === "Rectangle" && c.depth === DEATH_CONFIG.hudDimDepth).length);
check("parry success: dim removed, knight back at depth 10", z.outcome === "success" && !z.dim && z.rects === 0 && hudLeft === 0 && z.player === 10, JSON.stringify({ ...z, hudLeft }));
const durs = await state(() => ["you_died", "you_died_mirror"].map((k) => game.anims.get(k).frames.map((f) => f.duration).join(",")));
const want = "150,150,150,150,150,150,80,80,80,80,80,80,80,80,80";
check("YOU DIED timing: frames 1-6 150 ms, 7-15 80 ms (both sheets)", durs.every((d) => d === want), JSON.stringify(durs));
check("last frame held 3 s", (await state(() => DEATH_CONFIG.holdMs)) === 3000);
await g.finish("hurt-anim");
