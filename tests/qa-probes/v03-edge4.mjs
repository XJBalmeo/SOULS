// QA v0.3 edge 4: quit to main menu mid-encounter, Continue, New Game.
import { openGame } from "../helpers.mjs";
const g = await openGame("tests/qa-probes/out-v03");
const { state, wait, tap, waitFor, check, newCampaign } = g;
const snap = () => state(() => {
  const gs = game.scene.getScene("GameScene");
  return { menu: game.scene.isActive("MenuScene"), gameActive: game.scene.isActive("GameScene"), gamePaused: game.scene.isPaused("GameScene"),
    playing: game.sound.sounds.filter(x => x.isPlaying || x.isPaused).map(x => x.key),
    used: SaveManager.campaign && SaveManager.campaign.parryDeathUsed, stored: (localStorage.getItem("souls.save.v1") || "").includes("\"parryDeathUsed\":true"),
    reapers: gs && gs.children ? gs.children.list.filter(o => o.texture && o.texture.key.startsWith("reaper_")).length : null,
    enc: gs && gs.parryDeath ? gs.parryDeath.state : null, kbl: gs && gs.input && gs.input.keyboard ? gs.input.keyboard.listenerCount("keydown") : null };
});
await newCampaign();
await state(() => { delete PARRY_DEATH_CONFIG.forcedDelayMs; PARRY_DEATH_CONFIG.forcedDelayMs = 2000; game.scene.getScene("GameScene").getEnemySprites().forEach(e => e.destroy()); });
await wait(500);
await state(() => game.scene.getScene("GameScene").hurtPlayer(200, 1, null));
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "DEATH_APPROACH", 3000);
await wait(500);
console.log("mid-encounter", JSON.stringify(await snap()));
await state(() => game.scene.getScene("GameScene").requestPause());
await waitFor(() => game.scene.isActive("PauseScene"), 2000);
await state(() => game.scene.getScene("PauseScene").quitToMenu());
await waitFor(() => game.scene.isActive("MenuScene"), 3000);
await wait(500);
let s = await snap(); console.log("at menu", JSON.stringify(s));
check("4a: menu active, GameScene not running", s.menu && !s.gameActive);
check("4a: no sounds left playing/paused", s.playing.length === 0, JSON.stringify(s.playing));
check("4a: flag spent in memory and in storage", s.used === true && s.stored === true, JSON.stringify(s));
// Continue
await state(() => { SaveManager.continueCampaign(); game.scene.getScene("MenuScene").enterGame("continue"); });
check("4b: Continue enters GameScene", await waitFor(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player && !game.scene.getScene("GameScene").isDead, 8000));
await wait(600);
s = await snap(); console.log("after continue", JSON.stringify(s));
check("4b: no ghost reaper, encounter IDLE, flag still spent", s.reapers === 0 && s.enc === "IDLE" && s.used === true, JSON.stringify(s));
check("4b: keyboard keydown listeners sane (<=1)", s.kbl <= 1, "kbl=" + s.kbl);
const hp = await state(() => game.scene.getScene("GameScene").player.getData("hp"));
check("4b: full hp on Continue", hp === 100, "hp=" + hp);
await state(() => { const sc = game.scene.getScene("GameScene"); sc.getEnemySprites().forEach(e => e.destroy()); sc.hurtPlayer(200, 1, null); });
await wait(300);
s = await snap(); console.log("fatal after continue", JSON.stringify(s));
check("4b: next fatal hit is a normal death, no encounter", s.enc === "IDLE" && s.reapers === 0 && await state(() => game.scene.getScene("GameScene").isDead));
await waitFor(() => game.scene.isActive("DeathScene"), 4000);
check("4b: death screen then checkpoint restore", await waitFor(() => { const sc = game.scene.getScene("GameScene"); return game.scene.isActive("GameScene") && sc.player && !sc.isDead && sc.player.getData("hp") === 100; }, 9000));
// Quit again (not in encounter) then New Game
await state(() => game.scene.getScene("GameScene").requestPause());
await waitFor(() => game.scene.isActive("PauseScene"), 2000);
await state(() => game.scene.getScene("PauseScene").quitToMenu());
await waitFor(() => game.scene.isActive("MenuScene"), 3000); await wait(400);
await state(() => game.scene.getScene("MenuScene").enterGame("new"));
check("4c: New Game enters GameScene", await waitFor(() => game.scene.isActive("GameScene") && game.scene.getScene("GameScene").player && !game.scene.getScene("GameScene").isDead, 8000));
await wait(500);
s = await snap(); console.log("after new game", JSON.stringify(s));
check("4c: New Game: opportunity fresh", s.used === false, JSON.stringify(s));
await state(() => { delete PARRY_DEATH_CONFIG.forcedDelayMs; PARRY_DEATH_CONFIG.forcedDelayMs = 0; const sc = game.scene.getScene("GameScene"); sc.getEnemySprites().forEach(e => e.destroy()); sc.hurtPlayer(200, 1, null); });
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000);
await tap("KeyC");
check("4c: New Game: encounter runs and parry succeeds", await waitFor(() => { const d = game.scene.getScene("GameScene").parryDeath; return d.state === "IDLE" && d.outcome === "success"; }, 5000));
// Quit during PARRY_SUCCESS and during DOWNED too
await state(() => { SaveManager.campaign.parryDeathUsed = false; });
await state(() => { PARRY_DEATH_CONFIG.forcedDelayMs = 0; game.scene.getScene("GameScene").hurtPlayer(200, 1, null); });
await waitFor(() => game.scene.getScene("GameScene").parryDeath.state === "SINGLE_STRIKE", 6000); await tap("KeyC"); await wait(200);
await state(() => game.scene.getScene("GameScene").requestPause());
await waitFor(() => game.scene.isActive("PauseScene"), 2000);
await state(() => game.scene.getScene("PauseScene").quitToMenu());
await waitFor(() => game.scene.isActive("MenuScene"), 3000); await wait(500);
s = await snap(); console.log("quit during PARRY_SUCCESS", JSON.stringify(s));
check("4d: quit during PARRY_SUCCESS leaves no sounds", s.playing.length === 0, JSON.stringify(s.playing));
await g.finish("v03-edge4");
