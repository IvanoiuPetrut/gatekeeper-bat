const $ = (id) => document.getElementById(id);

let justAdded = null;
let toastTimer = null;

function gameOptions(selected) {
  return Object.entries(PG.GAMES)
    .map(
      ([key, g]) =>
        `<option value="${key}" ${key === selected ? "selected" : ""} ${g.available ? "" : "disabled"}>` +
        `${g.label}${g.available ? "" : " (soon)"}</option>`
    )
    .join("");
}

function difficultyOptions(selected) {
  return PG.DIFFICULTIES.map(
    (d) => `<option value="${d}" ${d === selected ? "selected" : ""}>${PG.capitalize(d)}</option>`
  ).join("");
}

async function updateSite(id, patch) {
  const { sites } = await PG.getState();
  await chrome.storage.local.set({ sites: sites.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
}

function statusHtml(site, unlocks) {
  if (PG.isUnlocked(site, unlocks)) {
    return (
      `<span class="pill unlocked" data-expires="${unlocks[site.id]}">` +
      `${PG.formatRemaining(unlocks[site.id] - Date.now())} left</span>` +
      `<button class="link" data-act="lock">Lock now</button>`
    );
  }
  return `<span class="pill locked">Locked</span>`;
}

function showToast(text, onUndo) {
  clearTimeout(toastTimer);
  $("toast-text").textContent = text;
  $("toast-undo").onclick = () => {
    hideToast();
    onUndo();
  };
  $("toast").hidden = false;
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  clearTimeout(toastTimer);
  $("toast").hidden = true;
}

async function removeSite(site) {
  const state = await PG.getState();
  const index = state.sites.findIndex((s) => s.id === site.id);
  const unlockedUntil = state.unlocks[site.id];
  delete state.unlocks[site.id];
  await chrome.storage.local.set({
    sites: state.sites.filter((s) => s.id !== site.id),
    unlocks: state.unlocks,
  });

  showToast(`${site.domain} is no longer guarded.`, async () => {
    const now = await PG.getState();
    if (now.sites.some((s) => s.domain === site.domain)) return;
    now.sites.splice(Math.min(index, now.sites.length), 0, site);
    if (unlockedUntil > Date.now()) now.unlocks[site.id] = unlockedUntil;
    await chrome.storage.local.set({ sites: now.sites, unlocks: now.unlocks });
  });
}

function buildRow(site, settings, unlocks) {
  const row = document.createElement("div");
  row.className = "grid site-row" + (site.id === justAdded ? " enter" : "");
  row.innerHTML = `
    <div class="site-name">
      <span class="domain"></span>
      <span class="site-status">${statusHtml(site, unlocks)}</span>
    </div>
    <select data-field="game" aria-label="Game">${gameOptions(site.game)}</select>
    <select data-field="difficulty" aria-label="Difficulty">${difficultyOptions(site.difficulty)}</select>
    <input data-field="minutes" type="number" min="1" max="1440" inputmode="numeric" aria-label="Minutes"
           placeholder="${settings.defaultMinutes}" value="${site.minutes || ""}">
    <button class="danger" data-act="remove">Remove</button>`;
  row.querySelector(".domain").textContent = site.domain;
  row.querySelector(".domain").title = site.domain;

  row.querySelector('[data-field="game"]').addEventListener("change", (e) =>
    updateSite(site.id, { game: e.target.value })
  );
  row.querySelector('[data-field="difficulty"]').addEventListener("change", (e) =>
    updateSite(site.id, { difficulty: e.target.value })
  );
  row.querySelector('[data-field="minutes"]').addEventListener("change", (e) => {
    const n = parseInt(e.target.value, 10);
    updateSite(site.id, { minutes: n > 0 ? Math.min(n, 1440) : null });
  });
  row.querySelector('[data-act="remove"]').addEventListener("click", () => removeSite(site));
  row.querySelector(".site-status").addEventListener("click", (e) => {
    if (e.target.dataset.act === "lock") chrome.runtime.sendMessage({ type: "lock", siteId: site.id });
  });
  return row;
}

async function render() {
  const { sites, settings, unlocks } = await PG.getState();
  if (document.activeElement !== $("default-minutes")) $("default-minutes").value = settings.defaultMinutes;
  $("add-minutes").placeholder = settings.defaultMinutes;
  $("count").textContent = sites.length ? `${sites.length} website${sites.length === 1 ? "" : "s"}` : "";

  const list = $("sites");
  if (!sites.length) {
    list.innerHTML = `<p class="empty muted">Nothing guarded yet. Add a website above to get started.</p>`;
    return;
  }
  list.replaceChildren(...sites.map((site) => buildRow(site, settings, unlocks)));
  justAdded = null;
}

function setError(text) {
  $("add-error").textContent = text;
  $("add-domain").setAttribute("aria-invalid", text ? "true" : "false");
}

$("add-domain").addEventListener("input", () => setError(""));

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = $("add-domain").value;
  if (!raw.trim()) return $("add-domain").focus();

  const domain = PG.normalizeDomain(raw);
  if (!domain) return setError("That doesn't look like a website. Try something like youtube.com.");

  const { sites } = await PG.getState();
  if (sites.some((s) => s.domain === domain)) return setError(`${domain} is already guarded.`);

  const minutes = parseInt($("add-minutes").value, 10);
  const site = {
    id: crypto.randomUUID(),
    domain,
    game: $("add-game").value,
    difficulty: $("add-difficulty").value,
    minutes: minutes > 0 ? Math.min(minutes, 1440) : null,
  };
  justAdded = site.id;
  await chrome.storage.local.set({ sites: [...sites, site] });
  $("add-domain").value = "";
  $("add-minutes").value = "";
  $("add-domain").focus();
});

$("default-minutes").addEventListener("change", async (e) => {
  const n = parseInt(e.target.value, 10);
  const { settings } = await PG.getState();
  if (n > 0) await chrome.storage.local.set({ settings: { ...settings, defaultMinutes: Math.min(n, 1440) } });
  else e.target.value = settings.defaultMinutes;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.sites || changes.settings || changes.unlocks)) render();
});

// Live countdowns; re-render once a site's unlock runs out.
setInterval(() => {
  for (const pill of document.querySelectorAll("[data-expires]")) {
    const left = Number(pill.dataset.expires) - Date.now();
    if (left <= 0) return render();
    pill.textContent = `${PG.formatRemaining(left)} left`;
  }
}, 1000);

$("add-game").innerHTML = gameOptions("sudoku");
$("add-difficulty").innerHTML = difficultyOptions("medium");
render();
