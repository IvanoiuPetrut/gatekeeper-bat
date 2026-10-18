// Lights Out logic. Boards are flat arrays of booleans (true = lit), size × size.
globalThis.LightsOutEngine = (() => {
  // Board size and how many random presses scramble it, per difficulty.
  const LEVELS = {
    easy: { size: 4, presses: 4 },
    medium: { size: 5, presses: 7 },
    hard: { size: 6, presses: 11 },
    expert: { size: 7, presses: 16 },
  };

  // The pressed cell and its four neighbours.
  function neighbours(i, size) {
    const r = Math.floor(i / size), c = i % size;
    const out = [i];
    if (r > 0) out.push(i - size);
    if (r < size - 1) out.push(i + size);
    if (c > 0) out.push(i - 1);
    if (c < size - 1) out.push(i + 1);
    return out;
  }

  function press(lights, i, size) {
    for (const j of neighbours(i, size)) lights[j] = !lights[j];
  }

  // Starts from all-off and presses distinct random cells, so every board is solvable.
  // Some press sets cancel out on 5×5, so retry until enough lights are on.
  function generate(difficulty = "medium") {
    const { size, presses } = LEVELS[difficulty] ?? LEVELS.medium;
    const n = size * size;
    for (;;) {
      const lights = new Array(n).fill(false);
      const cells = [...Array(n).keys()];
      for (let k = 0; k < presses; k++) {
        const pick = k + Math.floor(Math.random() * (n - k));
        [cells[k], cells[pick]] = [cells[pick], cells[k]];
        press(lights, cells[k], size);
      }
      if (lights.filter(Boolean).length >= size) return { size, lights };
    }
  }

  const isSolved = (lights) => lights.every((on) => !on);

  return { generate, press, neighbours, isSolved, LEVELS };
})();
