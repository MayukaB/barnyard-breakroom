/* Hen Pecks game. Loaded after pecks-config.js, phrases.js and pecks-art.js. */
const { startDate: START_DATE, list: PUZZLES } = window.PECKS_PHRASES;

/* Consonant pairs, as drawn on the notepad: BC DF across the top, then columns. */
const VOWELS = ["A","E","I","O","U","Y"];
const PAIRS  = ["BC","DF","GL","HM","JN","KP","QV","RW","SX","TZ"];
const { MAX_PECKS, MAX_TRIES, STORE } = window.PECKS_CONFIG;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Date helpers (local time) ---------- */
const pad2 = n => String(n).padStart(2,"0");
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const dayNumber = key => { const [y,m,d] = key.split("-").map(Number); return Math.round(Date.UTC(y,m-1,d) / 864e5); };
const TODAY = todayKey();
const DAY_INDEX = Math.max(0, dayNumber(TODAY) - dayNumber(START_DATE));
const PUZZLE = PUZZLES[DAY_INDEX % PUZZLES.length];
const CHARS = [...PUZZLE.p];
const isLetter = c => /[A-Z]/.test(c);
const LETTER_POS = CHARS.map((c,i) => isLetter(c) ? i : -1).filter(i => i >= 0);

/* ---------- Storage (best effort) ---------- */
function load(){ try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save(){ try { localStorage.setItem(STORE, JSON.stringify(db)); } catch {} }
/* ---------- Saved data ----------
   Everything is saved in this browser under STORE as one object (db). db.version says which shape
   it's in. MIGRATIONS[n] upgrades data from version n to version n + 1, so a returning player's
   data is brought up to date step by step on their next visit.
   To change the shape: add a new step to the END. Never edit, remove or reorder the old ones;
   players who haven't visited in a while still need them. Each step also checks before it
   changes anything, so data saved before versions existed (version 0) upgrades safely. */
const MIGRATIONS = [
  // 1: the basics.
  d => {
    d.days = d.days || {};
    d.stats = d.stats || {played:0, wins:0, streak:0, best:0, last:null};
    d.settings = d.settings || {hard:false};
  },
  // 2: the "How your games ended" chart. Rebuild it from the games still saved on this device.
  d => {
    if (d.stats.dist) return;
    d.stats.dist = {pecks:0, t1:0, t2:0, t3:0, miss:0};
    for (const g of Object.values(d.days)){
      if (!g || !g.counted) continue;
      const k = g.phase === "lost" ? "miss" : (g.pecks.length < MAX_PECKS && !g.tries ? "pecks" : "t" + (g.solvedOnTry || 1));
      if (k in d.stats.dist) d.stats.dist[k]++;
    }
  },
  /* 3: stats worked out from a log of finished games by day (d.log = {"2026-09-28":"t2", ...}), so
     logs from two devices can be merged without counting a day twice. d.base keeps the totals
     from before games were logged by day. d.cloud is the signed-in player's saved copy, if any. */
  d => {
    if (d.log) return;
    // Streak only survives if the last win was today or yesterday.
    const st = d.stats, alive = st.last === TODAY || st.last === prevDay(TODAY);
    d.base = {played:st.played, wins:st.wins, best:st.best, streak: alive ? st.streak : 0, last:st.last, dist:{...st.dist}};
    d.log = {};
  },
  // 4: games still kept day by day (the last 10 days) move out of the old totals and into the log,
  //    so the same day played on two devices counts once when they're merged into an account.
  d => {
    if (d.logFromDays) return;
    const b = d.base;
    const outcomeOf = g => g.outcome || (g.phase === "lost" ? "miss" : (g.pecks.length < MAX_PECKS && !g.tries ? "pecks" : "t" + (g.solvedOnTry || 1)));
    for (const [day, g] of Object.entries(d.days)){
      if (!g || !g.counted || d.log[day] || (g.phase !== "won" && g.phase !== "lost")) continue;
      const o = outcomeOf(g);
      d.log[day] = o;
      if (b.played > 0){
        b.played--;
        if (o !== "miss") b.wins = Math.max(0, (b.wins || 0) - 1);
        if (b.dist && b.dist[o] > 0) b.dist[o]--;
      }
    }
    if (!b.played) d.base = {played:0, wins:0, best:0, streak:0, last:null, dist:{pecks:0, t1:0, t2:0, t3:0, miss:0}};
    d.logFromDays = true;
  },
  // 5: an id for this browser, so account sync can tell devices apart.
  d => { if (!d.device) d.device = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); },
];
function migrate(d){
  const from = Number.isInteger(d.version) ? d.version : 0;
  if (from > MIGRATIONS.length) return d;        // saved by a newer version of the game: leave it alone
  for (let v = from; v < MIGRATIONS.length; v++) MIGRATIONS[v](d);
  d.version = MIGRATIONS.length;
  return d;
}
const db = migrate(load());
function prevDay(key){ const [y,m,d] = key.split("-").map(Number); return new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10); }
function computeStats(base, log){
  base = base || {};
  const st = {played: base.played || 0, wins: base.wins || 0, best: base.best || 0, dist: {pecks:0, t1:0, t2:0, t3:0, miss:0}};
  for (const k in st.dist) st.dist[k] = (base.dist && base.dist[k]) || 0;
  let streak = base.streak || 0, last = base.last || null;
  for (const day of Object.keys(log).sort()){
    const o = log[day];
    if (!(o in st.dist)) continue;
    st.played++; st.dist[o]++;
    if (o !== "miss") st.wins++;
    if (last && day <= last) continue;           // older than the saved totals: counted, but can't move the streak
    if (o === "miss") streak = 0;
    else { streak = last === prevDay(day) ? streak + 1 : 1; last = day; st.best = Math.max(st.best, streak); }
  }
  st.streak = last === TODAY || last === prevDay(TODAY) ? streak : 0;
  return st;
}
const stats = () => db.cloud ? computeStats(db.cloud.base, {...db.log, ...db.cloud.log}) : computeStats(db.base, db.log);

