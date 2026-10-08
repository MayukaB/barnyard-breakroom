/* Biscuit and Marshmallow game. Loaded after biscuit-puzzles.js, biscuit-art.js and account.js.
   Each weekday has its own board shape (see scripts/make-biscuit.mjs). A board is stored as one string,
   row by row: "." is a hole, a letter is a letter tile, 1 is the kitten, 2 is the sheep and 3 is the
   ball of yarn. */
const { startDate: START_DATE, list: PUZZLES } = window.BISCUIT_PUZZLES;
const ART = window.BISCUIT_ART;
const STORE = "biscuit:v1";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Date helpers (local time) ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const dayNumber = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const prevDay = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); };
const TODAY = todayKey();
const DAY_INDEX = Math.max(0, dayNumber(TODAY) - dayNumber(START_DATE));
const PUZZLE = PUZZLES[DAY_INDEX % PUZZLES.length];
const SOL = PUZZLE.s.join("");
const START = PUZZLE.b.join("");
const PAR = PUZZLE.par;
const SHAPE = PUZZLE.k;
const ROWS = PUZZLE.s.length, COLS = PUZZLE.s[0].length;

/* ---------- The board's shape ---------- */
// Biscuit, Marshmallow and the yarn ("animals" for short): never colored, always movable until the win.
const isAnimal = (ch) => ch === "1" || ch === "2" || ch === "3";
const isLetter = (ch) => /[A-Z]/.test(ch);
const CELLS = [...SOL].map((ch, i) => i).filter((i) => SOL[i] !== ".");
const rc = (i) => [Math.floor(i / COLS), i % COLS];
// Every unbroken stretch of squares along a row or column (holes break them; Biscuit, Marshmallow and
// the yarn don't, since players can't know where they'll end up). Colors are worked out along these.
const LINES = (() => {
  const out = [];
  const scan = (idx) => {
    let cur = [];
    for (const i of idx) {
      if (SOL[i] === ".") { if (cur.length > 1) out.push(cur); cur = []; } else cur.push(i);
    }
    if (cur.length > 1) out.push(cur);
  };
  for (let r = 0; r < ROWS; r++) scan(Array.from({ length: COLS }, (_, c) => r * COLS + c));
  for (let c = 0; c < COLS; c++) scan(Array.from({ length: ROWS }, (_, r) => r * COLS + c));
  return out;
})();

/* ---------- Storage (best effort) ----------
   db.days[date] = {b: the board now, moves, done}; db.log[date] = {moves, stars}, once solved.
   Only the last 10 days of boards are kept; the log keeps every solved day for the stats.
   db.cloud = {uid, log} is the signed-in player's saved copy (see Accounts below). */
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch {} }
const db = load();
db.version = 1;
db.days = db.days || {};
db.log = db.log || {};
const sameTiles = (a, b) => typeof a === "string" && a.length === b.length && [...a].sort().join("") === [...b].sort().join("");
const saved = db.days[TODAY];
const S = saved && saved.p === DAY_INDEX && sameTiles(saved.b, START) ? saved : (db.days[TODAY] = { p: DAY_INDEX, b: START, moves: 0, done: false });
for (const k of Object.keys(db.days).sort().slice(0, -10)) delete db.days[k];

