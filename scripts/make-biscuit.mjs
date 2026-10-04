// Biscuit and Marshmallow: makes the daily boards in public/biscuit-puzzles.js, and checks them.
//
//   node scripts/make-biscuit.mjs          add boards until there are 365 (existing boards never change)
//   node scripts/make-biscuit.mjs 500      add boards until there are 500
//   node scripts/make-biscuit.mjs --check  check every board in the file (npm run check runs this)
//
// Each weekday has its own board shape (SHAPES below): a small one on Monday up to a big one on
// Sunday. A shape is a list of rows, "#" for a square and "." for a hole. Words run along every row
// and column, broken by holes. In the solution the kitten (1) touches both the sheep (2) and the ball
// of yarn (3) (across, up and down, or diagonally); the three also break the rows and columns they're
// in. Every run of 3 or more letters is a word from scripts/biscuit-words.mjs, there's never a run of
// exactly 2, and every letter is part of at least one word.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { WORDS } from "./biscuit-words.mjs";

const OUT = fileURLToPath(new URL("../public/biscuit-puzzles.js", import.meta.url));
const START_DATE = "2026-09-30";
// Par is the swaps this script needs to solve a board, plus about 30% more, plus this many to
// spare, so par is in reach without a perfect run, and bigger boards get more room.
const PAR_LEEWAY = 3;
const parFor = (swaps) => swaps + Math.round(swaps * 0.3) + PAR_LEEWAY;

/* ---------- The weekly shapes ---------- */
// Indexed by day of the week, Sunday first (as Date.getUTCDay() counts).
const SHAPES = [
  // Sunday
  { name: "Big weekend", rows: ["#######", "#.#.#.#", "#######", "#.#.#.#", "#######", "#.#.#.#", "#######"] },
  // Monday
  { name: "Mini waffle", rows: ["#####", "#.#.#", "#####", "#.#.#", "#####"] },
  // Tuesday: a signpost, a tall pole crossed by three signs
  {
    name: "Signpost",
    rows: ["...#...", "...#...", ".#####.", "...#...", "#######", "...#...", ".#####.", "...#...", "...#..."],
  },
  // Wednesday
  { name: "Classic", rows: ["#####", "#.#.#", "#####", "#.#.#", "#####", "#.#.#", "#####"] },
  // Thursday: steps down to the right, then back down to the left
  {
    name: "Zig-zag",
    rows: ["###....", "#.#....", "#####..", "..#.#..", "..#####", "....#.#", "..#####", "..#.#..", "..###.."],
  },
  // Friday
  { name: "Wide meadow", rows: ["#######", "#.#.#.#", "#######", "#.#.#.#", "#######"] },
  // Saturday
  { name: "Barn", rows: ["..###..", "..#.#..", "#######", "#.#.#.#", "#######", "#...#.#", "#######"] },
];
const dayOfWeek = (n) => {
  const [y, m, d] = START_DATE.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).getUTCDay();
};

// Everything that depends on a shape, worked out once per shape.
function makeShape({ name, rows }) {
  const R = rows.length,
    C = rows[0].length;
  const exists = (r, c) => r >= 0 && r < R && c >= 0 && c < C && rows[r][c] === "#";
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (exists(r, c)) cells.push([r, c]);
  const lines = [
    ...Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => [r, c])),
    ...Array.from({ length: C }, (_, c) => Array.from({ length: R }, (_, r) => [r, c])),
  ];
  // The runs of letters along every row and column, given the [kitten, sheep, yarn] squares.
  function runsFor(animals) {
    const isAnimal = (r, c) => animals.some(([ar, ac]) => ar === r && ac === c);
    const runs = [];
    for (const line of lines) {
      let cur = [];
      for (const [r, c] of line) {
        if (!exists(r, c) || isAnimal(r, c)) {
          if (cur.length) runs.push(cur);
          cur = [];
        } else cur.push([r, c]);
      }
      if (cur.length) runs.push(cur);
    }
    return runs;
  }
  function placementOk(animals) {
    const runs = runsFor(animals);
    if (runs.some((run) => run.length === 2)) return false;
    const covered = new Set(
      runs
        .filter((run) => run.length >= 3)
        .flat()
        .map(([r, c]) => r * C + c),
    );
    return cells.every(([r, c]) => animals.some(([ar, ac]) => ar === r && ac === c) || covered.has(r * C + c));
  }
  // Every [kitten, sheep, yarn] where the kitten touches the other two.
  const placements = [];
  for (const k of cells) {
    const around = cells.filter((c) => touching(k, c));
    for (const sh of around)
      for (const y of around) if (sh !== y && placementOk([k, sh, y])) placements.push([k, sh, y]);
  }
  const letters = cells.length - 3;
  // About a third of the letters start green; par lands between about half and two thirds of the letters.
  const keep = [Math.round(letters * 0.3), Math.round(letters * 0.38)];
  const par = [Math.round(letters * 0.52), Math.round(letters * 0.66)];
  return { name, rows, R, C, exists, cells, runsFor, placementOk, placements, letters, keep, par };
}
// Two squares touch if they're side by side or corner to corner.
const touching = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
const SHAPE_FOR_DAY = SHAPES.map(makeShape);
const shapeFor = (n) => SHAPE_FOR_DAY[dayOfWeek(n)];

