const params = new URLSearchParams(location.search);
const siteId = params.get("site");
const target = safeTarget(params.get("target"));

const $ = (id) => document.getElementById(id);

// Only ever send the user on to a regular web page.
function safeTarget(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function proceed() {
  if (target) location.replace(target);
  else showMessage("You're unlocked. You can close this tab or go back to the site.");
}

function showMessage(text, withOptions = false) {
  $("game").hidden = true;
  const box = $("message");
  box.hidden = false;
  box.innerHTML = `<p></p>`;
  box.querySelector("p").textContent = text;
  if (withOptions) {
    const btn = document.createElement("button");
    btn.textContent = "Open settings";
    btn.addEventListener("click", () => chrome.runtime.openOptionsPage());
    box.appendChild(btn);
  }
}

async function loadProgress(site) {
  const { progress = {} } = await chrome.storage.local.get("progress");
  const saved = progress[site.id];
  // Discard a saved puzzle if the site's game or difficulty changed since.
  return saved && saved.game === site.game && saved.difficulty === site.difficulty ? saved.state : null;
}

async function saveProgress(site, state) {
  const { progress = {} } = await chrome.storage.local.get("progress");
  if (state) progress[site.id] = { game: site.game, difficulty: site.difficulty, state };
  else delete progress[site.id];
  await chrome.storage.local.set({ progress });
}

async function main() {
  const { sites, settings, unlocks } = await PG.getState();
  const site = sites.find((s) => s.id === siteId);

  // The site was removed from the list, or it was already unlocked from another tab.
  if (!site || PG.isUnlocked(site, unlocks)) return proceed();

  const minutes = PG.minutesFor(site, settings);
  $("domain").textContent = site.domain;
  document.title = `${site.domain} · It's Time to Stop`;
  $("subtitle").textContent = `Solve this ${PG.GAMES[site.game]?.label.toLowerCase() ?? "puzzle"} to unlock it for ${minutes} minutes.`;

  const game = PG_GAMES[site.game];
  if (!game) {
    return showMessage(
      `${PG.GAMES[site.game]?.label ?? site.game} isn't available yet. Pick another game for ${site.domain} in settings.`,
      true
    );
  }

  let saveTimer = null;
  let solvedHere = false;
  game.mount($("game"), {
    difficulty: site.difficulty,
    saved: await loadProgress(site),
    onProgress(state) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProgress(site, state), 300);
    },
    async onSolved() {
      solvedHere = true;
      clearTimeout(saveTimer);
      await saveProgress(site, null);
      const res = await chrome.runtime.sendMessage({ type: "unlock", siteId: site.id });
      if (!res?.ok) return showMessage("This site is no longer guarded.");
      $("solved-text").textContent = `${site.domain} is unlocked for ${minutes} minutes.`;
      $("solved").hidden = false;
      $("continue").focus();
    },
  });

  $("continue").addEventListener("click", proceed);

  // If the site gets unlocked or unguarded elsewhere, stop blocking this tab.
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local" || !(changes.unlocks || changes.sites) || solvedHere) return;
    const state = await PG.getState();
    const current = state.sites.find((s) => s.id === siteId);
    if (!current || PG.isUnlocked(current, state.unlocks)) proceed();
  });
}

main();