/* ---------- Rules ---------- */
const board = () => S.b;
const isGreen = (b, i) => isLetter(b[i]) && b[i] === SOL[i];
const lettersDone = (b) => CELLS.every((i) => !isLetter(SOL[i]) || b[i] === SOL[i]);
// Side by side or corner to corner.
const touching = (i, j) => { const [a, b] = [rc(i), rc(j)]; return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1; };
const biscuitHome = (b) => touching(b.indexOf("1"), b.indexOf("2")) && touching(b.indexOf("1"), b.indexOf("3"));
// Solved: every letter green, and Biscuit touching both Marshmallow and her yarn.
const solved = (b) => lettersDone(b) && biscuitHome(b);
// Green: right place. Yellow: the letter is still needed somewhere else along one of this tile's
// lines (see LINES) (each missing letter can make only one tile yellow, left to right, top to bottom).
function colors(b) {
  const out = {};
  for (const i of CELLS) if (isLetter(b[i])) out[i] = isGreen(b, i) ? "g" : "w";
  for (const line of LINES) {
    const need = {};
    for (const i of line) if (isLetter(SOL[i]) && !isGreen(b, i)) need[SOL[i]] = (need[SOL[i]] || 0) + 1;
    for (const i of line) {
      const ch = b[i];
      if (!isLetter(ch) || isGreen(b, i) || !need[ch]) continue;
      need[ch]--;
      out[i] = "y";
    }
  }
  return out;
}
const canMove = (i) => !S.done && CELLS.includes(i) && !isGreen(board(), i);
const starsFor = (moves) => (moves <= PAR ? 3 : moves <= PAR + 10 ? 2 : 1);

/* ---------- Stats ---------- */
function stats() {
  const log = db.cloud ? { ...db.log, ...db.cloud.log } : db.log;
  const days = Object.keys(log).sort();
  const st = { played: days.length, best: 0, streak: 0, dist: { 3: 0, 2: 0, 1: 0 }, total: 0 };
  let run = 0, last = null;
  for (const day of days) {
    const e = log[day];
    st.dist[e.stars] = (st.dist[e.stars] || 0) + 1;
    st.total += e.moves;
    run = last === prevDay(day) ? run + 1 : 1;
    last = day;
    st.best = Math.max(st.best, run);
  }
  st.streak = last === TODAY || last === prevDay(TODAY) ? run : 0;
  return st;
}

/* ---------- Rendering ---------- */
const $ = (id) => document.getElementById(id);
const tiles = {};
let picked = null; // the tile picked up by a tap or the keyboard, waiting for a second tile
let focusAt = CELLS.find((i) => canMove(i)) ?? CELLS[0];

const starSvg = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${on ? "star-on" : "star-off"}" stroke-width="1.2" stroke-linejoin="round" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>`;
const animalSvg = (ch, mood) => `<svg viewBox="-24 -24 48 48" aria-hidden="true">${ch === "1" ? ART.kitten(mood) : ch === "2" ? ART.sheep(mood) : ART.yarnTile()}</svg>`;
const animalName = (ch) => ({ 1: "Biscuit the kitten", 2: "Marshmallow the sheep", 3: "Biscuit's ball of yarn" })[ch];

function buildBoard() {
  const el = $("board");
  el.textContent = "";
  el.style.setProperty("--cols", COLS);
  el.classList.toggle("wide", COLS >= 8);
  for (let i = 0; i < ROWS * COLS; i++) {
    if (SOL[i] === ".") {
      const h = document.createElement("div");
      h.className = "hole";
      h.setAttribute("aria-hidden", "true");
      el.appendChild(h);
      continue;
    }
    const t = document.createElement("button");
    t.type = "button";
    t.className = "tile";
    t.dataset.i = i;
    el.appendChild(t);
    tiles[i] = t;
  }
}