const S = db.days[TODAY] && db.days[TODAY].p === PUZZLE.p ? db.days[TODAY]
        : (db.days[TODAY] = {p:PUZZLE.p, pecks:[], phase:"peck", tries:0, locked:[], hitsPerPeck:[]});
// keep storage small: only the last 10 days
for (const k of Object.keys(db.days).sort().slice(0,-10)) delete db.days[k];

// Typing in progress (not saved). Only update() below changes these.
let entry = {};          // pos -> typed letter (solve phase)
let active = null;       // selected blank position
let busy = false;        // true while a wrong try is shaking, so input waits
let lastTyped = null;    // the blank typed into most recently, for Backspace

/* ---------- Derived state ---------- */
const guessed = () => new Set(S.pecks.flatMap(k => [...k]));
const isShown = i => guessed().has(CHARS[i]) || S.locked.includes(i) || S.phase === "lost" || S.phase === "won";
const blanks = () => LETTER_POS.filter(i => !isShown(i));

/* ---------- Rendering ---------- */
const $ = id => document.getElementById(id);
const tiles = {};

function buildBoard(){
  const board = $("board"); board.textContent = "";
  let word = null;
  CHARS.forEach((c,i) => {
    if (c === " "){ word = null; return; }
    if (!word){ word = document.createElement("div"); word.className = "word"; word.setAttribute("role", "group"); board.appendChild(word); }
    const t = document.createElement("div");
    t.className = "tile" + (isLetter(c) ? "" : " punct");
    t.setAttribute("role", "img");
    if (!isLetter(c)){ t.textContent = c; t.setAttribute("aria-label", PUNCT_NAME[c] || c); }
    t.dataset.i = i;
    t.addEventListener("click", () => dispatch({ type: "select", pos: i }));
    word.appendChild(t); tiles[i] = t;
  });
  const words = [...board.querySelectorAll(".word")];
  words.forEach((w, n) => {
    const count = w.querySelectorAll(".tile:not(.punct)").length;
    w.setAttribute("aria-label", `Word ${n + 1} of ${words.length}, ${count} letter${count === 1 ? "" : "s"}`);
  });
  board.setAttribute("aria-label", `Today's phrase, ${words.length} word${words.length === 1 ? "" : "s"}`);
}
const PUNCT_NAME = {"'": "apostrophe", "-": "hyphen"};
// A spoken version of the board, e.g. "Word 1: blank, O, blank. Word 2: …"
function boardSpeech(){
  const words = []; let cur = [];
  CHARS.forEach((c, i) => {
    if (c === " "){ if (cur.length) words.push(cur); cur = []; return; }
    cur.push(!isLetter(c) ? (PUNCT_NAME[c] || c) : isShown(i) ? c : (entry[i] ? `${entry[i]} typed` : "blank"));
  });
  if (cur.length) words.push(cur);
  return words.map((w, n) => `Word ${n + 1}: ${w.join(", ")}`).join(". ") + ".";
}

