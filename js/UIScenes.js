// Menu, pause, settings and credits scenes for SOULS (Famine v0.1 Foundation).

// Animated title logo: sprites/title.png, 5 frames of 177x39.
// Frames 1-3 loop on the menu; New Game plays frames 4-5 once and holds 5.
const TITLE_CONFIG = {
  idleFrameMs: 200, // duration of each looping frame 1-3
  startFrameMs: 80, // duration of frames 4 and 5 after New Game
  startDelayMs: 1500, // time from pressing New Game until the game starts
  fadeMs: 250, // fade to black at the end of that delay
  scale: 4, // on-screen size multiplier (177x39 -> 708x156)
  backgroundDim: 0.5892, // black over the menu background: 0 = no dim, 1 = full black
};

// UI font. Set useCustomFont to false to go back to the Georgia serif.
// Knight Warrior is a personal-use demo font (Maknastudio); a commercial
// licence is required before release, and the file is not committed to git.
const FONT_CONFIG = {
  useCustomFont: true,
  custom: { family: "Knight Warrior", url: "sprites/FONTS/KnightWarrior.otf" },
  fallback: '"Georgia", "Times New Roman", serif',
};

// Player settings, persisted independently of any future campaign save.
// Fullscreen is mandatory, so it is not a setting.
const SoulsSettings = {
  KEY: "souls.settings.v1",
  DEFAULTS: {
    masterVolume: 0.8,
    musicVolume: 0.8,
    sfxVolume: 0.8,
    showHitboxes: false,
  },
  load() {
    const settings = { ...this.DEFAULTS };
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(this.KEY));
    } catch (e) {
      console.warn("Settings unreadable, using defaults:", e);
    }
    if (stored && typeof stored === "object") {
      for (const key of Object.keys(this.DEFAULTS)) {
        if (typeof stored[key] === typeof this.DEFAULTS[key]) settings[key] = stored[key];
      }
    }
    for (const key of ["masterVolume", "musicVolume", "sfxVolume"]) {
      settings[key] = Phaser.Math.Clamp(Math.round(settings[key] * 10) / 10, 0, 1);
    }
    return settings;
  },
  save(settings) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Settings could not be saved:", e);
    }
  },
};

const UI = {
  get FONT() {
    const { useCustomFont, custom, fallback } = FONT_CONFIG;
    return useCustomFont ? `"${custom.family}", ${fallback}` : fallback;
  },

  // Resolves once the custom font is usable (or has failed, leaving the fallback).
  fontReady: FONT_CONFIG.useCustomFont
    ? new FontFace(FONT_CONFIG.custom.family, `url("${FONT_CONFIG.custom.url}")`)
        .load()
        .then((face) => document.fonts.add(face))
        .catch((e) => console.warn("UI font failed to load, using fallback:", e))
    : Promise.resolve(),
  COLORS: {
    bone: "#ffffff",
    accent: "#a8d672",
    dim: "#7d8a6c",
    disabled: "#46503f",
    shadow: "#0a100c",
  },

  overlayVisible() {
    const overlay = document.getElementById("fullscreen-overlay");
    return !!overlay && overlay.style.display === "flex";
  },

  enterFullscreen() {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch((e) => {
      console.warn("Could not enter fullscreen:", e);
    });
  },

  text(scene, x, y, content, size, color = UI.COLORS.bone) {
    return scene.add
      .text(x, y, content, {
        fontFamily: UI.FONT,
        fontSize: size + "px",
        color,
        align: "center",
        stroke: UI.COLORS.shadow,
        strokeThickness: Math.max(2, Math.round(size / 8)),
      })
      .setOrigin(0.5);
  },

  // Vertical menu driven by keyboard (arrows/WASD, Enter/Space/Z) and mouse.
  // Disabled items can be highlighted so their hint explains why.
  // item: { label: string|fn, onSelect, onLeft, onRight, disabled, hint }
  menu(scene, x, y, items, { spacing = 52, size = 32, onBack = null } = {}) {
    let index = Math.max(0, items.findIndex((item) => !item.disabled));
    const labelOf = (item) => (typeof item.label === "function" ? item.label() : item.label);
    const texts = items.map((item, i) => {
      const t = UI.text(scene, x, y + i * spacing, "", size).setInteractive({ useHandCursor: true });
      t.on("pointerover", () => {
        index = i;
        render();
      });
      t.on("pointerdown", () => activate(i));
      return t;
    });
    const hint = UI.text(scene, x, y + items.length * spacing + 8, "", 18, UI.COLORS.dim);

    function render() {
      texts.forEach((t, i) => {
        const item = items[i];
        const selected = i === index;
        t.setText(selected ? `>  ${labelOf(item)}  <` : labelOf(item));
        t.setColor(item.disabled ? UI.COLORS.disabled : selected ? UI.COLORS.accent : UI.COLORS.bone);
      });
      hint.setText(items[index].hint || "");
    }
    function activate(i) {
      if (UI.overlayVisible()) return;
      index = i;
      const item = items[i];
      if (item.disabled) {
        const t = texts[i];
        scene.tweens.killTweensOf(t);
        t.x = x;
        scene.tweens.add({ targets: t, x: x + 6, duration: 40, yoyo: true, repeat: 2 });
      } else if (item.onSelect) {
        item.onSelect();
      }
      if (scene.sys.isActive()) render();
    }
    function adjust(fn) {
      if (fn && !items[index].disabled) {
        fn();
        render();
      }
    }

    scene.input.keyboard.on("keydown", (event) => {
      if (UI.overlayVisible()) return;
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          index = (index - 1 + items.length) % items.length;
          render();
          break;
        case "ArrowDown":
        case "KeyS":
          index = (index + 1) % items.length;
          render();
          break;
        case "ArrowLeft":
        case "KeyA":
          adjust(items[index].onLeft);
          break;
        case "ArrowRight":
        case "KeyD":
          adjust(items[index].onRight);
          break;
        case "Enter":
        case "Space":
        case "KeyZ":
          if (!event.repeat) activate(index);
          break;
        case "Escape":
        case "Backspace":
        case "KeyP":
          if (!event.repeat && onBack) onBack();
          break;
      }
    });
    render();
    return { render, get index() { return index; } };
  },

  // Opens settings above the calling scene, which sleeps until Back.
  openSettings(scene) {
    scene.scene.launch("SettingsScene", { from: scene.scene.key });
    scene.scene.sleep();
  },
};

