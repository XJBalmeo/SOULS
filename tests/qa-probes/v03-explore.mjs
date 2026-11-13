import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
await g.newCampaign();
console.log(JSON.stringify(await g.state(() => {
  const s = game.scene.getScene("GameScene");
  const kids = s.ground.getChildren();
  return { plan:s.roomPlan, n:kids.length, ropes:kids.filter(b=>b.isRope).length, bounds:s.physics.world.bounds, enemies: s.getEnemySprites().map(e=>[e.getData("kind")||"rat",Math.round(e.x),Math.round(e.y)]) };
})));
console.log(g.errors, g.warnings);
process.exit(0);