function renderBoard(fresh = []){
  const g = guessed();
  for (const i of LETTER_POS){
    const t = tiles[i], c = CHARS[i];
    t.classList.remove("slot","filled","active","locked","shown","answer");
    if (S.locked.includes(i)) { t.textContent = c; t.classList.add("locked"); }
    else if (g.has(c)) { t.textContent = c; t.classList.add("shown"); }
    // Round over: fill in the rest of the answer as plain letters, so yellow still means "found by a peck".
    else if (S.phase === "won" || S.phase === "lost") { t.textContent = c; t.classList.add("answer"); }
    else if (S.phase === "solve") {
      t.textContent = entry[i] || "";
      t.classList.add("slot");
      if (entry[i]) t.classList.add("filled");
      if (i === active) t.classList.add("active");
    } else t.textContent = "";
    let label = t.textContent ? t.textContent : "blank";
    if (t.classList.contains("locked")) label += ", correct";
    else if (t.classList.contains("filled")) label = `${t.textContent}, typed`;
    if (t.classList.contains("active")) label += ", selected";
    t.setAttribute("aria-label", label);
    if (fresh.includes(i) && !reduced){ t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop"); }
  }
  renderCheck();
}

// Shows how many letters are still empty, then turns solid (with a small pulse) once the answer can be checked.
function renderCheck(){
  const btn = $("check");
  if (S.phase !== "solve") return;
  const left = blanks().filter(i => !entry[i]).length, tries = MAX_TRIES - S.tries;
  const wasReady = btn.classList.contains("ready");
  btn.classList.toggle("ready", !left);
  $("checkText").textContent = left ? `Fill in ${left} more letter${left === 1 ? "" : "s"}` : "Check answer";
  $("checkNote").textContent = `${tries} ${tries === 1 ? "try" : "tries"} left`;
  if (!left && !wasReady && !reduced){ btn.classList.remove("pulse"); void btn.offsetWidth; btn.classList.add("pulse"); }
}

function renderEggs(){
  const box = $("eggs");
  box.querySelectorAll(".egg").forEach(e => e.remove());
  for (let n = 0; n < MAX_PECKS; n++){
    const e = document.createElement("span"); e.className = "egg";
    const k = S.pecks[n];
    if (k){ e.classList.add(S.hitsPerPeck[n] ? "hit" : "miss"); e.textContent = k; e.title = `${k}: ${S.hitsPerPeck[n]} letter${S.hitsPerPeck[n]===1?"":"s"}`; }
    e.setAttribute("aria-hidden", "true");
    box.appendChild(e);
  }
  box.setAttribute("aria-label", `Pecks used: ${S.pecks.length} of ${MAX_PECKS}`);
}

function buildPad(){
  const mk = (k, parent) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "key"; b.dataset.k = k;
    if (k.length === 1) b.textContent = k;
    else { b.classList.add(k === "BC" || k === "DF" ? "across" : "down"); for (const ch of k){ const sp = document.createElement("span"); sp.textContent = ch; sp.setAttribute("aria-hidden", "true"); b.appendChild(sp); } }
    b.setAttribute("aria-label", k.length === 1 ? `Vowel ${k}` : `Consonants ${k[0]} and ${k[1]}`);
    b.addEventListener("click", () => dispatch({ type: "peck", key: k })); parent.appendChild(b);
  };
  VOWELS.forEach(k => mk(k, $("vowels")));
  PAIRS.forEach(k => mk(k, $("pairs")));
  $("check").addEventListener("click", () => dispatch({ type: "submit" }));
  const rows = ["QWERTYUIOP","ASDFGHJKL","+ZXCVBNM-"];
  for (const r of rows){
    const row = document.createElement("div"); row.className = "krow";
    for (const ch of r){
      const b = document.createElement("button"); b.type = "button"; b.className = "key";
      if (ch === "+"){ b.textContent = "Enter"; b.classList.add("wide", "enter"); b.onclick = () => dispatch({ type: "submit" }); }
      else if (ch === "-"){ b.textContent = "⌫"; b.classList.add("wide"); b.setAttribute("aria-label","Backspace"); b.onclick = () => dispatch({ type: "back" }); }
      else { b.textContent = ch; b.dataset.letter = ch; b.onclick = () => dispatch({ type: "type", ch }); }
      row.appendChild(b);
    }
    $("kb").appendChild(row);
  }
}

// Cross out keyboard letters that were pecked: every one of them is already showing on the board.
function renderKb(){
  const g = guessed();
  document.querySelectorAll("#kb .key[data-letter]").forEach(b => {
    const used = g.has(b.dataset.letter);
    b.classList.toggle("used", used);
    b.disabled = used;
    b.setAttribute("aria-label", used ? `${b.dataset.letter}, already pecked` : b.dataset.letter);
  });
}

function renderPad(){
  renderKb();
  const used = new Set(S.pecks);
  document.querySelectorAll("#peckPad .key").forEach(b => {
    const k = b.dataset.k, n = S.pecks.indexOf(k);
    b.classList.toggle("hit", used.has(k) && S.hitsPerPeck[n] > 0);
    b.classList.toggle("miss", used.has(k) && !S.hitsPerPeck[n]);
    b.disabled = used.has(k) || S.phase !== "peck";
    const name = k.length === 1 ? `Vowel ${k}` : `Consonants ${k[0]} and ${k[1]}`;
    const hits = S.hitsPerPeck[n];
    b.setAttribute("aria-label", used.has(k) ? `${name}, used, ${hits ? `found ${hits} letter${hits === 1 ? "" : "s"}` : "no letters"}` : name);
  });
  $("peckPad").hidden = S.phase !== "peck";
  $("solvePad").hidden = S.phase !== "solve";
  $("hint").hidden = S.phase === "peck";
  const hideHint = S.phase === "solve" && S.hard && !S.hintUsed;
  $("hintText").textContent = hideHint ? "" : PUZZLE.hint;
  $("hintHidden").hidden = !hideHint;
  $("peek").hidden = !hideHint;
  const hard = $("hard");
  hard.checked = S.phase === "peck" ? !!db.settings.hard : !!S.hard;
  hard.disabled = S.phase !== "peck";
  $("hardNote").textContent = S.phase === "peck" ? (db.settings.hard ? "hint hidden" : "hint shown") : (S.hard ? (S.hintUsed ? "you peeked" : "on for today") : "off for today");
}

function say(text, warn = false, spoken = ""){
  const m = $("msg"); m.textContent = text; m.classList.toggle("warn", warn);
  if (spoken){ const sp = document.createElement("span"); sp.className = "sr"; sp.textContent = " " + spoken; m.appendChild(sp); }
}
const speak = text => { const r = $("srType"); r.textContent = ""; requestAnimationFrame(() => { r.textContent = text; }); };

