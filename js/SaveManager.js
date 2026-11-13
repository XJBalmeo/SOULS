// Campaign save (Famine v0.2). Contract: docs/SAVE_CONTRACT.md.
// One campaign per browser, in localStorage. Settings are stored separately
// (SoulsSettings). If storage fails the campaign keeps running in memory.
const SaveManager = {
  KEY: "souls.save.v1",
  UNREADABLE_KEY: "souls.save.v1.unreadable", // copy of a save we could not read
  VERSION: 1,
  CHAPTERS: ["famine"],

  campaign: null, // the campaign being played, always in memory
  persistent: true, // false once a write has failed

  // Reads the stored save without changing anything.
  // status: "none" | "ok" | "corrupt" | "unavailable"
  inspect() {
    let raw;
    try {
      raw = localStorage.getItem(this.KEY);
    } catch (e) {
      return { status: "unavailable", error: e };
    }
    if (raw === null) return { status: "none" };
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { status: "corrupt", raw, error: e };
    }
    const problem = this.validate(data);
    return problem ? { status: "corrupt", raw, error: new Error(problem) } : { status: "ok", data };
  },

  // Returns a description of the first problem, or null if the save is usable.
  validate(data) {
    if (!data || typeof data !== "object") return "not an object";
    if (data.version !== this.VERSION) return "unsupported version " + data.version;
    if (typeof data.campaignId !== "string") return "missing campaignId";
    if (!this.CHAPTERS.includes(data.chapter)) return "unknown chapter " + data.chapter;
    if (typeof data.parryDeathUsed !== "boolean") return "missing parryDeathUsed";
    if (!Array.isArray(data.completedChapters) || !data.completedChapters.every((c) => this.CHAPTERS.includes(c))) {
      return "invalid completedChapters";
    }
    const state = data.chapters && data.chapters[data.chapter];
    if (!state || typeof state !== "object") return "missing chapter state";
    if (!Number.isInteger(state.seed) || state.seed < 0) return "invalid seed";
    if (typeof state.checkpointId !== "string") return "missing checkpointId";
    if (state.rooms !== null) {
      if (!Array.isArray(state.rooms) || state.rooms.length === 0) return "invalid rooms";
      const ids = new Set();
      for (const room of state.rooms) {
        if (!room || typeof room.id !== "string" || typeof room.template !== "string") return "invalid room entry";
        if (ids.has(room.id)) return "duplicate room id " + room.id;
        ids.add(room.id);
      }
    }
    return null;
  },

  // New Game. An unreadable save is copied aside first so it is never silently
  // lost; if that copy fails, the new campaign is played without saving.
  startNewCampaign() {
    const existing = this.inspect();
    let canReplace = true;
    if (existing.status === "corrupt") {
      try {
        localStorage.setItem(this.UNREADABLE_KEY, existing.raw);
      } catch (e) {
        canReplace = false;
        console.warn("Could not back up the unreadable save, so it is left untouched and this journey will not be saved:", e);
      }
    }
    const now = new Date().toISOString();
    this.campaign = {
      version: this.VERSION,
      campaignId: now + "-" + Math.floor(Math.random() * 1e9).toString(36),
      createdAt: now,
      updatedAt: now,
      chapter: "famine",
      completedChapters: [],
      parryDeathUsed: false,
      chapters: {
        famine: {
          seed: Math.floor(Math.random() * 0xffffffff),
          rooms: null, // filled in by GameScene on first build, then fixed
          checkpointId: "famine-start",
        },
      },
    };
    this.persistent = canReplace;
    if (canReplace) this.write({ replace: true });
    return this.campaign;
  },

  // Continue. Returns false (and changes nothing) if there is no usable save.
  continueCampaign() {
    const save = this.inspect();
    if (save.status !== "ok") return false;
    this.campaign = save.data;
    this.persistent = true;
    return true;
  },

  chapterState() {
    return this.campaign.chapters[this.campaign.chapter];
  },

  // Saves the in-memory campaign. Unless replacing (New Game), it never
  // overwrites a different campaign (e.g. one started in another tab) or an
  // unreadable save, and keeps parryDeathUsed monotonic across tabs.
  write({ replace = false } = {}) {
    if (!this.campaign || !this.persistent) return false;
    if (!replace) {
      const stored = this.inspect();
      if (stored.status === "ok" && stored.data.campaignId !== this.campaign.campaignId) {
        return this.stopSaving("Another journey was started elsewhere; this one is no longer saved.");
      }
      if (stored.status === "corrupt") {
        return this.stopSaving("The stored save is unreadable; it is left untouched and this journey is not saved.");
      }
      if (stored.status === "ok") {
        this.campaign.parryDeathUsed = this.campaign.parryDeathUsed || stored.data.parryDeathUsed;
      }
    }
    this.campaign.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.campaign));
      return true;
    } catch (e) {
      return this.stopSaving("Progress could not be saved; it is kept for this session only.", e);
    }
  },

  stopSaving(reason, error) {
    this.persistent = false;
    console.warn(reason, error || "");
    return false;
  },
};