/* ---------- Seeded randomness, so a board comes out the same every run ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, rand) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/* ---------- Filling the board with words ---------- */
const used = new Map(); // word -> boards it's already in, so words get spread around
function fill(shape, animals, rand) {
  const { R, C, exists } = shape;
  const slots = shape.runsFor(animals).filter((run) => run.length >= 3);
  if (slots.some((slot) => !(WORDS[slot.length] || []).length)) return null;
  const grid = {};
  const key = (r, c) => r * C + c;
  const inGrid = new Set();
  let nodes = 0;
  const pattern = (slot) => slot.map(([r, c]) => grid[key(r, c)] || ".").join("");
  const candidates = (slot) => {
    const p = pattern(slot);
    return (WORDS[slot.length] || []).filter(
      (w) => !inGrid.has(w) && [...p].every((ch, i) => ch === "." || ch === w[i]),
    );
  };
  const open = new Set(slots.map((_, i) => i));
  function solve() {
    if (!open.size) return true;
    if (++nodes > 40000) return false;
    // Fill the slot with the fewest choices first.
    let best = null,
      bestList = null;
    for (const i of open) {
      const list = candidates(slots[i]);
      if (!best || list.length < bestList.length) {
        best = i;
        bestList = list;
      }
      if (!list.length) return false;
    }
    const list = shuffle(bestList, rand)
      .sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0))
      .slice(0, 12);
    const slot = slots[best];
    open.delete(best);
    for (const w of list) {
      const setHere = [];
      slot.forEach(([r, c], i) => {
        if (!grid[key(r, c)]) {
          grid[key(r, c)] = w[i];
          setHere.push(key(r, c));
        }
      });
      inGrid.add(w);
      // A slot filled only by crossing words must be a word too, and not a repeat.
      const done = [...open].filter((j) => !pattern(slots[j]).includes("."));
      const okDone = done.every((j) => {
        const p = pattern(slots[j]);
        return !inGrid.has(p) && (WORDS[p.length] || []).includes(p);
      });
      if (okDone) {
        for (const j of done) {
          open.delete(j);
          inGrid.add(pattern(slots[j]));
        }
        if (solve()) return true;
        for (const j of done) {
          open.add(j);
          inGrid.delete(pattern(slots[j]));
        }
      }
      inGrid.delete(w);
      for (const k of setHere) delete grid[k];
    }
    open.add(best);
    return false;
  }
  if (!solve()) return null;
  const rows = [];
  for (let r = 0; r < R; r++) {
    let s = "";
    for (let c = 0; c < C; c++) {
      const ai = animals.findIndex(([ar, ac]) => ar === r && ac === c);
      s += !exists(r, c) ? "." : ai >= 0 ? String(ai + 1) : grid[key(r, c)];
    }
    rows.push(s);
  }
  return rows;
}