// The status line when nothing more specific has just happened.
function statusLine(){
  if (S.phase === "peck"){
    const left = MAX_PECKS - S.pecks.length;
    return S.pecks.length ? `${left} peck${left===1?"":"s"} left` : "Pick a vowel or a consonant pair";
  }
  if (S.phase === "solve"){
    const left = MAX_TRIES - S.tries;
    return `Fill the blanks · ${left} ${left===1?"try":"tries"} left`;
  }
  return "";
}

// Draws the board, pecks and keys from the current state. Safe to call any time.
function render(){ renderBoard(); renderEggs(); renderPad(); }

/* ---------- Game flow ----------
   Every change to the game goes through dispatch(action):
     1. update() checks the action is allowed right now and changes the state (S, plus the
        not-yet-saved typing: entry, active, busy). It returns a list of effects, or null to ignore it.
     2. The state is saved and the page is redrawn with render() (after the shake, for a wrong try).
     3. The effects run: messages, animations, focus, the result screen, syncing to the account.
   Nothing else changes S, entry, active or busy, so each rule lives in one place. */
function dispatch(action){
  const fx = update(action);
  if (!fx) return;
  save();
  // While wrong letters shake, the board stays as typed; it redraws when the shake ends.
  if (!fx.some(f => f.shake)){
    render();
    if (!fx.some(f => f.say)) say(statusLine());
  }
  for (const f of fx) runEffect(f);
}

function update(a){
  switch (a.type){
    case "peck": {
      if (S.phase !== "peck" || S.pecks.includes(a.key)) return null;
      const before = new Set(LETTER_POS.filter(isShown));
      S.pecks.push(a.key);
      const hits = CHARS.filter(c => a.key.includes(c)).length;
      S.hitsPerPeck.push(hits);
      const fx = [{ pop: LETTER_POS.filter(i => isShown(i) && !before.has(i)) }];
      if (!blanks().length) return fx.concat(endRound(true));
      if (S.pecks.length < MAX_PECKS){
        const left = MAX_PECKS - S.pecks.length, pecksLeft = `${left} peck${left === 1 ? "" : "s"} left.`;
        return fx.concat({ say: [hits ? `Your peck found ${hits} letter${hits === 1 ? "" : "s"}! ${pecksLeft}` : `No ${a.key.split("").join(" or ")} in this one. ${pecksLeft}`, !hits, boardSpeech()] });
      }
      // Out of pecks: on to filling in the blanks.
      S.phase = "solve";
      S.hard = !!db.settings.hard;
      S.hintUsed = false;
      active = blanks()[0] ?? null;
      return fx.concat(
        { say: [S.hard ? "Out of pecks. Time to take a guess! Hard mode: hint hidden." : "Out of pecks. Time to take a guess!", false,
                (S.hard ? "" : `Hint: ${PUZZLE.hint} `) + boardSpeech() + " Type the missing letters, then press Enter."] },
        { focusHint: true });
    }
    case "setHard":
      if (S.phase !== "peck") return null;
      db.settings.hard = a.on;
      return [{ say: [a.on ? "Hard mode on: the hint will stay hidden." : "Hard mode off: you’ll get the hint."] }, { sync: true }];
    case "peek":
      if (S.phase !== "solve" || !S.hard || S.hintUsed) return null;
      S.hintUsed = true;
      return [{ say: ["Hint revealed. This one won’t count as a hard-mode win."] }];
    case "select":
      if (S.phase !== "solve" || busy || isShown(a.pos)) return null;
      active = a.pos;
      return [];
    case "move": {
      if (S.phase !== "solve" || busy) return null;
      const bl = blanks(), n = bl[bl.indexOf(active) + a.by];
      if (n == null) return null;
      active = n;
      return [];
    }
    case "type": {
      if (S.phase !== "solve" || active == null || busy) return null;
      if (guessed().has(a.ch)) return [{ say: [`${a.ch} was already pecked, so it isn’t in any blank.`, true] }];
      entry[active] = a.ch;
      lastTyped = active;
      const bl = blanks(), at = bl.indexOf(active);
      active = bl.slice(at + 1).find(i => !entry[i]) ?? bl.find(i => !entry[i]) ?? active;
      const left = blanks().filter(i => !entry[i]).length;
      return [{ speak: left ? `${a.ch}. ${left} blank${left === 1 ? "" : "s"} left.` : `${a.ch}. All blanks filled. Press Enter to check.` }];
    }
    case "back": {
      if (S.phase !== "solve" || busy) return null;
      if (active != null && entry[active]) delete entry[active];
      // After typing, the cursor jumps to the next empty blank, which may wrap back to the start.
      // Backspace then removes the letter just typed rather than the blank before the cursor.
      else if (lastTyped != null && entry[lastTyped]){ active = lastTyped; delete entry[lastTyped]; }
      else {
        const bl = blanks(), prev = bl[bl.indexOf(active) - 1];
        if (prev != null){ active = prev; delete entry[prev]; }
      }
      lastTyped = null;
      return [];
    }
    case "submit": {
      if (S.phase !== "solve" || busy) return null;
      const bl = blanks(), missing = bl.filter(i => !entry[i]);
      if (missing.length){
        active = missing[0];
        return [{ say: [`${missing.length} blank${missing.length===1?"":"s"} still empty`, true] }];
      }
      const wrong = bl.filter(i => entry[i] !== CHARS[i]);
      if (!wrong.length){ S.locked.push(...bl); return endRound(true); }
      S.locked.push(...bl.filter(i => entry[i] === CHARS[i]));
      S.tries++;
      if (S.tries >= MAX_TRIES) return endRound(false);
      busy = true;                                   // input waits while the wrong letters shake
      return [{ shake: wrong, then: { type: "clearWrong", wrong } }];
    }
    case "clearWrong": {
      busy = false;
      a.wrong.forEach(i => delete entry[i]);
      active = a.wrong[0];
      const left = MAX_TRIES - S.tries;
      return [{ say: [`Not quite. ${a.wrong.length} letter${a.wrong.length===1?"":"s"} wrong · ${left} ${left===1?"try":"tries"} left`, true, "Correct letters stay. " + boardSpeech()] }];
    }
  }
  return null;
}

