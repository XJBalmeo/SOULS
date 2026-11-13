// Sound effects (v0.3): original procedural WAVs from tools/audio/sfx.py.
// Volume = Effects Volume setting; Master Volume is applied by the sound manager.
const SFX_KEYS = [
  "bow_draw", "bow_release", "arrow_hit", "enemy_hit", "player_hurt",
  "starved_rasp", "lunge_whoosh", "body_thud",
  "reaper_arrive", "reaper_telegraph", "scythe_swing", "parry_clang", "parry_fail", "revive",
];

const Sfx = {
  preload(scene) {
    SFX_KEYS.forEach((key) => {
      if (!scene.cache.audio.exists(key)) scene.load.audio(key, "sprites/SFX/" + key + ".wav");
    });
  },

  volume() {
    try {
      return SoulsSettings.load().sfxVolume;
    } catch {
      return 0.8;
    }
  },

  // Fire-and-forget. Returns the sound (or null) so callers can stop long ones.
  play(scene, key, volume = 1) {
    if (!scene || !scene.cache.audio.exists(key)) return null;
    const sound = scene.sound.add(key, { volume: volume * Sfx.volume() });
    sound.once("complete", () => sound.destroy());
    sound.play();
    return sound;
  },
};