/* ---------- Scrambling the tiles for the start ---------- */
const flat = (rows) => rows.join("").split("");
const isTile = (ch) => ch !== ".";
// The sheep and the yarn can trade places (the kitten still touches both); the kitten can't.
const same = (a, b) => a === b || (/[23]/.test(a) && /[23]/.test(b));
// Fewest swaps to get from start to solution: swaps that fix two squares at once first, then one at a time.
// Where no swap fixes two, it picks the one that sets up the most two-square fixes next.
function swapsNeeded(start, sol) {
  const cur = [...start];
  const wrong = () => cur.map((ch, i) => i).filter((i) => isTile(sol[i]) && !same(cur[i], sol[i]));
  let swaps = 0;
  for (let guard = 0; guard < 400; guard++) {
    const w = wrong();
    if (!w.length) return swaps;
    let pick = null;
    for (const i of w)
      for (const j of w)
        if (i < j && same(cur[i], sol[j]) && same(cur[j], sol[i])) {
          pick = [i, j];
          break;
        }
    if (!pick) {
      let bestScore = -1;
      for (const i of w)
        for (const j of w) {
          if (i === j || !same(cur[j], sol[i])) continue; // put the right tile on square i
          const next = [...cur];
          [next[i], next[j]] = [next[j], next[i]];
          const w2 = w.filter((k) => k !== i);
          let score = 0;
          for (const a of w2) for (const b of w2) if (a < b && same(next[a], sol[b]) && same(next[b], sol[a])) score++;
          if (score > bestScore) {
            bestScore = score;
            pick = [i, j];
          }
        }
    }
    [cur[pick[0]], cur[pick[1]]] = [cur[pick[1]], cur[pick[0]]];
    swaps++;
  }
  throw new Error("couldn't work out the swaps");
}
function scramble(shape, sol, rand) {
  const idx = sol.map((ch, i) => i).filter((i) => isTile(sol[i]));
  const letters = idx.filter((i) => /[A-Z]/.test(sol[i]));
  for (let tries = 0; tries < 5000; tries++) {
    // About a third of the letters start in the right place (green); everything else, the kitten,
    // sheep and yarn included, moves.
    const keep = new Set(
      shuffle([...letters], rand).slice(0, shape.keep[0] + Math.floor(rand() * (shape.keep[1] - shape.keep[0] + 1))),
    );
    const moving = idx.filter((i) => !keep.has(i));
    const tiles = shuffle(
      moving.map((i) => sol[i]),
      rand,
    );
    const start = [...sol];
    moving.forEach((i, n) => {
      start[i] = tiles[n];
    });
    // No moving tile may land where it belongs, so the greens at the start are exactly the kept ones.
    if (moving.some((i) => same(start[i], sol[i]))) continue;
    // The kitten starts away from both the sheep and the yarn.
    const at = (ch) => {
      const i = start.indexOf(ch);
      return [Math.floor(i / shape.C), i % shape.C];
    };
    if (touching(at("1"), at("2")) || touching(at("1"), at("3"))) continue;
    const par = swapsNeeded(start, sol);
    if (par < shape.par[0] || par > shape.par[1]) continue;
    const rows = [];
    for (let r = 0; r < shape.R; r++) rows.push(start.slice(r * shape.C, r * shape.C + shape.C).join(""));
    return { rows, par: parFor(par) };
  }
  return null;
}

/* ---------- Checks ---------- */
// The words in a solved board.
function wordsOf(shape, rows) {
  const sol = flat(rows);
  const animals = ["1", "2", "3"].map((ch) => {
    const i = sol.indexOf(ch);
    return [Math.floor(i / shape.C), i % shape.C];
  });
  return shape
    .runsFor(animals)
    .filter((run) => run.length >= 3)
    .map((run) => run.map(([r, c]) => sol[r * shape.C + c]).join(""));
}
function check(p, n) {
  const errs = [];
  const say = (m) => errs.push(`Board ${n + 1}: ${m}`);
  const shape = shapeFor(n);
  const { s, b, par, k } = p;
  if (k !== shape.name) say(`should be the ${shape.name} shape for its day of the week`);
  if (!Array.isArray(s) || s.length !== shape.R || !Array.isArray(b) || b.length !== shape.R) {
    say(`needs ${shape.R} rows in s and b`);
    return errs;
  }
  if (s.some((row) => row.length !== shape.C) || b.some((row) => row.length !== shape.C)) {
    say(`every row needs ${shape.C} squares`);
    return errs;
  }
  const sol = flat(s),
    start = flat(b);
  for (let i = 0; i < sol.length; i++) {
    const [r, c] = [Math.floor(i / shape.C), i % shape.C];
    if (!shape.exists(r, c) && (sol[i] !== "." || start[i] !== ".")) say(`square ${r},${c} should be a hole`);
    if (shape.exists(r, c) && !/^[A-Z123]$/.test(sol[i])) say(`square ${r},${c} is missing or has a stray character`);
    if (shape.exists(r, c) && !/^[A-Z123]$/.test(start[i])) say(`square ${r},${c} is missing at the start`);
  }
  const count = (ch) => sol.filter((x) => x === ch).length;
  if (count("1") !== 1 || count("2") !== 1 || count("3") !== 1) {
    say("needs one kitten (1), one sheep (2) and one ball of yarn (3)");
    return errs;
  }
  const animals = ["1", "2", "3"].map((ch) => {
    const i = sol.indexOf(ch);
    return [Math.floor(i / shape.C), i % shape.C];
  });
  if (!touching(animals[0], animals[1])) say("the kitten doesn't touch the sheep");
  if (!touching(animals[0], animals[2])) say("the kitten doesn't touch the yarn");
  if (!shape.placementOk(animals))
    say("the kitten, sheep and yarn leave a 2-letter run or a letter outside every word");
  const words = wordsOf(shape, s);
  for (const w of words) if (!(WORDS[w.length] || []).includes(w)) say(`${w} isn't in the word list`);
  if (new Set(words).size !== words.length) say("a word appears twice");
  if ([...sol].filter(isTile).sort().join("") !== [...start].filter(isTile).sort().join(""))
    say("the start doesn't use the same tiles as the solution");
  if (parFor(swapsNeeded(start, sol)) !== par) say(`par should be ${parFor(swapsNeeded(start, sol))}`);
  return errs;
}

