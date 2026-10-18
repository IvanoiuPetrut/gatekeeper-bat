// Nonogram logic. A solution is a flat array of booleans (true = filled), size × size.
// Every puzzle handed out can be solved line by line, so it has one answer and needs no guessing.
globalThis.NonogramEngine = (() => {
  const SIZES = { easy: 5, medium: 8, hard: 10, expert: 15 };
  // How often a puzzle is one of the drawn pictures instead of a generated critter.
  const PICTURE_CHANCE = 0.6;
  const UNKNOWN = -1, EMPTY = 0, FILLED = 1;

  // [1,1,0,1,1,1] -> [2, 3]. An empty line has no runs.
  function clueOf(line) {
    const runs = [];
    let run = 0;
    for (const v of line) {
      if (v) run++;
      else if (run) runs.push(run), (run = 0);
    }
    if (run) runs.push(run);
    return runs;
  }

  function clues(solution, size) {
    const rows = [], cols = [];
    for (let r = 0; r < size; r++) rows.push(clueOf(solution.slice(r * size, r * size + size)));
    for (let c = 0; c < size; c++) cols.push(clueOf(solution.filter((_, i) => i % size === c)));
    return { rows, cols };
  }

  // Given a clue and a partly known line, returns the cells every valid placement agrees on
  // (FILLED / EMPTY, else UNKNOWN), or null if no placement fits.
  function solveLine(clue, line) {
    const n = line.length, m = clue.length;
    // fits[i][k]: blocks k.. can be placed in cells i.. consistently.
    const fits = Array.from({ length: n + 2 }, () => new Array(m + 1).fill(false));
    for (let k = 0; k <= m; k++) fits[n + 1][k] = fits[n][k] = k === m;
    for (let i = n - 1; i >= 0; i--) {
      for (let k = m; k >= 0; k--) {
        let ok = line[i] !== FILLED && fits[i + 1][k];
        if (!ok && k < m && blockFits(line, i, clue[k])) ok = fits[i + clue[k] + 1][k + 1];
        fits[i][k] = ok;
      }
    }
    if (!fits[0][0]) return null;

    const canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
    const seen = Array.from({ length: n + 2 }, () => new Array(m + 1).fill(false));
    const stack = [[0, 0]];
    while (stack.length) {
      const [i, k] = stack.pop();
      if (i >= n || seen[i][k]) continue;
      seen[i][k] = true;
      if (line[i] !== FILLED && fits[i + 1][k]) {
        canEmpty[i] = true;
        stack.push([i + 1, k]);
      }
      if (k < m && blockFits(line, i, clue[k]) && fits[i + clue[k] + 1][k + 1]) {
        for (let j = i; j < i + clue[k]; j++) canFill[j] = true;
        if (i + clue[k] < n) canEmpty[i + clue[k]] = true;
        stack.push([i + clue[k] + 1, k + 1]);
      }
    }
    return line.map((_, i) => (canFill[i] && canEmpty[i] ? UNKNOWN : canFill[i] ? FILLED : EMPTY));
  }

  // A block of `len` can start at i: no known-empty cell under it, and it isn't followed
  // by a filled cell (which would make it longer).
  function blockFits(line, i, len) {
    if (i + len > line.length) return false;
    for (let j = i; j < i + len; j++) if (line[j] === EMPTY) return false;
    return i + len === line.length || line[i + len] !== FILLED;
  }

  // Solves by repeatedly applying solveLine to rows and columns. True if that fills in every cell.
  function lineSolvable(rowClues, colClues, size) {
    const grid = new Array(size * size).fill(UNKNOWN);
    let changed = true;
    while (changed) {
      changed = false;
      for (let axis = 0; axis < 2; axis++) {
        for (let a = 0; a < size; a++) {
          const idx = [...Array(size).keys()].map((b) => (axis ? b * size + a : a * size + b));
          const result = solveLine(axis ? colClues[a] : rowClues[a], idx.map((i) => grid[i]));
          if (!result) return false;
          idx.forEach((i, b) => {
            if (grid[i] === UNKNOWN && result[b] !== UNKNOWN) {
              grid[i] = result[b];
              changed = true;
            }
          });
        }
      }
    }
    return grid.every((v) => v !== UNKNOWN);
  }

  // A random sprite, mirrored left-to-right like a space invader.
  function critter(size) {
    const half = Math.ceil(size / 2);
    const art = [];
    for (let r = 0; r < size; r++) {
      const left = Array.from({ length: half }, () => Math.random() < 0.55);
      const row = [...left, ...left.slice(0, size - half).reverse()];
      art.push(row);
    }
    // Eyes and accents in ember so the reveal has some colour.
    return art.flat().map((on, i) => (on ? (Math.floor(i / size) < size / 2 ? "p" : "e") : "."));
  }

  function fromPicture(pic) {
    const flip = Math.random() < 0.5;
    const rows = pic.art.trim().split("\n").map((row) => row.trim());
    return rows.flatMap((row) => (flip ? [...row].reverse() : [...row]));
  }

  // Returns { size, colors, title }: colors is a flat array of "." (empty) or a palette
  // letter, shown when the puzzle is solved. The filled cells are the solution.
  function generate(difficulty = "medium") {
    const size = SIZES[difficulty] ?? SIZES.medium;
    const pictures = (globalThis.NonogramPictures || []).filter((p) => p.size === size);
    if (pictures.length && Math.random() < PICTURE_CHANCE) {
      const pic = pictures[Math.floor(Math.random() * pictures.length)];
      return { size, colors: fromPicture(pic), title: pic.title };
    }
    for (;;) {
      const colors = critter(size);
      const solution = colors.map((c) => c !== ".");
      const filled = solution.filter(Boolean).length;
      if (filled < size * size * 0.35) continue;
      const { rows, cols } = clues(solution, size);
      if (lineSolvable(rows, cols, size)) return { size, colors, title: "A critter" };
    }
  }

  return { generate, clues, clueOf, solveLine, lineSolvable, SIZES };
})();