function render() {
  const b = board(), col = colors(b);
  for (const i of CELLS) {
    const t = tiles[i], ch = b[i];
    const [r, c] = rc(i);
    t.classList.remove("g", "y", "w", "animal");
    if (isAnimal(ch)) {
      // Apart, Biscuit is sad and Marshmallow worried; together, they're both happy.
      const mood = S.done ? "happy" : ch === "1" ? "sad" : "worried";
      if (t.dataset.ch !== ch || t.dataset.mood !== mood) {
        t.innerHTML = animalSvg(ch, mood);
        t.dataset.mood = mood;
      }
      t.classList.add("animal");
    } else {
      if (t.dataset.ch !== ch) t.textContent = ch;
      t.classList.add(col[i]);
    }
    t.dataset.ch = ch;
    t.classList.toggle("picked", picked === i);
    t.tabIndex = i === focusAt ? 0 : -1;
    const what = isAnimal(ch) ? animalName(ch) : `${ch}, ${{ g: "correct", y: "in the wrong place in its row or column", w: "not in this row or column" }[col[i]]}`;
    t.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}: ${what}${picked === i ? ", picked up" : ""}`);
    t.setAttribute("aria-disabled", String(!canMove(i)));
  }
  // The same moment: the three of them bob so it's clear they're the only tiles left to swap.
  $("board").classList.toggle("last-swap", !S.done && lettersDone(b));
  $("moves").textContent = S.moves;
  $("par").textContent = `· par ${PAR}`;
  const n = starsFor(S.moves);
  $("stars").innerHTML = [1, 2, 3].map((k) => starSvg(k <= n)).join("");
  $("stars").setAttribute("aria-label", `${n} star${n === 1 ? "" : "s"} so far`);
  renderStory();
}

/* ---------- The story ----------
   Biscuit wakes up early, chases a ball of yarn into the woods and gets lost, while Marshmallow searches
   for her. Six storybook panels tell it: three on each side of the game on wide screens, and all six in
   the #storyBook fold-out on narrower ones. They don't change when the board is solved. */
let storyShown = false;
function renderStory() {
  if (storyShown) return;
  storyShown = true;
  // `where` keeps the two copies' gradient ids apart.
  const plate = ([draw, caption, alt], n, where) =>
    `<figure class="sb-plate"><svg viewBox="0 0 200 170" role="img" aria-label="${alt}">${draw(where + n)}</svg>` +
    `<figcaption><span class="n" aria-hidden="true">${n + 1}</span>${caption}</figcaption></figure>`;
  const panels = ART.panels();
  $("storyLeft").innerHTML = panels.slice(0, 3).map((p, n) => plate(p, n, "side")).join("");
  $("storyRight").innerHTML = panels.slice(3).map((p, n) => plate(p, n + 3, "side")).join("");
  $("storyStrip").innerHTML = panels.map((p, n) => plate(p, n, "fold")).join("");
}

function say(text) {
  $("msg").textContent = text;
  // All the letters are green but the game isn't over: make the last step hard to miss.
  $("msg").classList.toggle("nudge", !S.done && lettersDone(board()));
}
function statusLine() {
  if (S.done) return "";
  const greens = CELLS.filter((i) => isGreen(board(), i)).length, letters = CELLS.filter((i) => isLetter(SOL[i])).length;
  if (picked != null) return "Now pick a tile to swap it with.";
  // Every letter can be green with the three of them in the right squares but Biscuit in the wrong one.
  if (lettersDone(board())) return "Every letter is green! One more swap: move Biscuit so she touches both Marshmallow and her yarn.";
  return `${greens} of ${letters} letters in place`;
}

/* ---------- Moves ---------- */
function swap(i, j, from) {
  if (i === j || !canMove(i) || !canMove(j)) return false;
  const b = [...board()];
  const before = { ...colors(board()) };
  const starsBefore = starsFor(S.moves);
  [b[i], b[j]] = [b[j], b[i]];
  S.b = b.join("");
  S.moves++;
  if (S.moves === 1) window.Stats?.event("biscuit-started", "Started today’s Biscuit and Marshmallow");
  picked = null;
  focusAt = j;
  // Slide each tile in from where it came from.
  const ri = tiles[i].getBoundingClientRect(), rj = tiles[j].getBoundingClientRect();
  const fromI = from || rj;
  render();
  if (!reduced) {
    const opts = { duration: 220, easing: "cubic-bezier(.3,.9,.4,1)" };
    tiles[i].animate([{ transform: `translate(${fromI.left - ri.left}px, ${fromI.top - ri.top}px)` }, { transform: "none" }], opts);
    tiles[j].animate([{ transform: `translate(${ri.left - rj.left}px, ${ri.top - rj.top}px)` }, { transform: "none" }], opts);
    const starsNow = starsFor(S.moves);
    if (starsNow < starsBefore) $("stars").children[starsNow]?.classList.add("lost");
  }
  if (solved(S.b)) return win(), true;
  save();
  const after = colors(S.b), newGreens = [i, j].filter((k) => after[k] === "g" && before[k] !== "g").length;
  say(newGreens ? `${newGreens === 2 ? "Two letters" : "A letter"} in place! ${statusLine()}` : statusLine());
  return true;
}

function tap(i) {
  if (S.done) return;
  if (!canMove(i)) {
    if (!reduced && CELLS.includes(i)) { tiles[i].classList.remove("nope"); void tiles[i].offsetWidth; tiles[i].classList.add("nope"); }
    say(isGreen(board(), i) && !lettersDone(board()) ? "Green letters are already in the right place." : statusLine());
    return;
  }
  focusAt = i;
  if (picked == null) picked = i;
  else if (picked === i) picked = null;
  else if (!swap(picked, i)) picked = i;
  if (!S.done) { render(); if (picked != null || !$("msg").textContent) say(statusLine()); }
}

/* ---------- Dragging ---------- */
let drag = null, justDragged = false;
function tileAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const t = el && el.closest && el.closest(".tile");
  return t && t.closest("#board") ? Number(t.dataset.i) : null;
}
$("board").addEventListener("pointerdown", (e) => {
  const t = e.target.closest(".tile");
  if (!t || S.done || e.button > 0) return;
  const i = Number(t.dataset.i);
  if (!canMove(i)) return;
  drag = { i, x: e.clientX, y: e.clientY, id: e.pointerId, on: false, ghost: null, over: null };
  t.setPointerCapture(e.pointerId);
});
$("board").addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on) {
    if (Math.hypot(dx, dy) < 6) return;
    drag.on = true;
    picked = null;
    render();
    const t = tiles[drag.i], r = t.getBoundingClientRect();
    const g = t.cloneNode(true);
    g.classList.add("ghost");
    g.classList.remove("picked");
    g.removeAttribute("aria-label");
    g.setAttribute("aria-hidden", "true");
    Object.assign(g.style, { width: r.width + "px", height: r.height + "px", left: r.left + "px", top: r.top + "px" });
    drag.ghost = g;
    drag.box = r;
    document.body.appendChild(g);
    t.classList.add("lifted");
  }
  drag.ghost.style.left = drag.box.left + dx + "px";
  drag.ghost.style.top = drag.box.top + dy + "px";
  const over = tileAt(e.clientX, e.clientY);
  if (drag.over != null) tiles[drag.over].classList.remove("target");
  drag.over = over != null && over !== drag.i && canMove(over) ? over : null;
  if (drag.over != null) tiles[drag.over].classList.add("target");
});
function endDrag(e, drop) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (!d.on) return;
  justDragged = true;
  setTimeout(() => (justDragged = false), 0);
  tiles[d.i].classList.remove("lifted");
  if (d.over != null) tiles[d.over].classList.remove("target");
  const from = d.ghost.getBoundingClientRect();
  d.ghost.remove();
  if (drop && d.over != null) {
    // The dragged tile lands on d.over, sliding in from where it was dropped.
    swap(d.over, d.i, from);
  } else render();
}
$("board").addEventListener("pointerup", (e) => endDrag(e, true));
$("board").addEventListener("pointercancel", (e) => endDrag(e, false));
$("board").addEventListener("click", (e) => {
  const t = e.target.closest(".tile");
  if (!t || justDragged) return;
  tap(Number(t.dataset.i));
});

/* ---------- Keyboard: arrows move between tiles, Enter or Space picks up and swaps ---------- */
$("board").addEventListener("keydown", (e) => {
  const t = e.target.closest(".tile");
  if (!t) return;
  const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (dirs[e.key]) {
    e.preventDefault();
    let [r, c] = rc(Number(t.dataset.i));
    const [dr, dc] = dirs[e.key];
    for (;;) {
      r += dr; c += dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      if (SOL[r * COLS + c] !== ".") break; // skip over holes
    }
    focusAt = r * COLS + c;
    render();
    tiles[focusAt].focus();
  } else if (e.key === "Escape" && picked != null) {
    picked = null;
    render();
    say(statusLine());
  }
});

/* ---------- Winning ---------- */
function win() {
  S.done = true;
  picked = null;
  if (!db.log[TODAY]) db.log[TODAY] = { moves: S.moves, stars: starsFor(S.moves), p: DAY_INDEX };
  // e.g. biscuit-solved-3-stars-zig-zag, so a hard day's shape stands out.
  const stars = starsFor(S.moves), shape = SHAPE.toLowerCase().replace(/[^a-z]+/g, "-");
  window.Stats?.event(`biscuit-solved-${stars}-star${stars === 1 ? "" : "s"}-${shape}`, `Solved Biscuit and Marshmallow (${SHAPE}): ${stars} star${stars === 1 ? "" : "s"}`);
  save();
  cloudSync();
  render();
  say("Every letter is green. Biscuit followed the yarn home to Marshmallow!");
  celebrate();
  setTimeout(() => showResult(true), reduced ? 0 : 1300);
  document.dispatchEvent(new Event("game:finished")); // discord.js posts the result in Discord
}

function celebrate() {
  if (reduced) return;
  const letters = CELLS.filter((i) => isLetter(SOL[i]));
  letters.forEach((i, n) => { const t = tiles[i]; t.style.animationDelay = n * 30 + "ms"; t.classList.add("dance"); });
  setTimeout(() => letters.forEach((i) => { tiles[i].classList.remove("dance"); tiles[i].style.animationDelay = ""; }), 900 + letters.length * 30);
  const three = CELLS.filter((i) => isAnimal(board()[i]));
  three.forEach((i) => tiles[i].classList.add("hug"));
  setTimeout(() => three.forEach((i) => tiles[i].classList.remove("hug")), 1300);
  // Hearts float up from between Biscuit and Marshmallow.
  const pair = [board().indexOf("1"), board().indexOf("2")];
  const box = $("board").getBoundingClientRect();
  const [a, b] = pair.map((i) => tiles[i].getBoundingClientRect());
  for (let k = 0; k < 5; k++) {
    const h = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    h.setAttribute("viewBox", "-8 -8 16 12");
    h.setAttribute("class", "heart");
    h.setAttribute("aria-hidden", "true");
    h.innerHTML = ART.heart(0, 0, 1, k % 2 ? "#F3A9B4" : "#E8798A");
    h.style.left = (a.left + b.left) / 2 + a.width / 2 - box.left - 15 + (k - 2) * 12 + "px";
    h.style.top = (a.top + b.top) / 2 - box.top - 10 + "px";
    h.style.animationDelay = k * 180 + "ms";
    $("board").style.position = "relative";
    $("board").appendChild(h);
    setTimeout(() => h.remove(), 2400);
  }
  confetti();
}

function confetti() {
  const cv = $("confetti"), ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  cv.hidden = false; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#F5A552", "#FFFDF7", "#E8798A", "#7FB37A", "#F3D9A4", "#9CC3E6"];
  const parts = Array.from({ length: 130 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3, y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 5,
    r: 4 + Math.random() * 7, c: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, a: 0.9,
  }));
  const t0 = performance.now();
  (function frame(t) {
    const el = t - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (el > 1800) p.a = Math.max(0, p.a - 0.02);
      ctx.save(); ctx.globalAlpha = p.a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.strokeStyle = "rgba(0,0,0,.12)";
      ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (el < 3200) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.hidden = true; }
  })(t0);
}

// The end screen points to Hen Pecks, or says both games are done once today's phrase is won or lost too.
function showOtherGame() {
  let done = false;
  try {
    const day = ((JSON.parse(localStorage.getItem("henpecks:v1")) || {}).days || {})[TODAY];
    done = !!day && (day.phase === "won" || day.phase === "lost");
  } catch {}
  $("otherGame").hidden = done;
  $("bothDone").hidden = !done;
}

function showResult(animate) {
  showOtherGame();
  const r = $("result");
  r.hidden = false;
  r.classList.toggle("won", animate);
  $("art").innerHTML = ART.snuggle();
  const n = starsFor(S.moves);
  $("verdict").textContent = ["Reunited at last!", "Together again!", "A purr-fect reunion!"][n - 1];
  $("resultStars").innerHTML = [1, 2, 3].map((k) => starSvg(k <= n)).join("");
  $("resultStars").setAttribute("role", "img");
  $("resultStars").setAttribute("aria-label", `${n} star${n === 1 ? "" : "s"}`);
  const diff = S.moves - PAR;
  $("summary").textContent = `Solved in ${S.moves} swap${S.moves === 1 ? "" : "s"}` + (diff < 0 ? `, ${-diff} under par!` : diff === 0 ? ", right on par." : ` (par is ${PAR}).`);
  renderStats(animate);
  tickNext();
  if (animate) setTimeout(() => { r.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); $("verdict").focus({ preventScroll: true }); }, 100);
}

function renderStats(animate) {
  const st = stats(), box = $("stats");
  box.textContent = "";
  const avg = st.played ? (st.total / st.played).toFixed(1).replace(/\.0$/, "") : "0";
  for (const [n, l] of [[st.played, "solved"], [avg, "average swaps"], [st.streak, "streak"], [st.best, "best streak"]]) {
    const s = document.createElement("span"), b = document.createElement("b");
    b.textContent = n;
    s.append(b, " " + l);
    box.appendChild(s);
  }
  const list = $("dist");
  list.textContent = "";
  const today = db.log[TODAY] && db.log[TODAY].stars;
  const max = Math.max(1, st.dist[3], st.dist[2], st.dist[1]);
  for (const k of [3, 2, 1]) {
    const n = st.dist[k] || 0, pct = (n / max) * 100, isToday = k === today;
    const li = document.createElement("li");
    if (isToday) li.className = "today";
    const lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = `${k} star${k === 1 ? "" : "s"}`;
    const track = document.createElement("span"); track.className = "track"; track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span"); bar.className = "bar"; bar.style.width = animate && !reduced ? "0%" : pct + "%";
    const val = document.createElement("span"); val.className = "val"; val.textContent = n;
    if (isToday) { const t = document.createElement("span"); t.className = "dtag"; t.textContent = " · today"; val.appendChild(t); }
    val.style.left = `calc(${pct}% + 6px)`;
    if (pct > 70) { val.style.left = "auto"; val.style.right = `calc(${100 - pct}% + 6px)`; val.style.color = "var(--sheet)"; if (isToday) val.lastChild.style.color = "var(--sheet)"; }
    track.append(bar, val);
    const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = `: ${n} game${n === 1 ? "" : "s"}${isToday ? ", including today" : ""}`;
    li.append(lbl, sr, track);
    list.appendChild(li);
    if (animate && !reduced) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + "%"; }));
  }
}

function shareText() {
  const n = starsFor(S.moves);
  return `Biscuit and Marshmallow #${DAY_INDEX + 1} · ${SHAPE}\n${"⭐".repeat(n)}${"☆".repeat(3 - n)} ${S.moves} swaps (par ${PAR})\n🐱🧶🐑\n${location.origin}${location.pathname}`;
}
// Today's solved board, for discord.js to post in the Discord channel (null until it's solved).
window.GameResult = () => S.done ? { game: "biscuit", date: TODAY, no: DAY_INDEX + 1, shape: SHAPE, moves: S.moves, par: PAR, text: shareText() } : null;
$("share").addEventListener("click", async () => {
  window.Stats?.event("biscuit-shared", "Copied a Biscuit and Marshmallow result");
  const text = shareText();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
  }
  $("share").textContent = ok ? "Copied!" : "Couldn’t copy";
  setTimeout(() => ($("share").textContent = "Copy my result"), 1800);
});