function loadExisting() {
  if (!existsSync(OUT)) return { startDate: START_DATE, list: [] };
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(OUT, "utf8"), ctx);
  return ctx.window.BISCUIT_PUZZLES;
}

function write(data) {
  const lines = data.list.map(
    (p) => `    { k: ${JSON.stringify(p.k)}, s: ${JSON.stringify(p.s)}, b: ${JSON.stringify(p.b)}, par: ${p.par} },`,
  );
  writeFileSync(
    OUT,
    `/* Biscuit and Marshmallow boards: one per day, in order, starting on startDate. Made by
   scripts/make-biscuit.mjs (run it to add more; boards already here never change) and checked by
   npm run check. Each weekday has its own shape (k). A board is a list of rows: "." is a hole,
   1 is the kitten, 2 is the sheep, 3 is the ball of yarn.
   s: the solution. b: how the board starts. par: the swaps it takes to solve, plus about 30% more, plus 3 to spare. */
window.BISCUIT_PUZZLES = {
  startDate: ${JSON.stringify(data.startDate)},
  list: [
${lines.join("\n")}
  ],
};
`,
  );
}

const arg = process.argv[2];
const data = loadExisting();
if (arg === "--check") {
  const errs = data.list.flatMap(check);
  if (errs.length) {
    console.error(errs.join("\n"));
    process.exit(1);
  }
  console.log(`Biscuit and Marshmallow: all ${data.list.length} boards look good.`);
} else {
  const want = Number(arg || 365);
  data.list.forEach((p, n) => {
    for (const w of wordsOf(shapeFor(n), p.s)) used.set(w, (used.get(w) || 0) + 1);
  });
  while (data.list.length < want) {
    const n = data.list.length,
      shape = shapeFor(n);
    let made = null;
    // A few seeds per day, in case one can't be filled.
    for (let attempt = 0; attempt < 20 && !made; attempt++) {
      const rand = rng(1000 + n * 7919 + attempt * 104729);
      for (const animals of shuffle([...shape.placements], rand).slice(0, 40)) {
        const s = fill(shape, animals, rand);
        if (!s) continue;
        const start = scramble(shape, flat(s), rand);
        if (!start) continue;
        made = { k: shape.name, s, b: start.rows, par: start.par };
        break;
      }
    }
    if (!made) {
      console.error(`Couldn't make board ${n + 1} (${shape.name}).`);
      process.exit(1);
    }
    const errs = check(made, n);
    if (errs.length) {
      console.error(errs.join("\n"));
      process.exit(1);
    }
    for (const w of wordsOf(shape, made.s)) used.set(w, (used.get(w) || 0) + 1);
    data.list.push(made);
    if (data.list.length % 25 === 0) console.log(`${data.list.length} boards…`);
  }
  write(data);
  console.log(`Wrote ${data.list.length} boards to public/biscuit-puzzles.js.`);
  for (const sh of SHAPE_FOR_DAY)
    console.log(`  ${sh.name}: ${sh.letters} letters, ${sh.placements.length} layouts, par ${sh.par.join("–")}`);
}