// The round is over: record the outcome once, then show the result.
function endRound(won){
  if (S.hard === undefined) S.hard = !!db.settings.hard;
  const byPecks = S.phase === "peck";
  S.phase = won ? "won" : "lost";
  S.outcome = !won ? "miss" : byPecks ? "pecks" : "t" + (S.tries + 1);
  S.solvedOnTry = won ? S.tries + 1 : null;
  if (!S.counted){
    S.counted = true;
    if (!db.log[TODAY]) db.log[TODAY] = S.outcome;
  }
  return [{ say: [""] }, { sync: true }, { result: true }];
}

function runEffect(f){
  if (f.say) say(...f.say);
  if (f.speak) speak(f.speak);
  if (f.pop && !reduced) for (const i of f.pop){ const t = tiles[i]; t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop"); }
  if (f.sync) cloudSync();
  if (f.result) showResult(true);
  if (f.focusHint) setTimeout(() => {
    $("hint").scrollIntoView({block:"nearest", behavior: reduced ? "auto" : "smooth"});
    const el = document.activeElement; if (!el || el === document.body || (el.closest && el.closest("#peckPad"))) $("hint").focus({preventScroll: true});
  }, 50);
  if (f.shake){
    if (!reduced) f.shake.forEach(i => { const t = tiles[i]; t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake"); });
    setTimeout(() => { f.shake.forEach(i => tiles[i].classList.remove("shake")); dispatch(f.then); }, reduced ? 0 : 480);
  }
}

function showResult(animate){
  const won = S.phase === "won";
  const r = $("result"); r.hidden = false;
  r.classList.toggle("won", won && animate);
  r.classList.toggle("lost", !won && animate);
  try {
    const art = window.PECKS_ART && (won ? window.PECKS_ART.win(PUZZLE.p) : window.PECKS_ART.lose());
    $("artNote").hidden = won;
    if (art) { $("art").innerHTML = art; $("art").setAttribute("aria-label", won ? "Illustration of " + PUZZLE.p.toLowerCase() : "A sad hen in the rain"); $("art").setAttribute("role", "img"); $("art").parentNode.removeAttribute("aria-hidden"); }
  } catch {}
  const pecksOnly = won && wonByPecks();
  $("verdict").textContent = won
    ? (pecksOnly ? "Cracked it with pecks alone!" : ["Egg-cellent!","Nicely pecked!","Phew, got it!"][Math.min(S.solvedOnTry-1,2)])
    : "The phrase got away this time";
  $("hardBadge").hidden = !(won && S.hard && !S.hintUsed);
  $("answer").textContent = PUZZLE.p.charAt(0) + PUZZLE.p.slice(1).toLowerCase();
  $("meaning").textContent = PUZZLE.meaning;
  $("blurb").textContent = PUZZLE.blurb;
  renderStats(animate);
  tickNext();
  if (animate){
    setTimeout(() => { r.scrollIntoView({block:"start", behavior: reduced ? "auto" : "smooth"}); $("verdict").focus({preventScroll: true}); }, won ? 900 : 200);
    if (won) celebrate();
  }
}

function renderStats(animate){
  const st = stats(), box = $("stats"); box.textContent = "";
  for (const [n,l] of [[st.played,"played"],[st.played ? Math.round(100*st.wins/st.played)+"%" : "0%","won"],[st.streak,"streak"],[st.best,"best streak"]]){
    const s = document.createElement("span"); const b = document.createElement("b"); b.textContent = n; s.append(b, " " + l); box.appendChild(s);
  }
  renderDist(st.dist, animate);
}

const DIST_ROWS = [["pecks","Pecks alone"],["t1","1st try"],["t2","2nd try"],["t3","3rd try"],["miss","Missed"]];
function renderDist(dist, animate){
  const list = $("dist"); list.textContent = "";
  const max = Math.max(1, ...DIST_ROWS.map(([k]) => dist[k] || 0));
  const todayKey = S.outcome || (S.phase === "lost" ? "miss" : null);
  for (const [k, label] of DIST_ROWS){
    const n = dist[k] || 0, pct = n / max * 100, isToday = k === todayKey;
    const li = document.createElement("li"); if (isToday) li.className = "today";
    const games = `${n} game${n === 1 ? "" : "s"}`;
    const lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = label;
    const track = document.createElement("span"); track.className = "track"; track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span"); bar.className = "bar"; bar.style.display = "block"; bar.style.width = animate && !reduced ? "0%" : pct + "%";
    const val = document.createElement("span"); val.className = "val";
    val.textContent = n; if (isToday){ const t = document.createElement("span"); t.className = "dtag"; t.textContent = " · today"; val.appendChild(t); }
    // Value sits just past the bar end; inside the track, clear of the bar.
    val.style.left = `calc(${pct}% + 6px)`; if (pct > 70){ val.style.left = "auto"; val.style.right = `calc(${100 - pct}% + 6px)`; val.style.color = "var(--sheet)"; if (val.lastChild && val.lastChild.className === "dtag") val.lastChild.style.color = "var(--sheet)"; }
    track.append(bar, val);
    const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = `: ${games}${isToday ? ", including today" : ""}`;
    li.append(lbl, sr, track); list.appendChild(li);
    if (animate && !reduced) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + "%"; }));
  }
}

