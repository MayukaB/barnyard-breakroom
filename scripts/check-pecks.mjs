// Checks the Hen Pecks phrase list and pictures. Run: node scripts/check-pecks.mjs
// Fails (exit 1) on problems that would break or spoil a puzzle; prints warnings for softer issues.
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("pecks.html", root), "utf8");
const artSrc = await readFile(new URL("pecks-art.js", root), "utf8");

const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

// Pull START_DATE and PUZZLES straight out of the game page.
const start = html.match(/const START_DATE = "([^"]+)";/);
const list = html.match(/const PUZZLES = (\[[\s\S]*?\n\]);/);
if (!start) err("Couldn't find START_DATE in pecks.html.");
else if (!/^\d{4}-\d{2}-\d{2}$/.test(start[1]) || isNaN(Date.parse(start[1]))) err(`START_DATE "${start[1]}" isn't a valid YYYY-MM-DD date.`);
if (!list) { console.error("Couldn't find the PUZZLES list in pecks.html."); process.exit(1); }
const PUZZLES = vm.runInNewContext(list[1]);

// Load the art kit the way a browser would.
const sandbox = { window: {}, console: { warn: () => {}, log: () => {} } };
vm.runInNewContext(artSrc, sandbox);
const ART = sandbox.window.PECKS_ART;
if (!ART) err("pecks-art.js didn't define window.PECKS_ART.");

// Short words that are fine to repeat in a hint without giving the answer away.
const COMMON = new Set("THE AND FOR YOUR YOU WITH FROM THAT THIS INTO OUT OFF ONE TWO ALL HAS ITS DON'T CAN'T".split(" "));
const seen = new Map();
const where = (i, p) => `#${i + 1} "${p}"`;

PUZZLES.forEach((x, i) => {
  const p = x && x.p;
  if (typeof p !== "string" || !p) return err(`#${i + 1} has no phrase (p).`);
  const at = where(i, p);
  if (seen.has(p)) err(`${at} is a duplicate of #${seen.get(p) + 1}.`);
  seen.set(p, i);
  if (!/^[A-Z][A-Z' -]*[A-Z]$/.test(p)) err(`${at} may only use capital letters, spaces, apostrophes and hyphens, and must start and end with a letter.`);
  if (/ {2}|--|''/.test(p)) err(`${at} has a doubled space or punctuation mark.`);
  const letters = p.replace(/[^A-Z]/g, "").length;
  if (letters < 6) warn(`${at} has only ${letters} letters, so seven pecks may reveal it without any guessing.`);
  for (const k of ["hint", "meaning", "blurb"]) {
    if (typeof x[k] !== "string" || !x[k].trim()) err(`${at} is missing its ${k}.`);
  }
  if (typeof x.hint === "string") {
    const hintWords = new Set(x.hint.toUpperCase().match(/[A-Z']+/g) || []);
    const leaks = p.split(/[ -]/).filter((w) => w.length >= 3 && !COMMON.has(w) && hintWords.has(w));
    if (leaks.length) err(`${at}: the hint gives away ${leaks.join(", ")}.`);
    if (x.hint.length > 90) warn(`${at}: the hint is ${x.hint.length} characters; hints read best under 90.`);
  }
  if (typeof x.blurb === "string" && x.blurb.length > 480) warn(`${at}: the blurb is ${x.blurb.length} characters; it may feel long on a phone.`);

  // Every phrase should have a picture that draws without errors.
  if (ART) {
    let svg = null;
    try { svg = ART._scenes[p] ? ART._scenes[p]() : null; } catch (e) { err(`${at}: its picture threw an error: ${e.message}`); return; }
    if (!svg) warn(`${at} has no picture yet, so winners will see the plain hen.`);
    else if (/undefined|NaN/.test(svg)) err(`${at}: its picture contains "undefined" or "NaN", so part of it won't draw.`);
  }
});

if (ART) {
  for (const k of Object.keys(ART._scenes)) if (!seen.has(k)) warn(`pecks-art.js has a picture for "${k}", which isn't in the phrase list (check the spelling).`);
  try { const lose = ART.lose(); if (!lose || /undefined|NaN/.test(lose)) err("The sad hen picture didn't draw cleanly."); } catch (e) { err(`The sad hen picture threw an error: ${e.message}`); }
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error:   ${e}`);
const days = PUZZLES.length;
console.log(`\n${days} phrases checked (about ${Math.floor(days / 30)} months before the list repeats). ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
