// Applies the chosen UI font ("pixel" or "plain") before first paint, then keeps it in
// sync with settings. Loaded synchronously in <head>; localStorage is a per-extension
// cache so the page never flashes the wrong font while chrome.storage loads.
(() => {
  const apply = (font) => {
    document.documentElement.dataset.font = font === "plain" ? "plain" : "pixel";
  };
  const remember = (font) => {
    apply(font);
    try {
      localStorage.setItem("font", font);
    } catch {
      // Storage blocked; the chrome.storage value still applies.
    }
  };

  try {
    apply(localStorage.getItem("font"));
  } catch {
    apply("pixel");
  }

  chrome.storage.local.get("settings").then(({ settings }) => remember(settings?.font || "pixel"));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) remember(changes.settings.newValue?.font || "pixel");
  });
})();