// Older saved games have no outcome, so fall back to how they were stored.
function wonByPecks(){ return S.outcome ? S.outcome === "pecks" : S.pecks.length < MAX_PECKS && !S.tries; }
function shareText(){
  // One egg per peck: a hatched chick when it found letters, a plain egg when it didn’t.
  const eggs = S.pecks.map((k,n) => S.hitsPerPeck[n] ? "🐣" : "🥚").join("");
  const end = S.phase === "won" ? (wonByPecks() ? "Cracked with pecks alone 🐔" : `Cracked on try ${S.solvedOnTry}/${MAX_TRIES} 🐔`) : "The phrase got away 🌧️";
  const hard = S.phase === "won" && S.hard && !S.hintUsed ? " · Hard mode 🌶️" : "";
  return `Hen Pecks #${DAY_INDEX + 1}${hard}\nPecks: ${eggs}\n${end}\n${location.origin}${location.pathname}`;
}
$("share").addEventListener("click", async () => {
  const text = shareText();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch {
    // Older browsers and some in-app browsers block the clipboard API; try the old way.
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
  }
  $("share").textContent = ok ? "Copied!" : "Couldn’t copy";
  setTimeout(() => $("share").textContent = "Copy my result", 1800);
});

let nextTimer;
function tickNext(){
  clearInterval(nextTimer);
  const upd = () => {
    const now = new Date(), mid = new Date(now); mid.setHours(24,0,0,0);
    const s = Math.max(0, Math.floor((mid - now)/1000));
    if (todayKey() !== TODAY){ $("next").textContent = "A new phrase is ready. Refresh the page to play."; return; }
    $("next").textContent = `Next phrase in ${Math.floor(s/3600)}h ${pad2(Math.floor(s%3600/60))}m ${pad2(s%60)}s`;
  };
  upd(); nextTimer = setInterval(upd, 1000);
}

/* ---------- Accounts: sign in to keep stats (Supabase) ----------
   Fill in url and anonKey from Supabase → Project Settings → API. The anon key is meant to be
   public: row-level security in supabase/schema.sql keeps each player to their own row.
   Leave url empty and the game works exactly as before, with no sign-in button.
   Set google to true once Google is switched on under Authentication → Providers.
   googleClientId: the OAuth client ID from Google Cloud. With it, the page shows Google's own
   "Sign in with Google" button, so Google names barnyardbreakroom.com rather than the Supabase
   address. Without it, the plain button sends players through Supabase's Google sign-in instead. */
