// QA: a non-lethal hit plays the owner's hurt animation (NEW_HURT.png), then normal animations resume.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, check, newCampaign } = g;
await newCampaign();
await wait(800);
const anim = () => state(() => { const p = game.scene.getScene("GameScene").player; return { key: p.anims.currentAnim?.key, playing: p.anims.isPlaying, tint: p.isTinted }; });
await state(() => game.scene.getScene("GameScene").hurtPlayer(10, 1, null));
await wait(100);
const a = await anim();
check("hit plays the hurt animation", a.key === "hurt" && a.playing, JSON.stringify(a));
check("no red tint on top of the hurt art", !a.tint, JSON.stringify(a));
await g.shot("hurt-anim");
await wait(900);
const b = await anim();
check("animation returns to normal after the hurt", b.key !== "hurt", JSON.stringify(b));
await g.finish("hurt-anim");
