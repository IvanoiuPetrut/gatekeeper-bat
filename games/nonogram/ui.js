// Nonogram (Picross). Fill the grid so every row and column matches its number clues;
// solving it reveals a pixel picture. Drag to paint a line; right-click or Cross mode marks
// squares you know are empty.
PG_GAMES.nonogram = {
  mount(root, { difficulty, saved, onProgress, onSolved }) {
    const E = NonogramEngine;
    const K = GameKit;
    const MAX_CHECKS = 3;
    const EMPTY = 0, FILLED = 1, CROSSED = 2;
    const s = {
      size: 0,
      colors: null, // the picture: "." or a palette letter per cell
      title: "",
      solution: null,
      clues: null,
      cells: null,
      history: [], // strokes: [{ i, prev }]
      elapsed: 0,
      checksLeft: MAX_CHECKS,
      wrong: new Set(),
      cursor: 0,
      crossMode: false,
      solved: false,
    };
    let els = [];
    let rowClueEls = [], colClueEls = [];
    let grid, timeEl, crossBtn, checkBtn, undoBtn, statusEl;
    let stroke = null;
    let stopTimer = () => {};

    function start(state) {
      const size = E.SIZES[difficulty] ?? E.SIZES.medium;
      if (state?.size === size && state.colors?.length === size * size && state.cells?.length === size * size) {
        Object.assign(s, {
          size,
          colors: state.colors,
          title: state.title || "",
          cells: state.cells,
          elapsed: state.elapsed || 0,
          checksLeft: state.checksLeft ?? MAX_CHECKS,
        });
      } else {
        const puzzle = E.generate(difficulty);
        Object.assign(s, {
          size: puzzle.size,
          colors: puzzle.colors,
          title: puzzle.title,
          cells: new Array(puzzle.size ** 2).fill(EMPTY),
          elapsed: 0,
          checksLeft: MAX_CHECKS,
        });
      }
      s.solution = s.colors.map((c) => c !== ".");
      s.clues = E.clues(s.solution, s.size);
      s.history = [];
      s.wrong = new Set();
      s.solved = false;
      s.cursor = 0;
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
      const { size, colors, title, cells, elapsed, checksLeft } = s;
      onProgress?.({ size, colors, title, cells, elapsed, checksLeft });
    }

    // Clue area depth: room for the longest clue on either axis (at least a third of the grid).
    function clueDepth() {
      const longest = Math.max(...[...s.clues.rows, ...s.clues.cols].map((c) => Math.max(c.length, 1)));
      return Math.max(longest, Math.ceil(s.size / 3));
    }

    function build() {
      const size = s.size;
      root.innerHTML = `
        <div class="game nonogram">
          <div class="game-bar">
            <span class="pill">${PG.capitalize(difficulty)} · ${size}×${size}</span>
            <span class="game-stats muted"><span class="ng-time">0:00</span></span>
          </div>
          <div class="ng-puzzle" data-fit style="--n: ${size}; --depth: ${clueDepth()}">
            <div class="ng-corner" aria-hidden="true"></div>
            <div class="ng-cols" aria-label="Column clues"></div>
            <div class="ng-rows" aria-label="Row clues"></div>
            <div class="game-frame ng-grid" role="grid" aria-label="Nonogram grid"></div>
          </div>
          <div class="game-tools" style="--tools: 4">
            <button data-act="undo" title="Undo (Ctrl+Z)">Undo</button>
            <button data-act="cross" title="Mark empty squares instead of filling (X)" aria-pressed="false">Cross</button>
            <button data-act="check" title="Highlight wrong squares">Check <span class="badge"></span></button>
            <button data-act="new" title="Start a different puzzle">New</button>
          </div>
          <div class="game-status" aria-live="polite"></div>
          <div class="game-hint">
            Click or drag to fill · right-click to cross · arrows move · <kbd>Space</kbd> fill · <kbd>X</kbd> cross
          </div>
        </div>`;
      // fr tracks can't come from calc(), so the clue/grid split is set here.
      const puzzle = root.querySelector(".ng-puzzle");
      const depth = clueDepth();
      puzzle.style.gridTemplateColumns = `minmax(0, ${depth}fr) minmax(0, ${size}fr)`;
      puzzle.style.gridTemplateRows = `minmax(0, ${depth}fr) minmax(0, ${size}fr)`;
      grid = root.querySelector(".ng-grid");
      timeEl = root.querySelector(".ng-time");
      crossBtn = root.querySelector('[data-act="cross"]');
      checkBtn = root.querySelector('[data-act="check"]');
      undoBtn = root.querySelector('[data-act="undo"]');
      statusEl = root.querySelector(".game-status");

      const clueLine = (clue, cls) => {
        const el = document.createElement("div");
        el.className = `ng-clue ${cls}`;
        for (const num of clue.length ? clue : [0]) {
          const span = document.createElement("span");
          span.textContent = num;
          el.appendChild(span);
        }
        return el;
      };
      colClueEls = s.clues.cols.map((c) => root.querySelector(".ng-cols").appendChild(clueLine(c, "col")));
      rowClueEls = s.clues.rows.map((c) => root.querySelector(".ng-rows").appendChild(clueLine(c, "row")));

      els = K.buildCells(grid, size, "ng-cell");
      els.forEach((cell, i) => {
        // Thicker guide lines every 5 squares, as on paper nonograms.
        if (size > 5 && i % size % 5 === 4 && i % size !== size - 1) cell.classList.add("guide-col");
        if (size > 5 && Math.floor(i / size) % 5 === 4 && Math.floor(i / size) !== size - 1) cell.classList.add("guide-row");
      });

      grid.addEventListener("pointerdown", strokeStart);
      grid.addEventListener("pointermove", strokeMove);
      grid.addEventListener("pointerup", strokeEnd);
      grid.addEventListener("pointercancel", strokeEnd);
      grid.addEventListener("contextmenu", (e) => e.preventDefault());

      undoBtn.addEventListener("click", undo);
      crossBtn.addEventListener("click", () => {
        s.crossMode = !s.crossMode;
        render();
      });
      checkBtn.addEventListener("click", check);
      K.confirmButton(root.querySelector('[data-act="new"]'), newPuzzle);
    }

    function newPuzzle() {
      root.innerHTML = `<div class="game-loading">Drawing a puzzle…</div>`;
      setTimeout(() => start(null), 20);
    }

    const cellAt = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ng-cell");
      return el ? els.indexOf(el) : -1;
    };

    // A stroke paints one value along a single row or column. Its value comes from the first
    // square: filling an empty square fills, filling a filled one clears, and so on.
    function strokeStart(e) {
      if (s.solved || (e.button !== 0 && e.button !== 2)) return;
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      grid.setPointerCapture(e.pointerId);
      grid.classList.remove("keys");
      const mark = e.button === 2 || s.crossMode ? CROSSED : FILLED;
      const from = s.cells[i];
      stroke = { origin: i, value: from === mark ? EMPTY : mark, from, changes: new Map() };
      s.cursor = i;
      paintTo(i);
    }

    function strokeMove(e) {
      if (!stroke) return;
      const i = cellAt(e);
      if (i >= 0) paintTo(i);
    }

    function strokeEnd() {
      if (!stroke) return;
      const changes = [...stroke.changes].map(([i, prev]) => ({ i, prev }));
      stroke = null;
      if (!changes.length) return;
      s.history.push(changes);
      render();
      save();
      checkSolved();
    }

    // Paints from the stroke's origin to the square under the pointer, locked to its row or
    // column (whichever the pointer has moved further along), so fast drags don't skip squares.
    function paintTo(i) {
      const size = s.size;
      const o = stroke.origin;
      const or = Math.floor(o / size), oc = o % size;
      const r = Math.floor(i / size), c = i % size;
      const line = [];
      if (Math.abs(c - oc) >= Math.abs(r - or)) {
        for (let k = Math.min(c, oc); k <= Math.max(c, oc); k++) line.push(or * size + k);
      } else {
        for (let k = Math.min(r, or); k <= Math.max(r, or); k++) line.push(k * size + oc);
      }
      // Restore squares the stroke painted that are now off its line (the pointer turned back).
      for (const [j, prev] of stroke.changes) {
        if (!line.includes(j)) {
          s.cells[j] = prev;
          stroke.changes.delete(j);
        }
      }
      for (const j of line) {
        if (stroke.changes.has(j)) continue;
        const cur = s.cells[j];
        // Clearing only clears the kind of mark the stroke started on; painting only paints blanks.
        const applies = stroke.value === EMPTY ? cur === stroke.from : cur === EMPTY || j === o;
        if (!applies || cur === stroke.value) continue;
        stroke.changes.set(j, cur);
        s.cells[j] = stroke.value;
        s.wrong.delete(j);
      }
      s.cursor = i;
      render();
    }

    function setCell(i, mark) {
      if (s.solved) return;
      const prev = s.cells[i];
      const value = prev === mark ? EMPTY : mark;
      s.cells[i] = value;
      s.wrong.delete(i);
      s.history.push([{ i, prev }]);
      render();
      save();
      checkSolved();
    }

    function undo() {
      const changes = s.history.pop();
      if (!changes || s.solved) return;
      for (const { i, prev } of changes) {
        s.cells[i] = prev;
        s.wrong.delete(i);
      }
      render();
      save();
    }

    function check() {
      if (s.solved || s.checksLeft <= 0) return;
      s.checksLeft--;
      s.wrong = new Set();
      s.cells.forEach((v, i) => {
        if ((v === FILLED && !s.solution[i]) || (v === CROSSED && s.solution[i])) s.wrong.add(i);
      });
      const left = `${s.checksLeft} check${s.checksLeft === 1 ? "" : "s"} left.`;
      // Yarndings 12 draws "v" as a sad face and "u" as a smiley.
      statusEl.innerHTML = s.wrong.size
        ? `<span class="orn" aria-hidden="true">v</span> ${s.wrong.size} wrong square${s.wrong.size === 1 ? "" : "s"}. ${left}`
        : `<span class="orn" aria-hidden="true">u</span> No mistakes so far. ${left}`;
      render();
      save();
    }

    function checkSolved() {
      if (!s.cells.every((v, i) => (v === FILLED) === s.solution[i])) return;
      s.solved = true;
      stopTimer();
      grid.classList.remove("keys");
      render();
      grid.classList.add("solved");
      statusEl.textContent = `${s.title}!`;
      // A little longer than the other games, so there's time to see the picture.
      setTimeout(() => onSolved?.({ elapsed: s.elapsed }), K.reducedMotion ? 0 : 1500);
    }

    function lineDone(clue, values) {
      const got = E.clueOf(values.map((v) => v === FILLED));
      return got.length === clue.length && got.every((v, k) => v === clue[k]);
    }

    function render() {
      const size = s.size;
      const cr = Math.floor(s.cursor / size), cc = s.cursor % size;
      els.forEach((cell, i) => {
        const v = s.cells[i];
        const r = Math.floor(i / size), c = i % size;
        cell.classList.toggle("filled", v === FILLED);
        cell.classList.toggle("crossed", v === CROSSED && !s.solved);
        cell.classList.toggle("wrong", s.wrong.has(i));
        cell.classList.toggle("cursor", i === s.cursor);
        cell.classList.toggle("peer", !s.solved && (r === cr || c === cc) && i !== s.cursor);
        cell.dataset.color = s.solved ? s.colors[i] : "";
        cell.setAttribute(
          "aria-label",
          `Row ${r + 1}, column ${c + 1}, ${v === FILLED ? "filled" : v === CROSSED ? "crossed" : "blank"}`
        );
      });
      for (let k = 0; k < size; k++) {
        const row = s.cells.slice(k * size, k * size + size);
        const col = s.cells.filter((_, i) => i % size === k);
        rowClueEls[k].classList.toggle("done", lineDone(s.clues.rows[k], row));
        colClueEls[k].classList.toggle("done", lineDone(s.clues.cols[k], col));
        rowClueEls[k].classList.toggle("active", !s.solved && k === cr);
        colClueEls[k].classList.toggle("active", !s.solved && k === cc);
      }
      crossBtn.setAttribute("aria-pressed", String(s.crossMode));
      checkBtn.querySelector(".badge").textContent = s.checksLeft;
      checkBtn.disabled = s.checksLeft <= 0 || s.solved;
      undoBtn.disabled = s.solved || !s.history.length;
      timeEl.textContent = K.formatTime(s.elapsed);
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
        grid.classList.add("keys");
        s.cursor = next;
        render();
      } else if ((e.key === " " || e.key === "Enter") && !e.target.closest?.("button")) {
        e.preventDefault();
        grid.classList.add("keys");
        setCell(s.cursor, s.crossMode ? CROSSED : FILLED);
      } else if (e.key.toLowerCase() === "x") {
        grid.classList.add("keys");
        setCell(s.cursor, CROSSED);
      }
    }

    document.addEventListener("keydown", onKey);
    root.innerHTML = `<div class="game-loading">Drawing a puzzle…</div>`;
    setTimeout(() => start(saved), 20);

    return {
      destroy() {
        stopTimer();
        document.removeEventListener("keydown", onKey);
        root.innerHTML = "";
      },
    };
  },
};