const CLOUD = { url: "https://tgqwamamqcbrwpheldpi.supabase.co", anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncXdhbWFtcWNicndwaGVsZHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODc4ODcsImV4cCI6MjEwNjE2Mzg4N30.aNfjzKbuOArjBqcpLZkjRVjoUTrkJZqWFzfefs8vPE8", google: true, googleClientId: "818572636423-k4772kddhhhvq4b07l94peeegtu4hqkp.apps.googleusercontent.com" };
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const GOOGLE_GSI = "https://accounts.google.com/gsi/client";
let sb = null, user = null, syncChain = Promise.resolve();

function acctMsg(text, warn = false){ const m = $("acctMsg"); m.textContent = text; m.classList.toggle("warn", warn); }
function renderAcct(){
  if (!CLOUD.url || !CLOUD.anonKey) return;
  const inAcct = !!db.cloud;
  $("acctBtnText").textContent = inAcct ? "Stats saved to your account" : "Sign in to save stats";
  $("acctTick").hidden = !inAcct;
  $("acctOut").hidden = inAcct; $("acctIn").hidden = !inAcct;
  $("acctEmail").textContent = (db.cloud && db.cloud.email) || "";
  $("orLine").hidden = !CLOUD.google;
  $("gsiBtn").hidden = !(CLOUD.google && gsiReady);
  $("gBtn").hidden = !CLOUD.google || gsiReady || gsiLoading;
  for (const b of [$("gBtn"), $("emailBtn"), $("signOut")]) b.disabled = !sb;
  const note = $("acctNote"); note.hidden = false; note.textContent = "";
  if (inAcct) note.textContent = "Saved to your account, so these follow you to any device.";
  else {
    const b = document.createElement("button"); b.type = "button"; b.className = "linkish"; b.textContent = "Sign in to keep them";
    b.addEventListener("click", openAcct);
    note.append("These stats are saved in this browser only. ", b, ".");
  }
}
function refreshStats(){ if (!$("result").hidden) renderStats(false); }
function openAcct(){ if (!$("acct").open) $("acct").showModal(); drawGsiButton(); }

/* Google's own sign-in button (Google Identity Services). Google hands back a signed ID token
   and Supabase checks it (signInWithIdToken), so players never pass through the supabase.co
   address. A one-time random value (nonce) ties the token to this page: Google gets its SHA-256
   hash, Supabase gets the original and checks they match. */
let gsiReady = false, gsiLoading = false, gsiDrawn = false, gsiNonce = "";
async function sha256hex(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function initGsi(){
  if (!CLOUD.google || !CLOUD.googleClientId || !window.crypto || !crypto.subtle) return;
  gsiLoading = true;
  const s = document.createElement("script");
  s.src = GOOGLE_GSI; s.async = true;
  s.onload = async () => {
    try {
      gsiNonce = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, "0")).join("");
      google.accounts.id.initialize({
        client_id: CLOUD.googleClientId,
        nonce: await sha256hex(gsiNonce),
        callback: onGoogleCredential
      });
      gsiReady = true;
    } catch {}
    gsiLoading = false; renderAcct(); drawGsiButton();
  };
  s.onerror = () => { gsiLoading = false; renderAcct(); };   // fall back to the plain button
  document.head.appendChild(s);
}
function drawGsiButton(){
  // Google sizes its button when drawn, so wait until the dialog is open and the box has a width.
  if (!gsiReady || gsiDrawn || !$("acct").open || $("acctOut").hidden) return;
  const box = $("gsiBtn"), w = Math.max(200, Math.min(400, Math.floor(box.getBoundingClientRect().width)));
  google.accounts.id.renderButton(box, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", width: w });
  gsiDrawn = true;
}
async function onGoogleCredential(res){
  if (!sb){ acctMsg("Sign-in is still loading. Try again in a moment.", true); return; }
  acctMsg("Signing you in…");
  const { error } = await sb.auth.signInWithIdToken({ provider: "google", token: res.credential, nonce: gsiNonce });
  if (error) acctMsg("Google sign-in didn’t work. Try again, or use the email link.", true);
}

// Sends this device's games and gets back the merged copy. Calls run one at a time.
function cloudSync(opts = {}){
  syncChain = syncChain.then(() => doSync(opts)).catch(() => {});
  return syncChain;
}
async function doSync({first = false} = {}){
  if (!sb || !user) return;
  const uid = user.id, email = user.email;
  const { data, error } = await sb.rpc("pecks_sync", {
    p_log: db.log,
    p_base: db.base && db.base.played ? db.base : null,
    p_device: db.device,
    p_settings: db.settings,
    p_overwrite_settings: !first
  });
  if (!user || user.id !== uid) return;          // signed out while this was on its way
  if (error || !data){
    if (first) acctMsg("Signed in, but your stats couldn’t be saved just now. They’re safe here and will be saved next time.", true);
    return;
  }
  db.cloud = { uid, email, base: data.base || {}, log: data.log || {} };
  if (data.settings && typeof data.settings.hard === "boolean") db.settings.hard = data.settings.hard;
  save(); renderAcct(); refreshStats(); renderPad();
}

function initCloud(){
  if (!CLOUD.url || !CLOUD.anonKey) return;
  $("acctBtn").hidden = false;
  initGsi();
  // A sign-in link that failed (expired, already used) comes back with the reason in the address.
  const h = new URLSearchParams(location.hash.slice(1));
  const linkError = h.get("error_description");
  if (linkError) history.replaceState(null, "", location.pathname + location.search);
  renderAcct();
  const s = document.createElement("script");
  s.src = SUPABASE_JS; s.async = true;
  s.onload = () => {
    try { sb = window.supabase.createClient(CLOUD.url, CLOUD.anonKey); } catch { return; }
    sb.auth.onAuthStateChange((event, session) => {
      const u = session ? session.user : null;
      const changed = (u && u.id) !== (user && user.id);
      user = u;
      if (!changed && !!u === !!db.cloud) { renderAcct(); return; }
      // Don't wait on Supabase inside this callback (it can deadlock); do the work just after.
      setTimeout(() => {
        if (!u){ if (db.cloud){ delete db.cloud; save(); refreshStats(); } renderAcct(); return; }
        const first = !db.cloud || db.cloud.uid !== u.id;
        if (first && db.cloud){ delete db.cloud; save(); refreshStats(); }   // a different player signed in here
        renderAcct();
        cloudSync({first}).then(() => { if (first && db.cloud) acctMsg("You’re signed in. Your stats are saved to your account."); });
      }, 0);
    });
    renderAcct();
    if (linkError){ openAcct(); acctMsg("That sign-in link didn’t work. It may have expired or already been used. Ask for a new one below.", true); }
  };
  s.onerror = () => acctMsg("Sign-in couldn’t load right now. Your stats are still saved in this browser.", true);
  document.head.appendChild(s);

  $("acctBtn").addEventListener("click", openAcct);
  $("acctClose").addEventListener("click", () => $("acct").close());
  $("acct").addEventListener("click", e => { if (e.target === $("acct")) $("acct").close(); });   // click on the backdrop
  $("acct").addEventListener("close", () => acctMsg(""));
  const redirectTo = location.origin + location.pathname;
  $("emailForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!sb) return;
    const email = $("email").value.trim();
    $("emailBtn").disabled = true; acctMsg("Sending…");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    $("emailBtn").disabled = false;
    if (!error) acctMsg(`Check ${email} for a sign-in link. It opens Hen Pecks signed in.`);
    else acctMsg(error.status === 429 ? "Too many sign-in emails just now. Try again in a few minutes." : "Couldn’t send the link. Check the email address and try again.", true);
  });
  $("gBtn").addEventListener("click", async () => {
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) acctMsg("Couldn’t start Google sign-in. Try the email link instead.", true);
  });
  $("signOut").addEventListener("click", async () => {
    if (!sb) return;
    $("signOut").disabled = true;
    await sb.auth.signOut().catch(() => {});
    user = null;
    if (db.cloud){ delete db.cloud; save(); }
    renderAcct(); refreshStats(); acctMsg("Signed out.");
  });
}