// Waits for the UI font so no text is drawn with the fallback first.
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }
  create() {
    UI.fontReady.then(() => this.scene.start("MenuScene"));
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }
  preload() {
    this.load.image("menu_bg", "levels/famine/FARBACKGROUND_LEVEL1.png");
    this.load.spritesheet("title", "sprites/title.png", { frameWidth: 177, frameHeight: 39 });
  }
  create() {
    const { width, height } = this.scale;
    this.input.enabled = true;
    this.input.keyboard.enabled = true;
    this.sound.volume = SoulsSettings.load().masterVolume;

    const bgTexture = this.textures.get("menu_bg").getSourceImage();
    const bgScale = height / bgTexture.height;
    this.bg = this.add
      .tileSprite(0, 0, width / bgScale, bgTexture.height, "menu_bg")
      .setOrigin(0)
      .setScale(bgScale);
    this.add.rectangle(0, 0, width, height, 0x000000, TITLE_CONFIG.backgroundDim).setOrigin(0);

    if (!this.anims.exists("title_idle")) {
      this.anims.create({
        key: "title_idle",
        frames: [0, 1, 2].map((frame) => ({ key: "title", frame, duration: TITLE_CONFIG.idleFrameMs })),
        repeat: -1,
      });
      this.anims.create({
        key: "title_start",
        frames: [3, 4].map((frame) => ({ key: "title", frame, duration: TITLE_CONFIG.startFrameMs })),
        repeat: 0, // holds on frame 5 when finished
      });
    }
    this.title = this.add.sprite(width / 2, 170, "title").setScale(TITLE_CONFIG.scale).play("title_idle");
    UI.text(this, width / 2, 270, "CHAPTER I  -  FAMINE", 24, UI.COLORS.accent);

    // A save system does not exist until Famine v0.2, so Continue is unavailable.
    this.menu = UI.menu(this, width / 2, 360, [
      { label: "New Game", onSelect: () => this.startNewGame() },
      {
        label: "Continue",
        disabled: true,
        hint: "No saved journey yet. Saving arrives with checkpoints.",
      },
      { label: "Settings", onSelect: () => UI.openSettings(this) },
      { label: "Credits", onSelect: () => this.scene.start("CreditsScene") },
    ]);

    UI.text(this, width / 2, height - 40,
      "↑ ↓ choose   |   Enter / Z confirm   |   Esc / P pause in game", 16, UI.COLORS.dim);
    UI.text(this, width - 90, height - 18, "build v0.1", 14, UI.COLORS.disabled);
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }
  update(time, delta) {
    this.bg.tilePositionX += delta * 0.006;
  }
  startNewGame() {
    // Lock the menu so no other item can be chosen mid-transition.
    this.input.enabled = false;
    this.input.keyboard.enabled = false;
    // Requested now, while the key press/click still counts as a user gesture.
    UI.enterFullscreen();
    this.title.play("title_start");
    const { startDelayMs, fadeMs } = TITLE_CONFIG;
    this.time.delayedCall(Math.max(0, startDelayMs - fadeMs), () => this.cameras.main.fadeOut(fadeMs, 0, 0, 0));
    this.time.delayedCall(startDelayMs, () => this.scene.start("GameScene"));
  }
}

