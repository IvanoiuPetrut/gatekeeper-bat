# It's Time to Stop

A browser extension that guards distracting websites behind a puzzle. Add a site, choose a game and difficulty, and you'll have to solve a puzzle before the site opens. Once you solve it, the site stays unlocked for a set time (30 minutes by default, or a per-site override). After that you have to solve another one.

Games: **Sudoku** (easy / medium / hard / expert). **Chess** is listed as "coming soon".

## Install (development)

**Chrome / Edge / Brave**
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

**Firefox** (121+)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

## How it works

- `background.js` watches top-level navigations (`webNavigation.onBeforeNavigate` plus `tabs.onUpdated` for single-page apps). If a URL matches a guarded domain (subdomains included) that isn't unlocked, it redirects the tab to `gate/gate.html?site=…&target=…`.
- The gate page mounts the site's game. When the puzzle is solved it sends `{type: "unlock"}`. The background stores `unlocks[siteId] = expiry` and schedules an alarm.
- When the alarm fires, a sweep runs (also once a minute as a fallback). It sends every open tab of an expired site back to the gate. While a site is unlocked, the toolbar badge shows the minutes left.
- In-progress puzzles are saved per site, so reloading the gate doesn't throw away your progress.

### Storage (`chrome.storage.local`)

| key        | shape |
|------------|-------|
| `sites`    | `[{ id, domain, game, difficulty, minutes \| null }]` |
| `settings` | `{ defaultMinutes }` |
| `unlocks`  | `{ [siteId]: expiresAtMs }` |
| `progress` | `{ [siteId]: { game, difficulty, state } }` |

## Art

The icons, the bat mascot sprite (`lib/bat-hero.png`) and the dithered sky (`lib/dither-sky.png`) are drawn in code using the [PUMKYN4](https://lospec.com/palette-list/pumkyn4) palette. To change them, edit the ASCII sprites in `tools/draw-sprites.py` and run `python3 tools/draw-sprites.py` (requires Pillow).

## Adding a game (e.g. chess)

1. Create `games/<name>/` with a script that registers:
   ```js
   PG_GAMES.<name> = {
     mount(root, { difficulty, saved, onProgress, onSolved }) {
       // render into root, call onSolved() when won
       return { destroy() {} };
     },
   };
   ```
2. Include its script/CSS in `gate/gate.html`.
3. Set `available: true` for it in `PG.GAMES` in `lib/common.js`.

## License

Free to use, copy, modify and share for any purpose. You just can't sell it or charge for it, and that includes modified versions. See [LICENSE](LICENSE) for the full terms. Bundled fonts keep their own SIL Open Font License.
