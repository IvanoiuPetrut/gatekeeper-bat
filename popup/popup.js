const content = document.getElementById("content");
let countdown = null;

async function render() {
  clearInterval(countdown);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { sites, settings, unlocks } = await PG.getState();
  const domain = tab?.url && PG.normalizeDomain(tab.url);
  const isWeb = /^https?:/.test(tab?.url || "");
  const site = tab?.url && PG.matchSite(tab.url, sites);

  if (!isWeb || !domain) {
    content.innerHTML = `<p class="muted">Open a website to guard it, or manage your list in settings.</p>`;
    return;
  }

  if (!site) {
    content.innerHTML = `
      <p class="domain"></p>
      <p class="muted">Not guarded.</p>
      <div class="row">
        <select id="difficulty" aria-label="Difficulty">
          ${PG.DIFFICULTIES.map((d) => `<option value="${d}" ${d === "medium" ? "selected" : ""}>${PG.capitalize(d)} sudoku</option>`).join("")}
        </select>
        <button id="guard" class="primary">Guard</button>
      </div>`;
    content.querySelector(".domain").textContent = domain;
    document.getElementById("guard").addEventListener("click", async () => {
      sites.push({
        id: crypto.randomUUID(),
        domain,
        game: "sudoku",
        difficulty: document.getElementById("difficulty").value,
        minutes: null,
      });
      await chrome.storage.local.set({ sites });
      window.close();
    });
    return;
  }

  const game = PG.GAMES[site.game]?.label ?? site.game;
  const minutes = PG.minutesFor(site, settings);
  content.innerHTML = `
    <p class="domain"></p>
    <p class="muted">${PG.capitalize(site.difficulty)} ${game.toLowerCase()} · ${minutes} min per unlock</p>
    <div class="row">
      <span class="remaining" id="remaining"></span>
      <button id="lock" class="danger">Lock now</button>
    </div>`;
  content.querySelector(".domain").textContent = site.domain;

  const tick = () => {
    const left = (unlocks[site.id] || 0) - Date.now();
    document.getElementById("remaining").textContent = left > 0 ? `${PG.formatRemaining(left)} left` : "Locked";
    document.getElementById("lock").hidden = left <= 0;
  };
  tick();
  countdown = setInterval(tick, 1000);

  document.getElementById("lock").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "lock", siteId: site.id });
    window.close();
  });
}

document.getElementById("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

render();
