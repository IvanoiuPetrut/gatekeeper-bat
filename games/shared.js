// Helpers shared by the grid games. Every game registers itself on PG_GAMES with:
//   mount(root, { difficulty, saved, onProgress(state), onSolved() }) -> { destroy() }
globalThis.PG_GAMES = globalThis.PG_GAMES || {};

globalThis.GameKit = {
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    return `${m}:${String(sec % 60).padStart(2, "0")}`;
  },

  // Calls tick() once a second while the tab is visible. Returns a function that stops it.
  everySecond(tick) {
    const id = setInterval(() => {
      if (!document.hidden) tick();
    }, 1000);
    return () => clearInterval(id);
  },

  // Two-step instead of a dialog: the first press arms the button, a second press within 3s confirms.
  confirmButton(btn, action) {
    const label = btn.textContent;
    let timer = null;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("confirming")) {
        clearTimeout(timer);
        return action();
      }
      btn.classList.add("confirming");
      btn.textContent = "Sure?";
      timer = setTimeout(() => {
        btn.classList.remove("confirming");
        btn.textContent = label;
      }, 3000);
    });
  },

  // Index of the cell reached by an arrow key from `i` on a size × size board (wrapping), or -1.
  arrowMove(key, i, size) {
    let r = Math.floor(i / size), c = i % size;
    if (key === "ArrowUp") r = (r + size - 1) % size;
    else if (key === "ArrowDown") r = (r + 1) % size;
    else if (key === "ArrowLeft") c = (c + size - 1) % size;
    else if (key === "ArrowRight") c = (c + 1) % size;
    else return -1;
    return r * size + c;
  },

  // Builds size × size cells into `board` with grid-line and solve-wave classes set.
  buildCells(board, size, className) {
    board.style.setProperty("--n", size);
    const cells = [];
    for (let i = 0; i < size * size; i++) {
      const r = Math.floor(i / size), c = i % size;
      const cell = document.createElement("div");
      cell.className = `game-cell ${className}`;
      cell.setAttribute("role", "gridcell");
      if (c === size - 1) cell.classList.add("last-col");
      if (r === size - 1) cell.classList.add("last-row");
      cell.style.setProperty("--d", `${Math.round(((r + c) * 450) / size)}ms`);
      board.appendChild(cell);
      cells.push(cell);
    }
    return cells;
  },

  // Ignore keys typed into form fields and keys with modifiers (except Ctrl/Cmd+Z, handled by games).
  ignoreKey(e) {
    return e.target.closest?.("input, select, textarea") || e.altKey;
  },
};
