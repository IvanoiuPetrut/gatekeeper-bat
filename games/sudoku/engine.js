// Sudoku generator/solver. Grids are flat arrays of 81 numbers, 0 = empty.
globalThis.SudokuEngine = (() => {
  // Target number of given clues per difficulty. Every puzzle has a unique solution.
  const CLUES = { easy: 40, medium: 32, hard: 27, expert: 23 };
  const ATTEMPTS = { easy: 1, medium: 1, hard: 3, expert: 6 };
  const ALL = 0b1111111110; // bits 1..9

  const rowOf = (i) => Math.floor(i / 9);
  const colOf = (i) => i % 9;
  const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function digitsOf(mask) {
    const out = [];
    for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d);
    return out;
  }

  // Counts solutions up to `limit`. With limit 1 the grid is left filled with the solution.
  function solve(grid, limit, random = false) {
    const rows = new Array(9).fill(0);
    const cols = new Array(9).fill(0);
    const boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      const v = grid[i];
      if (!v) continue;
      const bit = 1 << v;
      if (rows[rowOf(i)] & bit || cols[colOf(i)] & bit || boxes[boxOf(i)] & bit) return 0;
      rows[rowOf(i)] |= bit;
      cols[colOf(i)] |= bit;
      boxes[boxOf(i)] |= bit;
    }

    let count = 0;
    function search() {
      // Pick the empty cell with the fewest candidates.
      let best = -1;
      let bestMask = 0;
      let bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (grid[i]) continue;
        const mask = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
        const n = digitsOf(mask).length;
        if (n === 0) return false;
        if (n < bestCount) {
          best = i;
          bestMask = mask;
          bestCount = n;
          if (n === 1) break;
        }
      }
      if (best === -1) {
        count++;
        return count >= limit;
      }
      const r = rowOf(best), c = colOf(best), b = boxOf(best);
      const digits = digitsOf(bestMask);
      if (random) shuffle(digits);
      for (const d of digits) {
        const bit = 1 << d;
        grid[best] = d;
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (search()) return true;
        rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
      grid[best] = 0;
      return false;
    }

    search();
    return count;
  }

  function generateOnce(target) {
    const solution = new Array(81).fill(0);
    solve(solution, 1, true);
    const puzzle = solution.slice();
    let clues = 81;
    for (const i of shuffle([...Array(81).keys()])) {
      if (clues <= target) break;
      const v = puzzle[i];
      puzzle[i] = 0;
      if (solve(puzzle.slice(), 2) === 1) clues--;
      else puzzle[i] = v;
    }
    return { puzzle, solution, clues };
  }

  function generate(difficulty = "medium") {
    const target = CLUES[difficulty] ?? CLUES.medium;
    let best = null;
    for (let n = 0; n < (ATTEMPTS[difficulty] ?? 1); n++) {
      const result = generateOnce(target);
      if (!best || result.clues < best.clues) best = result;
      if (best.clues <= target) break;
    }
    return { puzzle: best.puzzle, solution: best.solution };
  }

  // Indexes of filled cells that clash with another cell in their row, column or box.
  function conflicts(grid) {
    const bad = new Set();
    for (let i = 0; i < 81; i++) {
      if (!grid[i]) continue;
      for (let j = i + 1; j < 81; j++) {
        if (grid[j] !== grid[i]) continue;
        if (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j)) {
          bad.add(i);
          bad.add(j);
        }
      }
    }
    return bad;
  }

  function isSolved(grid) {
    return grid.every((v) => v >= 1 && v <= 9) && conflicts(grid).size === 0;
  }

  return { generate, solve, conflicts, isSolved, rowOf, colOf, boxOf };
})();
