// Chrome runs this as a service worker; Firefox loads lib/common.js via manifest "scripts".
if (typeof PG === "undefined" && typeof importScripts === "function") {
  importScripts("lib/common.js");
}

const GATE_URL = chrome.runtime.getURL("gate/gate.html");
const SWEEP_ALARM = "sweep";
const UNLOCK_ALARM_PREFIX = "unlock:";

function gateUrlFor(site, target) {
  return `${GATE_URL}?site=${encodeURIComponent(site.id)}&target=${encodeURIComponent(target)}`;
}

// Send the tab to the gate if the URL belongs to a guarded site that is not unlocked.
async function guard(tabId, url, state) {
  if (tabId < 0 || !url) return;
  const { sites, unlocks } = state || (await PG.getState());
  const site = PG.matchSite(url, sites);
  if (!site || PG.isUnlocked(site, unlocks)) return;
  try {
    await chrome.tabs.update(tabId, { url: gateUrlFor(site, url) });
  } catch {
    // Tab closed in the meantime.
  }
}

async function updateBadge(tab, state) {
  if (!tab || tab.id < 0) return;
  const { sites, unlocks } = state;
  const site = tab.url && PG.matchSite(tab.url, sites);
  let text = "";
  if (site && PG.isUnlocked(site, unlocks)) {
    const minutes = Math.ceil((unlocks[site.id] - Date.now()) / 60000);
    text = minutes > 99 ? "99+" : `${minutes}m`;
  }
  try {
    await chrome.action.setBadgeText({ tabId: tab.id, text });
    if (text) await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#3a7d5c" });
  } catch {
    // Tab closed in the meantime.
  }
}

// Re-check every open tab: re-locks expired sites and refreshes badges.
async function sweep() {
  const state = await PG.getState();

  const now = Date.now();
  const live = Object.fromEntries(Object.entries(state.unlocks).filter(([, t]) => t > now));
  if (Object.keys(live).length !== Object.keys(state.unlocks).length) {
    state.unlocks = live;
    await chrome.storage.local.set({ unlocks: live });
  }

  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      await guard(tab.id, tab.url, state);
      await updateBadge(tab, state);
    })
  );
}

async function ensureSweepAlarm() {
  if (!(await chrome.alarms.get(SWEEP_ALARM))) {
    chrome.alarms.create(SWEEP_ALARM, { periodInMinutes: 1 });
  }
}

async function unlock(siteId) {
  const { sites, settings, unlocks } = await PG.getState();
  const site = sites.find((s) => s.id === siteId);
  if (!site) return { ok: false };
  const expiresAt = Date.now() + PG.minutesFor(site, settings) * 60000;
  unlocks[site.id] = expiresAt;
  await chrome.storage.local.set({ unlocks });
  chrome.alarms.create(UNLOCK_ALARM_PREFIX + site.id, { when: expiresAt });
  return { ok: true, expiresAt };
}

async function lock(siteId) {
  const { unlocks } = await PG.getState();
  delete unlocks[siteId];
  await chrome.storage.local.set({ unlocks });
  await chrome.alarms.clear(UNLOCK_ALARM_PREFIX + siteId);
  await sweep();
  return { ok: true };
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) guard(details.tabId, details.url);
});

// Catches URL changes that don't go through a full navigation (e.g. single-page apps).
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.url) await guard(tabId, info.url);
  if (info.status === "complete") updateBadge(tab, await PG.getState());
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    updateBadge(await chrome.tabs.get(tabId), await PG.getState());
  } catch {
    // Tab closed in the meantime.
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SWEEP_ALARM || alarm.name.startsWith(UNLOCK_ALARM_PREFIX)) sweep();
});

// A newly guarded site (or a shorter unlock) should take effect on open tabs right away.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.sites || changes.settings)) sweep();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "unlock") {
    unlock(msg.siteId).then(sendResponse);
    return true;
  }
  if (msg?.type === "lock") {
    lock(msg.siteId).then(sendResponse);
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await ensureSweepAlarm();
  if (reason === "install") chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureSweepAlarm();
  sweep();
});

ensureSweepAlarm();
