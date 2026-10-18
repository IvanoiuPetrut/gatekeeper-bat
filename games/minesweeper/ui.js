// Minesweeper. Mines are placed after the first click, which always opens an area, and every
// board can be cleared by logic alone. Hitting a mine ends the round; Try again deals a new board.
PG_GAMES.minesweeper = {
  mount(root, { difficulty, saved, onProgress, onSolved }) {
    const E = MinesweeperEngine;
    const K = GameKit;
    const level = E.LEVELS[difficulty] ?? E.LEVELS.medium;
    const n = level.size * level.size;
    const s = {
      mines: null, // null until the first click
      nums: null,
      revealed: null,
      flagged: null,
      elapsed: 0,
      lost: -1, // index of the mine that went off
      solved: false,
      cursor: 0,
      flagMode: false,
    };
    let cells = [];
    let board, leftEl, timeEl, flagBtn, statusEl;
    let stopTimer = () => {};

    function start(state) {
      const valid = state?.revealed?.length === n && (!state.mines || state.mines.length === n);
      s.mines = valid ? state.mines : null;
      s.revealed = valid ? state.revealed : new Array(n).fill(false);
      s.flagged = valid ? state.flagged : new Array(n).fill(false);
      s.elapsed = valid ? state.elapsed || 0 : 0;
      s.lost = valid ? state.lost ?? -1 : -1;
      s.nums = s.mines && E.counts(s.mines, level.size);
      s.solved = false;
      s.cursor = Math.floor(level.size / 2) * level.size + Math.floor(level.size / 2);
      build();
      render();
      save();
      stopTimer();
      stopTimer = K.everySecond(() => {
        if (!s.mines || s.solved || s.lost >= 0) return;
        s.elapsed++;
        timeEl.textContent = K.formatTime(s.elapsed);
        if (s.elapsed % 5 === 0) save();
      });
    }

    function save() {
      const { mines, revealed, flagged, elapsed, lost } = s;
      onProgress?.({ mines, revealed, flagged, elapsed, lost });
    }

    function build() {
      root.innerHTML = `
        <div class="game minesweeper">
          <div class="game-bar">
            <span class="pill">${PG.capitalize(difficulty)}</span>
            <span class="game-stats muted">
              <span class="ms-left"></span>
              <span class="ms-time">0:00</span>
            </span>
          </div>
          <div class="game-frame ms-board" role="grid" aria-label="Minesweeper board" data-fit></div>
          <div class="game-tools" style="--tools: 2">
            <button data-act="flag" title="Tap to flag instead of dig (F)" aria-pressed="false">Flag mode</button>
            <button data-act="new" title="Start a different board">New</button>
          </div>
          <div class="game-status" aria-live="polite"></div>
          <div class="game-hint">
            Click to dig · right-click or <kbd>F</kbd> to flag · click a number to clear around it · arrows move
          </div>
        </div>`;
      board = root.querySelector(".ms-board");
      leftEl = root.querySelector(".ms-left");
      timeEl = root.querySelector(".ms-time");
      flagBtn = root.querySelector('[data-act="flag"]');
      statusEl = root.querySelector(".game-status");
      // Cells read this in their own context, where cqi is measured against the board.
      board.style.setProperty("--ms-font", `${(55 / level.size).toFixed(2)}cqi`);

      cells = K.buildCells(board, level.size, "ms-cell");
      cells.forEach((cell, i) => {
        cell.addEventListener("click", () => {
          board.classList.remove("keys");
          s.cursor = i;
          s.flagMode ? toggleFlag(i) : dig(i);
        });
        cell.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          board.classList.remove("keys");
          s.cursor = i;
          toggleFlag(i);
        });
      });

      flagBtn.addEventListener("click", () => {
        s.flagMode = !s.flagMode;
        render();
      });
      K.confirmButton(root.querySelector('[data-act="new"]'), () => start(null));
    }

    const over = () => s.solved || s.lost >= 0;

    function dig(i) {
      if (over() || s.flagged[i]) return;
      if (!s.mines) {
        s.mines = E.generate(difficulty, i).mines;
        s.nums = E.counts(s.mines, level.size);
      }
      if (s.revealed[i]) return chord(i);
      if (s.mines[i]) return explode(i);
      E.flood(i, s.nums, level.size, s.revealed);
      after();
    }

    // Clicking a number whose mines are all flagged digs every other covered neighbour.
    function chord(i) {
      const around = E.around(i, level.size);
      const flags = around.filter((j) => s.flagged[j]).length;
      if (s.nums[i] <= 0 || flags !== s.nums[i]) return;
      for (const j of around) {
        if (s.revealed[j] || s.flagged[j]) continue;
        if (s.mines[j]) return explode(j);
        E.flood(j, s.nums, level.size, s.revealed);
      }
      after();
    }

    function toggleFlag(i) {
      if (over() || s.revealed[i]) return;
      s.flagged[i] = !s.flagged[i];
      render();
      save();
    }

    function explode(i) {
      s.lost = i;
      stopTimer();
      render();
      save();
    }

    function after() {
      render();
      save();
      if (s.revealed.every((r, i) => r || s.mines[i])) finish();
    }

    function finish() {
      s.solved = true;
      stopTimer();
      s.mines.forEach((m, i) => m && (s.flagged[i] = true));
      board.classList.remove("keys");
      render();
      board.classList.add("solved");
      setTimeout(() => onSolved?.({ elapsed: s.elapsed }), K.reducedMotion ? 0 : 900);
    }

    function render() {
      const lost = s.lost >= 0;
      cells.forEach((cell, i) => {
        const open = s.revealed[i];
        const num = open && s.nums ? s.nums[i] : 0;
        const showMine = lost && s.mines[i] && !s.flagged[i];
        const misflag = lost && s.flagged[i] && !s.mines[i];
        cell.classList.toggle("open", open);
        cell.classList.toggle("flag", s.flagged[i] && !misflag);
        cell.classList.toggle("misflag", misflag);
        cell.classList.toggle("mine", showMine);
        cell.classList.toggle("boom", i === s.lost);
        cell.classList.toggle("cursor", i === s.cursor);
        for (let k = 1; k <= 3; k++) cell.classList.toggle(`n${k}`, Math.min(num, 3) === k);
        cell.textContent = num > 0 ? num : "";
        cell.setAttribute(
          "aria-label",
          s.flagged[i] ? "Flagged" : open ? (num ? `${num} mine${num === 1 ? "" : "s"} around` : "Empty") : "Covered"
        );
      });
      const flags = s.flagged.filter(Boolean).length;
      leftEl.textContent = `${level.mines - flags} mine${level.mines - flags === 1 ? "" : "s"}`;
      timeEl.textContent = K.formatTime(s.elapsed);
      flagBtn.setAttribute("aria-pressed", String(s.flagMode));
      flagBtn.disabled = over();

      if (lost) {
        // Yarndings 12 draws "v" as a sad face.
        statusEl.innerHTML = `<span class="orn" aria-hidden="true">v</span> Boom. That was a mine. <button class="primary">Try again</button>`;
        statusEl.querySelector("button").addEventListener("click", () => start(null));
      } else if (s.solved) {
        statusEl.textContent = "Field cleared.";
      } else {
        statusEl.textContent = s.mines ? "" : "Dig anywhere to start. The first square is always safe.";
      }
    }

    function onKey(e) {
      if (K.ignoreKey(e) || e.ctrlKey || e.metaKey) return;
      const next = K.arrowMove(e.key, s.cursor, level.size);
      if (next >= 0) {
        e.preventDefault();
        board.classList.add("keys");
        s.cursor = next;
        render();
      } else if ((e.key === " " || e.key === "Enter") && !e.target.closest?.("button")) {
        e.preventDefault();
        board.classList.add("keys");
        dig(s.cursor);
      } else if (e.key.toLowerCase() === "f") {
        board.classList.add("keys");
        toggleFlag(s.cursor);
      }
    }

    document.addEventListener("keydown", onKey);
    start(saved);

    return {
      destroy() {
        stopTimer();
        document.removeEventListener("keydown", onKey);
        root.innerHTML = "";
      },
    };
  },
};
