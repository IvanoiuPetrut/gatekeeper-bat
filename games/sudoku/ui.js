// Sudoku board UI. Every game registers itself on PG_GAMES with the same interface:
//   mount(root, { difficulty, saved, onProgress(state), onSolved() })
globalThis.PG_GAMES = globalThis.PG_GAMES || {};

PG_GAMES.sudoku = {
  mount(root, { difficulty, saved, onProgress, onSolved }) {
    const E = SudokuEngine;
    const MAX_CHECKS = 3;
    const s = {
      puzzle: null,
      solution: null,
      values: null,
      notes: null, // per cell: array of pencil-mark digits
      elapsed: 0,
      selected: -1,
      notesMode: false,
      history: [],
      solved: false,
      checksLeft: MAX_CHECKS,
      wrong: new Set(), // cells flagged by the last check, until they're changed
      popped: -1, // cell whose digit was just placed, animated on the next render
    };
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let confirmTimer = null;
    let timer = null;
    let cells = [];
    let padButtons = [];
    let timeEl, notesBtn, checkBtn, statusEl;

    function start(state) {
      if (state?.puzzle?.length === 81) {
        s.puzzle = state.puzzle;
        s.values = state.values;
        s.notes = state.notes;
        s.elapsed = state.elapsed || 0;
        s.checksLeft = state.checksLeft ?? MAX_CHECKS;
        s.solution = state.solution;
        if (s.solution?.length !== 81) {
          // Saved before solutions were stored; puzzles are unique so solving recovers it.
          s.solution = s.puzzle.slice();
          E.solve(s.solution, 1);
        }
      } else {
        const { puzzle, solution } = E.generate(difficulty);
        s.puzzle = puzzle;
        s.solution = solution;
        s.values = puzzle.slice();
        s.notes = Array.from({ length: 81 }, () => []);
        s.elapsed = 0;
        s.checksLeft = MAX_CHECKS;
      }
      s.wrong = new Set();
      s.history = [];
      s.solved = false;
      s.selected = s.puzzle.findIndex((v) => !v);
      build();
      render();
      save();
      clearInterval(timer);
      timer = setInterval(() => {
        if (document.hidden || s.solved) return;
        s.elapsed++;
        timeEl.textContent = formatTime(s.elapsed);
        if (s.elapsed % 5 === 0) save();
      }, 1000);
    }

    function formatTime(sec) {
      const m = Math.floor(sec / 60);
      return `${m}:${String(sec % 60).padStart(2, "0")}`;
    }

    function save() {
      onProgress?.({
        puzzle: s.puzzle,
        solution: s.solution,
        values: s.values,
        notes: s.notes,
        elapsed: s.elapsed,
        checksLeft: s.checksLeft,
      });
    }

    function build() {
      root.innerHTML = `
        <div class="sudoku">
          <div class="sudoku-bar">
            <span class="pill">${PG.capitalize(difficulty)}</span>
            <span class="sudoku-time muted">0:00</span>
          </div>
          <div class="sudoku-board" role="grid" aria-label="Sudoku board"></div>
          <div class="sudoku-pad"></div>
          <div class="sudoku-tools">
            <button data-act="undo" title="Undo (Ctrl+Z)">Undo</button>
            <button data-act="erase" title="Erase (Backspace)">Erase</button>
            <button data-act="notes" title="Pencil notes (N)" aria-pressed="false">Notes</button>
            <button data-act="check" title="Highlight wrong numbers">Check <span class="badge"></span></button>
            <button data-act="new" title="Start a different puzzle">New</button>
          </div>
          <div class="sudoku-status" aria-live="polite"></div>
          <div class="sudoku-hint">
            <kbd>1</kbd>–<kbd>9</kbd> fill · <kbd>Backspace</kbd> erase · arrows move · <kbd>N</kbd> notes
          </div>
        </div>`;
      const board = root.querySelector(".sudoku-board");
      const pad = root.querySelector(".sudoku-pad");
      timeEl = root.querySelector(".sudoku-time");
      notesBtn = root.querySelector('[data-act="notes"]');
      checkBtn = root.querySelector('[data-act="check"]');
      statusEl = root.querySelector(".sudoku-status");

      cells = [];
      for (let i = 0; i < 81; i++) {
        const cell = document.createElement("div");
        cell.className = "sudoku-cell";
        cell.setAttribute("role", "gridcell");
        cell.style.setProperty("--d", `${(E.rowOf(i) + E.colOf(i)) * 28}ms`);
        cell.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          select(i);
        });
        board.appendChild(cell);
        cells.push(cell);
      }

      padButtons = [];
      for (let d = 1; d <= 9; d++) {
        const b = document.createElement("button");
        b.textContent = d;
        b.addEventListener("click", () => input(d));
        pad.appendChild(b);
        padButtons.push(b);
      }

      root.querySelector('[data-act="undo"]').addEventListener("click", undo);
      root.querySelector('[data-act="erase"]').addEventListener("click", () => input(0));
      notesBtn.addEventListener("click", toggleNotes);
      checkBtn.addEventListener("click", check);
      // Two-step instead of a dialog: the first press arms it, a second press within 3s confirms.
      const newBtn = root.querySelector('[data-act="new"]');
      newBtn.addEventListener("click", () => {
        if (newBtn.classList.contains("confirming")) return newPuzzle();
        newBtn.classList.add("confirming");
        newBtn.textContent = "Sure?";
        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => {
          newBtn.classList.remove("confirming");
          newBtn.textContent = "New";
        }, 3000);
      });
    }

    function newPuzzle() {
      clearTimeout(confirmTimer);
      root.innerHTML = `<div class="sudoku-loading">Generating puzzle…</div>`;
      setTimeout(() => start(null), 20);
    }

    function select(i) {
      if (s.solved) return;
      s.selected = i;
      render();
    }

    function toggleNotes() {
      s.notesMode = !s.notesMode;
      render();
    }

    function input(d) {
      const i = s.selected;
      if (s.solved || i < 0 || s.puzzle[i]) return;
      const prev = { i, value: s.values[i], notes: s.notes[i].slice() };

      if (d === 0) {
        if (!s.values[i] && !s.notes[i].length) return;
        s.values[i] = 0;
        s.notes[i] = [];
      } else if (s.notesMode && !s.values[i]) {
        const n = s.notes[i];
        s.notes[i] = n.includes(d) ? n.filter((x) => x !== d) : [...n, d].sort();
      } else {
        s.values[i] = s.values[i] === d ? 0 : d;
        s.notes[i] = [];
        if (s.values[i]) {
          clearPeerNotes(i, d, prev);
          s.popped = i;
        }
      }

      s.history.push(prev);
      s.wrong.delete(i);
      render();
      save();
      checkSolved();
    }

    // Placing a digit removes it from pencil marks in the same row, column and box.
    function clearPeerNotes(i, d, prev) {
      prev.peerNotes = [];
      for (let j = 0; j < 81; j++) {
        if (j !== i && isPeer(i, j) && s.notes[j].includes(d)) {
          prev.peerNotes.push(j);
          s.notes[j] = s.notes[j].filter((x) => x !== d);
        }
      }
      prev.digit = d;
    }

    function undo() {
      const prev = s.history.pop();
      if (!prev || s.solved) return;
      s.values[prev.i] = prev.value;
      s.notes[prev.i] = prev.notes;
      for (const j of prev.peerNotes || []) s.notes[j] = [...s.notes[j], prev.digit].sort();
      s.wrong.delete(prev.i);
      s.selected = prev.i;
      render();
      save();
    }

    function check() {
      if (s.solved || s.checksLeft <= 0) return;
      s.checksLeft--;
      s.wrong = new Set();
      for (let i = 0; i < 81; i++) {
        if (!s.puzzle[i] && s.values[i] && s.values[i] !== s.solution[i]) s.wrong.add(i);
      }
      const left = `${s.checksLeft} check${s.checksLeft === 1 ? "" : "s"} left.`;
      statusEl.textContent = s.wrong.size
        ? `${s.wrong.size} wrong number${s.wrong.size === 1 ? "" : "s"} highlighted. ${left}`
        : `Everything so far is correct. ${left}`;
      render();
      save();
      for (const i of s.wrong) {
        cells[i].classList.add("shake");
        cells[i].addEventListener("animationend", () => cells[i].classList.remove("shake"), { once: true });
      }
    }

    function isPeer(i, j) {
      return E.rowOf(i) === E.rowOf(j) || E.colOf(i) === E.colOf(j) || E.boxOf(i) === E.boxOf(j);
    }

    function checkSolved() {
      if (!E.isSolved(s.values)) return;
      s.solved = true;
      clearInterval(timer);
      s.selected = -1;
      render();
      // Let the wave finish (last cell starts at 16 * 28ms) before handing off.
      root.querySelector(".sudoku-board").classList.add("solved");
      setTimeout(() => onSolved?.({ elapsed: s.elapsed }), reducedMotion ? 0 : 900);
    }

    function render() {
      const bad = E.conflicts(s.values);
      const sel = s.selected;
      const selValue = sel >= 0 ? s.values[sel] : 0;
      const counts = new Array(10).fill(0);
      for (const v of s.values) counts[v]++;

      cells.forEach((cell, i) => {
        const v = s.values[i];
        cell.className = "sudoku-cell";
        if (s.puzzle[i]) cell.classList.add("given");
        if (sel >= 0 && i !== sel && isPeer(i, sel)) cell.classList.add("peer");
        if (selValue && v === selValue && i !== sel) cell.classList.add("same");
        if (i === sel) cell.classList.add("selected");
        if (bad.has(i)) cell.classList.add("conflict");
        if (s.wrong.has(i)) cell.classList.add("wrong");
        if (i === s.popped && !reducedMotion) cell.classList.add("pop");

        if (v) {
          cell.innerHTML = `<span class="digit">${v}</span>`;
        } else if (s.notes[i].length) {
          cell.innerHTML =
            `<div class="sudoku-notes">` +
            [1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map((d) => `<span>${s.notes[i].includes(d) ? d : ""}</span>`)
              .join("") +
            `</div>`;
        } else {
          cell.textContent = "";
        }
      });

      padButtons.forEach((b, k) => b.classList.toggle("done", counts[k + 1] >= 9));
      s.popped = -1;
      notesBtn.setAttribute("aria-pressed", String(s.notesMode));
      checkBtn.querySelector(".badge").textContent = s.checksLeft;
      checkBtn.title = `Highlight wrong numbers (${s.checksLeft} left)`;
      checkBtn.disabled = s.checksLeft <= 0 || s.solved;
      timeEl.textContent = formatTime(s.elapsed);
    }

    function onKey(e) {
      if (s.solved || e.target.closest?.("input, select, textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
      if (e.key in moves) {
        e.preventDefault();
        const cur = s.selected < 0 ? 0 : s.selected;
        let r = E.rowOf(cur), c = E.colOf(cur);
        if (e.key === "ArrowUp") r = (r + 8) % 9;
        if (e.key === "ArrowDown") r = (r + 1) % 9;
        if (e.key === "ArrowLeft") c = (c + 8) % 9;
        if (e.key === "ArrowRight") c = (c + 1) % 9;
        select(r * 9 + c);
      } else if (/^[1-9]$/.test(e.key)) {
        input(Number(e.key));
      } else if (e.code?.startsWith("Digit") || e.code?.startsWith("Numpad")) {
        // Shift+digit on some layouts produces symbols; read the physical key instead.
        const d = Number(e.code.slice(-1));
        if (d >= 1 && d <= 9) input(d);
      } else if (["Backspace", "Delete", "0"].includes(e.key)) {
        e.preventDefault();
        input(0);
      } else if (e.key.toLowerCase() === "n") {
        toggleNotes();
      }
    }

    document.addEventListener("keydown", onKey);
    root.innerHTML = `<div class="sudoku-loading">Generating puzzle…</div>`;
    setTimeout(() => start(saved), 20);

    return {
      destroy() {
        clearInterval(timer);
        document.removeEventListener("keydown", onKey);
        root.innerHTML = "";
      },
    };
  },
};