/* ---------- Win animation: tile dance + watercolor confetti ---------- */
function celebrate(){
  if (reduced) return;
  LETTER_POS.forEach((i,n) => { const t = tiles[i]; t.classList.remove("pop","dance"); t.style.animationDelay = (n*45)+"ms"; void t.offsetWidth; t.classList.add("dance"); });
  setTimeout(() => LETTER_POS.forEach(i => { tiles[i].classList.remove("dance"); tiles[i].style.animationDelay = ""; }), 900 + LETTER_POS.length*45);

  const cv = $("confetti"), ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  cv.hidden = false; cv.width = innerWidth*dpr; cv.height = innerHeight*dpr; ctx.scale(dpr,dpr);
  const colors = ["#D39A2F","#3A68AE","#E88B8B","#7FB37A","#F3D9A4","#9CC3E6"];
  const parts = Array.from({length:140}, () => ({
    x: innerWidth/2 + (Math.random()-.5)*innerWidth*.3, y: innerHeight*.45,
    vx: (Math.random()-.5)*14, vy: -Math.random()*14 - 5,
    r: 4 + Math.random()*7, c: colors[Math.random()*colors.length|0],
    rot: Math.random()*6, vr: (Math.random()-.5)*.3, shape: Math.random() < .35 ? "feather" : "blob", a: .85
  }));
  const t0 = performance.now();
  (function frame(t){
    const el = t - t0;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (const p of parts){
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (el > 1800) p.a = Math.max(0, p.a - .02);
      ctx.save(); ctx.globalAlpha = p.a; ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.beginPath();
      if (p.shape === "feather") ctx.ellipse(0,0,p.r*.45,p.r*1.5,0,0,Math.PI*2);
      else ctx.ellipse(0,0,p.r,p.r*.8,0,0,Math.PI*2);
      ctx.fill(); ctx.restore();
    }
    if (el < 3200) requestAnimationFrame(frame); else { ctx.clearRect(0,0,innerWidth,innerHeight); cv.hidden = true; }
  })(t0);
}

/* ---------- Keyboard ---------- */
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("summary, dialog")) return;
  const k = e.key.toUpperCase();
  if (S.phase === "peck" && /^[A-Z]$/.test(k)){
    const key = VOWELS.includes(k) ? k : PAIRS.find(p => p.includes(k));
    if (key && !S.pecks.includes(key)) { e.preventDefault(); dispatch({ type: "peck", key }); }
  } else if (S.phase === "solve"){
    // Enter or Space on a focused button (a letter key, Backspace, "Show the hint") should press that button.
    const onButton = e.target.closest && e.target.closest("button, a, input");
    if (onButton && (e.key === "Enter" || e.key === " ")) return;
    if (/^[A-Z]$/.test(k)){ e.preventDefault(); dispatch({ type: "type", ch: k }); }
    else if (e.key === "Backspace"){ e.preventDefault(); dispatch({ type: "back" }); }
    else if (e.key === "Enter"){ e.preventDefault(); dispatch({ type: "submit" }); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") dispatch({ type: "move", by: e.key === "ArrowLeft" ? -1 : 1 });
  }
});

/* ---------- Start ---------- */
$("puzzleNo").textContent = `No. ${DAY_INDEX + 1} · ${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}`;
try { if (!localStorage.getItem(STORE + ":seen")) { $("how").open = true; localStorage.setItem(STORE + ":seen","1"); } } catch { $("how").open = true; }
save();
$("hard").addEventListener("change", e => { dispatch({ type: "setHard", on: e.target.checked }); renderPad(); });
$("peek").addEventListener("click", () => dispatch({ type: "peek" }));
buildBoard(); buildPad(); initCloud();
if (S.phase === "solve") active = blanks()[0] ?? null;
render(); say(statusLine());
if (S.phase === "won" || S.phase === "lost") showResult(false);
