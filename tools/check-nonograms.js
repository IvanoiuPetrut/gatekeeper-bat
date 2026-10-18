// Checks every drawn nonogram picture is the right size and solvable line by line.
//   node tools/check-nonograms.js
const path = require("path");
const root = path.resolve(__dirname, "..");
require(path.join(root, "games/nonogram/engine.js"));
require(path.join(root, "games/nonogram/pictures.js"));

let failed = 0;
for (const pic of NonogramPictures) {
  const rows = pic.art.trim().split("\n").map((r) => r.trim());
  const sizeOk = rows.length === pic.size && rows.every((r) => r.length === pic.size);
  let ok = sizeOk;
  if (sizeOk) {
    const solution = rows.join("").split("").map((c) => c !== ".");
    const { rows: rc, cols: cc } = NonogramEngine.clues(solution, pic.size);
    ok = NonogramEngine.lineSolvable(rc, cc, pic.size);
  }
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${pic.size}×${pic.size} ${pic.title}${sizeOk ? "" : " (wrong size)"}`);
}
process.exit(failed ? 1 : 0);
