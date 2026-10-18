// Minesweeper logic. Boards are flat arrays, size × size. `mines` holds booleans.
globalThis.MinesweeperEngine = (() => {
  const LEVELS = {
    easy: { size: 9, mines: 10 },
    medium: { size: 12, mines: 22 },
    hard: { size: 16, mines: 40 },
    expert: { size: 16, mines: 50 },
  };
  const MAX_ATTEMPTS = 400;

  function around(i, size) {
    const r = Math.floor(i / size), c = i % size;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if ((dr || dc) && rr >= 0 && rr < size && cc >= 0 && cc < size) out.push(rr * size + cc);
      }
    }
    return out;
  }

  function counts(mines, size) {
    return mines.map((m, i) => (m ? -1 : around(i, size).filter((j) => mines[j]).length));
  }

  // Cells uncovered by revealing `start`: zeros flood outwards to their neighbours.
  function flood(start, nums, size, revealed) {
    const opened = [];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (revealed[i] || nums[i] < 0) continue;
      revealed[i] = true;
      opened.push(i);
      if (nums[i] === 0) for (const j of around(i, size)) if (!revealed[j]) stack.push(j);
    }
    return opened;
  }

  // Plays the board from the first click using only sure deductions. Returns true if that
  // clears every safe cell, i.e. the board never forces a guess.
  function solvable(mines, size, first) {
    const nums = counts(mines, size);
    const n = size * size;
    const revealed = new Array(n).fill(false);
    const flagged = new Array(n).fill(false);
    const total = mines.filter(Boolean).length;
    let left = n - total - flood(first, nums, size, revealed).length;

    // For a revealed number: its covered, unflagged neighbours and the mines still among them.
    const constraint = (i) => {
      const cells = [];
      let need = nums[i];
      for (const j of around(i, size)) {
        if (flagged[j]) need--;
        else if (!revealed[j]) cells.push(j);
      }
      return { cells, need };
    };
    const open = (j) => (left -= flood(j, nums, size, revealed).length);

    let progress = true;
    while (left > 0 && progress) {
      progress = false;
      const frontier = [];
      for (let i = 0; i < n; i++) {
        if (!revealed[i] || nums[i] === 0) continue;
        const c = constraint(i);
        if (c.cells.length) frontier.push(c);
      }
      for (const { cells, need } of frontier) {
        if (need === 0) cells.forEach((j) => !revealed[j] && (open(j), (progress = true)));
        else if (need === cells.length) cells.forEach((j) => !flagged[j] && ((flagged[j] = true), (progress = true)));
      }
      if (progress) continue;

      // Subset rule: if A's cells are inside B's, the cells only in B hold B.need - A.need mines.
      for (const a of frontier) {
        for (const b of frontier) {
          if (a === b || a.cells.length >= b.cells.length) continue;
          if (!a.cells.every((j) => b.cells.includes(j))) continue;
          const rest = b.cells.filter((j) => !a.cells.includes(j));
          const mineCount = b.need - a.need;
          if (mineCount === 0) rest.forEach((j) => !revealed[j] && (open(j), (progress = true)));
          else if (mineCount === rest.length) rest.forEach((j) => !flagged[j] && ((flagged[j] = true), (progress = true)));
        }
      }
      if (progress) continue;

      // Every remaining mine is flagged: whatever is still covered is safe.
      if (flagged.filter(Boolean).length === total) {
        for (let j = 0; j < n; j++) if (!revealed[j] && !flagged[j]) open(j);
        progress = true;
      }
    }
    return left === 0;
  }

  // Places mines after the first click so it always opens an area, and retries until the
  // board can be cleared without guessing.
  function generate(difficulty, first) {
    const { size, mines: total } = LEVELS[difficulty] ?? LEVELS.medium;
    const n = size * size;
    const keepClear = new Set([first, ...around(first, size)]);
    const candidates = [...Array(n).keys()].filter((i) => !keepClear.has(i));
    let mines;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      for (let k = 0; k < total; k++) {
        const pick = k + Math.floor(Math.random() * (candidates.length - k));
        [candidates[k], candidates[pick]] = [candidates[pick], candidates[k]];
      }
      mines = new Array(n).fill(false);
      for (let k = 0; k < total; k++) mines[candidates[k]] = true;
      if (solvable(mines, size, first)) return { size, mines, noGuess: true };
    }
    return { size, mines, noGuess: false };
  }

  return { generate, counts, around, flood, solvable, LEVELS };
})();
