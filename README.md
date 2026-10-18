# Gatekeeper Bat

A browser extension that guards distracting websites behind a puzzle. Add a site, choose a game and difficulty, and you'll have to solve a puzzle before the site opens. Once you solve it, the site stays unlocked for a set time (30 minutes by default, or a per-site override). After that you have to solve another one.

Games, each with easy / medium / hard / expert:

- **Sudoku**: every puzzle has a single solution.
- **Nonogram**: fill the grid to match the number clues, and a pixel picture appears. Puzzles are either hand-drawn pictures (`games/nonogram/pictures.js`) or random mirrored critters. Every one can be solved line by line, without guessing.
- **Minesweeper**: your first click always opens an area, and every board can be cleared by logic alone.
- **Lights Out**: clicking a light flips it and its neighbours. Turn them all off.

**Chess** is listed as "coming soon".

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

## Fonts

Fonts are bundled in `lib/fonts/` (no network requests): [Silkscreen](https://fonts.google.com/specimen/Silkscreen) for pixel mode, [Montserrat](https://fonts.google.com/specimen/Montserrat) for plain mode (Settings → Font), and [Yarndings 12](https://fonts.google.com/specimen/Yarndings+12) for decorative flowers. All are under the SIL Open Font License; the license texts are next to the font files.

## Nonogram pictures

Pictures are ASCII art in `games/nonogram/pictures.js` (`.` empty, `p` peach, `e` ember, `u` plum). After adding or editing one, run `node tools/check-nonograms.js`. It flags any picture that can't be solved without guessing.

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
   `games/shared.js` has helpers for timers, arrow-key movement, building a grid and confirm buttons, and `games/shared.css` has the board frame, tool buttons and status line. Give the board element `data-fit` so the gate sizes it to the window.
2. Include its script/CSS in `gate/gate.html`.
3. Set `available: true` for it in `PG.GAMES` in `lib/common.js`, with a `label` and a `goal` (the start of the gate's subtitle, e.g. "Clear this minefield").

## License

Free to use, copy, modify and share for any purpose. You just can't sell it or charge for it, and that includes modified versions. See [LICENSE](LICENSE) for the full terms. Bundled fonts keep their own SIL Open Font License.