let nextTimer;
function tickNext() {
  clearInterval(nextTimer);
  const upd = () => {
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((mid - now) / 1000));
    if (todayKey() !== TODAY) { $("next").textContent = "A new board is ready. Refresh the page to play."; return; }
    $("next").textContent = `Next board in ${Math.floor(s / 3600)}h ${pad2(Math.floor((s % 3600) / 60))}m ${pad2(s % 60)}s`;
  };
  upd();
  nextTimer = setInterval(upd, 1000);
}

/* ---------- Accounts: keep stats in the player's account ----------
   Signing in and out is handled for the whole site by account.js (window.Account). This part only
   syncs Biscuit and Marshmallow: when a player signs in, this device's solved boards go up and the
   merged copy comes back. db.cloud holds that copy while signed in. */
let syncChain = Promise.resolve();

function renderAcct() {
  if (!Account.enabled) return;
  const inAcct = !!db.cloud;
  $("acctBtnText").textContent = inAcct ? "Stats saved to your account" : "Sign in to save stats";
  $("acctTick").hidden = !inAcct;
  const note = $("acctNote");
  note.hidden = false;
  note.textContent = "";
  if (inAcct) note.textContent = "Saved to your account, so these follow you to any device.";
  else {
    const b = document.createElement("button");
    b.type = "button"; b.className = "linkish"; b.textContent = "Sign in to keep them";
    b.addEventListener("click", Account.open);
    note.append("These stats are saved in this browser only. ", b, ".");
  }
}
function refreshStats() { if (!$("result").hidden) renderStats(false); }

