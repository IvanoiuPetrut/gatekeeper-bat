// Lights Out: clicking a light flips it and its four neighbours. Turn them all off.
PG_GAMES.lightsout = {
  mount(root, { difficulty, saved, onProgress, onSolved }) {
    const E = LightsOutEngine;
    const K = GameKit;
    const s = {
      size: 0,
      start: null, // the scrambled board, for Restart
      lights: null,
      moves: 0,
      history: [], // pressed cells; pressing again undoes, since a press is its own inverse
      elapsed: 0,
      cursor: 0,
      solved: false,
    };
    let cells = [];
    let board, movesEl, timeEl, undoBtn, statusEl;
    let stopTimer = () => {};

    function start(state) {
      const expected = E.LEVELS[difficulty]?.size;
      if (state?.lights?.length === state?.size ** 2 && state.size === expected) {
        Object.assign(s, {
          size: state.size,
          start: state.start,
          lights: state.lights,
          moves: state.moves || 0,
          history: state.history || [],
          elapsed: state.elapsed || 0,
        });
      } else {
        const { size, lights } = E.generate(difficulty);
        Object.assign(s, { size, start: lights.slice(), lights, moves: 0, history: [], elapsed: 0 });
      }
      s.solved = false;
      s.cursor = Math.floor(s.size / 2) * s.size + Math.floor(s.size / 2);
      build();
      render();
      save();
      stopTimer();
      stopTimer = K.everySecond(() => {
        if (s.solved) return;
        s.elapsed++;
        timeEl.textContent = K.formatTime(s.elapsed);
        if (s.elapsed % 5 === 0) save();
      });
    }

    function save() {
      const { size, start, lights, moves, history, elapsed } = s;
      onProgress?.({ size, start, lights, moves, history, elapsed });
    }

    function build() {
      root.innerHTML = `
        <div class="game lightsout">
          <div class="game-bar">
            <span class="pill">${PG.capitalize(difficulty)}</span>
            <span class="game-stats muted">
              <span class="lo-moves"></span>
              <span class="lo-time">0:00</span>
            </span>
          </div>
          <div class="game-frame lo-board" role="grid" aria-label="Lights Out board" data-fit></div>
          <div class="game-tools" style="--tools: 3">
            <button data-act="undo" title="Undo (Ctrl+Z)">Undo</button>
            <button data-act="restart" title="Back to the starting board">Restart</button>
            <button data-act="new" title="Start a different board">New</button>
          </div>
          <div class="game-status" aria-live="polite"></div>
          <div class="game-hint">
            Click a light to flip it and its neighbours · arrows move · <kbd>Space</kbd> press
          </div>
        </div>`;
      board = root.querySelector(".lo-board");
      movesEl = root.querySelector(".lo-moves");
      timeEl = root.querySelector(".lo-time");
      undoBtn = root.querySelector('[data-act="undo"]');
      statusEl = root.querySelector(".game-status");

      cells = K.buildCells(board, s.size, "lo-cell");
      cells.forEach((cell, i) =>
        cell.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          board.classList.remove("keys");
          s.cursor = i;
          press(i);
        })
      );

      undoBtn.addEventListener("click", undo);
      K.confirmButton(root.querySelector('[data-act="restart"]'), restart);
      K.confirmButton(root.querySelector('[data-act="new"]'), () => start(null));
    }

    function press(i, record = true) {
      if (s.solved) return;
      E.press(s.lights, i, s.size);
      if (record) {
        s.history.push(i);
        s.moves++;
      }
      render(E.neighbours(i, s.size));
      save();
      if (E.isSolved(s.lights)) finish();
    }

    function undo() {
      if (s.solved || !s.history.length) return;
      const i = s.history.pop();
      s.moves--;
      s.cursor = i;
      press(i, false);
    }

    function restart() {
      if (s.solved) return;
      s.lights = s.start.slice();
      s.history = [];
      s.moves = 0;
      render();
      save();
    }

    function finish() {
      s.solved = true;
      stopTimer();
      statusEl.textContent = `All dark in ${s.moves} move${s.moves === 1 ? "" : "s"}.`;
      board.classList.remove("keys");
      board.classList.add("solved");
      setTimeout(() => onSolved?.({ elapsed: s.elapsed }), K.reducedMotion ? 0 : 900);
    }

    function render(flipped = []) {
      cells.forEach((cell, i) => {
        const lit = s.lights[i];
        cell.classList.toggle("lit", lit);
        cell.classList.toggle("cursor", i === s.cursor);
        cell.setAttribute("aria-label", `Row ${Math.floor(i / s.size) + 1}, column ${(i % s.size) + 1}, ${lit ? "on" : "off"}`);
        if (flipped.includes(i) && !K.reducedMotion) {
          cell.classList.remove("flip");
          void cell.offsetWidth; // restart the animation when the same cell flips twice quickly
          cell.classList.add("flip");
        }
      });
      const on = s.lights.filter(Boolean).length;
      movesEl.textContent = `${s.moves} move${s.moves === 1 ? "" : "s"}`;
      timeEl.textContent = K.formatTime(s.elapsed);
      undoBtn.disabled = s.solved || !s.history.length;
      if (!s.solved) statusEl.textContent = `${on} light${on === 1 ? "" : "s"} on.`;
    }

    function onKey(e) {
      if (s.solved || K.ignoreKey(e)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return undo();
      }
      if (e.ctrlKey || e.metaKey) return;
      const next = K.arrowMove(e.key, s.cursor, s.size);
      if (next >= 0) {
        e.preventDefault();
        board.classList.add("keys");
        s.cursor = next;
        render();
      } else if ((e.key === " " || e.key === "Enter") && !e.target.closest?.("button")) {
        e.preventDefault();
        board.classList.add("keys");
        press(s.cursor);
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
