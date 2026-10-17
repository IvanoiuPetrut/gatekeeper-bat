// Shared helpers used by the background script and every extension page.
globalThis.PG = {
  DEFAULT_SETTINGS: { defaultMinutes: 30, font: "pixel" },

  DIFFICULTIES: ["easy", "medium", "hard", "expert"],

  // Games that can guard a site. Add new ones here and register a UI in games/.
  GAMES: {
    sudoku: { label: "Sudoku", available: true },
    chess: { label: "Chess", available: false },
  },

  // "https://www.YouTube.com/watch?v=1" -> "youtube.com"
  normalizeDomain(input) {
    let text = String(input || "").trim().toLowerCase();
    if (!text) return null;
    if (!/^[a-z]+:\/\//.test(text)) text = "http://" + text;
    let host;
    try {
      host = new URL(text).hostname;
    } catch {
      return null;
    }
    host = host.replace(/^www\./, "").replace(/\.$/, "");
    if (!host || (!host.includes(".") && host !== "localhost")) return null;
    return host;
  },

  // Returns the guarded site that covers this URL (subdomains included), or null.
  matchSite(url, sites) {
    let host;
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      host = u.hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
    let best = null;
    for (const site of sites) {
      if (host === site.domain || host.endsWith("." + site.domain)) {
        if (!best || site.domain.length > best.domain.length) best = site;
      }
    }
    return best;
  },

  async getState() {
    const data = await chrome.storage.local.get(["sites", "settings", "unlocks"]);
    return {
      sites: data.sites || [],
      settings: { ...PG.DEFAULT_SETTINGS, ...(data.settings || {}) },
      unlocks: data.unlocks || {},
    };
  },

  minutesFor(site, settings) {
    return site.minutes > 0 ? site.minutes : settings.defaultMinutes;
  },

  isUnlocked(site, unlocks) {
    return (unlocks[site.id] || 0) > Date.now();
  },

  formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  },

  capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
};