// Sends this device's solved boards and gets back the merged copy. Calls run one at a time.
function cloudSync(opts = {}) {
  syncChain = syncChain.then(() => doSync(opts)).catch(() => {});
  return syncChain;
}
async function doSync({ first = false } = {}) {
  const sb = Account.client, user = Account.user;
  if (!sb || !user) return;
  const uid = user.id;
  const log = {};
  for (const [day, e] of Object.entries(db.log)) log[day] = { moves: e.moves, stars: e.stars };
  const { data, error } = await sb.rpc("biscuit_sync", { p_log: log });
  if (!Account.user || Account.user.id !== uid) return; // signed out while this was on its way
  if (error || !data) {
    if (first) Account.message("Signed in, but your Biscuit and Marshmallow stats couldn’t be saved just now. They’re safe here and will be saved next time.", true);
    return;
  }
  db.cloud = { uid, log: data.log || {} };
  save(); renderAcct(); refreshStats();
}

function initCloud() {
  if (!Account.enabled) return;
  $("acctBtn").hidden = false;
  $("acctBtn").addEventListener("click", Account.open);
  renderAcct();
  Account.onChange((u) => {
    if (!u) { if (db.cloud) { delete db.cloud; save(); refreshStats(); } renderAcct(); return; }
    const first = !db.cloud || db.cloud.uid !== u.id;
    if (first && db.cloud) { delete db.cloud; save(); refreshStats(); } // a different player signed in here
    renderAcct();
    cloudSync({ first });
  });
}

/* ---------- Start ---------- */
// The animals in the How to play pictures
for (const el of document.querySelectorAll("#how [data-a], #howto [data-a]")) el.innerHTML = animalSvg(el.dataset.a, el.dataset.mood || "happy");
document.querySelector("#titlePeek .peek-k").innerHTML = ART.kitten();
document.querySelector("#titlePeek .peek-s").innerHTML = ART.sheep();
document.querySelector('#howto [data-art="kitten"]').innerHTML = ART.kitten("happy");
document.querySelector('#howto [data-art="sheep"]').innerHTML = ART.sheep("happy");
$("puzzleNo").textContent = `No. ${DAY_INDEX + 1} · ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · ${SHAPE}`;
// The story fold-out (narrow screens) starts folded, so the board is in view; once a player opens or
// closes it, it stays that way.
try { $("storyBook").open = localStorage.getItem(STORE + ":story") === "open"; } catch {}
$("storyBook").addEventListener("toggle", () => { try { localStorage.setItem(STORE + ":story", $("storyBook").open ? "open" : "closed"); } catch {} });
save();
buildBoard();
initCloud();
render();
say(S.done ? "" : S.moves ? statusLine() : "Swap tiles to make every word. Drag, or tap two tiles.");
if (S.done) showResult(false);