class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }
  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x050805, 0.72).setOrigin(0);
    UI.text(this, width / 2, 200, "PAUSED", 64);
    this.menu = UI.menu(
      this,
      width / 2,
      320,
      [
        { label: "Resume", onSelect: () => this.resumeGame() },
        { label: "Settings", onSelect: () => UI.openSettings(this) },
        {
          label: "Retry from Checkpoint",
          disabled: true,
          hint: "Checkpoints arrive with the save system.",
        },
        { label: "Quit to Main Menu", onSelect: () => this.quitToMenu() },
      ],
      { onBack: () => this.resumeGame() },
    );
  }
  resumeGame() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
  quitToMenu() {
    this.scene.stop("GameScene");
    this.scene.start("MenuScene");
  }
}

class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }
  init(data) {
    this.from = (data && data.from) || "MenuScene";
  }
  create() {
    const { width, height } = this.scale;
    this.settings = SoulsSettings.load();
    this.add.rectangle(0, 0, width, height, 0x070b07, this.from === "MenuScene" ? 0.96 : 0.82).setOrigin(0);
    UI.text(this, width / 2, 130, "SETTINGS", 56);

    const percent = (key) => `${Math.round(this.settings[key] * 100)}%`;
    const onOff = (key) => (this.settings[key] ? "On" : "Off");
    const volume = (key, name, hint) => ({
      label: () => `${name}   ◂ ${percent(key)} ▸`,
      hint,
      onLeft: () => this.change(key, Math.max(0, this.settings[key] - 0.1)),
      onRight: () => this.change(key, Math.min(1, this.settings[key] + 0.1)),
      onSelect: () => this.change(key, this.settings[key] >= 1 ? 0 : Math.min(1, this.settings[key] + 0.1)),
    });
    const toggle = (key, name, hint) => ({
      label: () => `${name}   ${onOff(key)}`,
      hint,
      onLeft: () => this.change(key, !this.settings[key]),
      onRight: () => this.change(key, !this.settings[key]),
      onSelect: () => this.change(key, !this.settings[key]),
    });

    this.menu = UI.menu(
      this,
      width / 2,
      240,
      [
        volume("masterVolume", "Master Volume", "← → to adjust."),
        volume("musicVolume", "Music Volume", "Saved now; music is added in a later build."),
        volume("sfxVolume", "Effects Volume", "Saved now; sound effects are added in a later build."),
        toggle("showHitboxes", "Show Hitboxes", "Debug view of collision and sword hitboxes (Tab in game)."),
        { label: "Back", onSelect: () => this.back() },
      ],
      { spacing: 50, size: 28, onBack: () => this.back() },
    );
  }
  change(key, value) {
    this.settings[key] = typeof value === "number" ? Math.round(value * 10) / 10 : value;
    SoulsSettings.save(this.settings);
    if (key === "masterVolume") this.sound.volume = this.settings.masterVolume;
    if (key === "showHitboxes" && (this.scene.isActive("GameScene") || this.scene.isPaused("GameScene"))) {
      this.scene.get("GameScene").setHitboxDebug(value);
    }
  }
  back() {
    this.scene.stop();
    this.scene.wake(this.from);
  }
}

class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }
  create() {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, this.scale.height, 0x070b07, 1).setOrigin(0);
    UI.text(this, width / 2, 130, "CREDITS", 56);
    UI.text(
      this,
      width / 2,
      300,
      "SOULS - an original dark-fantasy action platformer\n\n" +
        "Game, art and level design: the SOULS team\n" +
        "Engine: Phaser 3.80.1 (MIT License)\n" +
        "Levels authored with LDtk\n\n" +
        "Full credits roster to be confirmed by the owner.",
      22,
    ).setLineSpacing(8);
    UI.menu(this, width / 2, 520, [{ label: "Back", onSelect: () => this.back() }], {
      onBack: () => this.back(),
    });
  }
  back() {
    this.scene.start("MenuScene");
  }
}
