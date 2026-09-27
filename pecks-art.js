/* Hen Pecks illustrations.
   A tiny kit of watercolor-style animals and props, plus one scene per phrase.
   PECKS_ART.win(phrase) returns SVG markup for a 160x140 viewBox (or null if no scene).
   PECKS_ART.lose() returns the sad hen. */
(() => {
const W = ' filter="url(#wc)"';
const n = v => Math.round(v * 100) / 100;
const G = (x, y, s, inner, flip, rot) =>
  `<g transform="translate(${n(x)} ${n(y)})${rot ? ` rotate(${rot})` : ""} scale(${flip ? -s : s} ${s})">${inner}</g>`;
const sh = (d, fill, stroke, sw = 1.4, x = "") => `<path d="${d}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${W}${x}/>`;
const sh0 = (d, fill, x = "") => `<path d="${d}" fill="${fill}"${x}/>`;
const el = (cx, cy, rx, ry, fill, stroke, rot, sw = 1.4, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}${W}${x}/>`;
const ci = (cx, cy, r, fill, stroke, sw, x) => el(cx, cy, r, r, fill, stroke, 0, sw, x);
const el0 = (cx, cy, rx, ry, fill, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${x}/>`;
const ci0 = (cx, cy, r, fill, x) => el0(cx, cy, r, r, fill, x);
const ln = (d, stroke, sw = 1.6, x = "") => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${x}/>`;
const thick = (d, fill, stroke, w = 5) => ln(d, stroke, w + 2.4, W) + ln(d, fill, w, W);
const tx = (x, y, t, size = 12, fill = "#3F4A44", x2 = "") => `<text x="${x}" y="${y}" font-family="Caveat, 'Comic Sans MS', cursive" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="middle"${x2}>${t}</text>`;
const INK = "#2C2A28";

/* ---------- faces ---------- */
function eyes(lx, rx, y, mood, ink = INK, r = 2.4) {
  if (mood === "sleep") return ln(`M${lx - 2.6} ${y} q2.6 2.2 5.2 0 M${rx - 2.6} ${y} q2.6 2.2 5.2 0`, ink, 1.4);
  if (mood === "wink") return ci0(lx, y, r, ink) + ci0(lx + .8, y - .8, .8, "#fff") + ln(`M${rx - 2.6} ${y + .5} q2.6 -2.4 5.2 0`, ink, 1.4);
  if (mood === "happy2") return ln(`M${lx - 2.6} ${y + 1} q2.6 -3 5.2 0 M${rx - 2.6} ${y + 1} q2.6 -3 5.2 0`, ink, 1.5);
  let s = ci0(lx, y, r, ink) + ci0(rx, y, r, ink) + ci0(lx + .8, y - .8, .8, "#fff") + ci0(rx + .8, y - .8, .8, "#fff");
  if (mood === "sad") s += ln(`M${lx - 3.2} ${y - 3.6} l5 -1.8 M${rx + 3.2} ${y - 3.6} l-5 -1.8`, ink, 1.1) + sh0(`M${rx + 2.4} ${y + 2.5} q1.6 3 0 4.2 q-1.6 -1.2 0 -4.2Z`, "#7FB6E3");
  if (mood === "worried") s += ln(`M${lx - 3.2} ${y - 3.4} l5 -1.8 M${rx + 3.2} ${y - 3.4} l-5 -1.8`, ink, 1.1);
  if (mood === "fierce") s += ln(`M${lx - 3.4} ${y - 4.6} l5.4 2 M${rx + 3.4} ${y - 4.6} l-5.4 2`, ink, 1.3);
  if (mood === "cry") s += sh0(`M${lx - 1} ${y + 2.5} q2 4 0 5.5 q-2 -1.5 0 -5.5Z`, "#7FB6E3") + sh0(`M${rx + 1} ${y + 2.5} q2 4 0 5.5 q-2 -1.5 0 -5.5Z`, "#7FB6E3");
  if (mood === "shock") s = ci0(lx, y, r + .6, "#fff", ` stroke="${ink}" stroke-width="1"`) + ci0(rx, y, r + .6, "#fff", ` stroke="${ink}" stroke-width="1"`) + ci0(lx, y, 1.1, ink) + ci0(rx, y, 1.1, ink);
  return s;
}
function mouth(x, y, mood, ink = INK) {
  if (mood === "sad" || mood === "cry" || mood === "worried") return ln(`M${x - 2.6} ${y + 1.2} q2.6 -2.4 5.2 0`, ink, 1.2);
  if (mood === "shock") return el0(x, y + .5, 1.8, 2.3, ink);
  if (mood === "sleep") return ln(`M${x - 1.6} ${y} q1.6 1 3.2 0`, ink, 1.1);
  if (mood === "grin") return sh0(`M${x - 6} ${y - 1} q6 7 12 0Z`, "#fff", ` stroke="${ink}" stroke-width="1.1"`);
  return ln(`M${x - 2.6} ${y} q2.6 2.6 5.2 0`, ink, 1.2);
}
const blush = (lx, rx, y) => el0(lx, y, 3.2, 2, "#F4A6A0", ` opacity=".65"`) + el0(rx, y, 3.2, 2, "#F4A6A0", ` opacity=".65"`);
const mirror = s => `<g transform="scale(-1 1)">${s}</g>`;
const both = s => s + mirror(s);

/* ---------- four-legged friends: chibi, front-facing, feet at y=0 ---------- */
const QUAD = {
  pig: { c: "#F7B7C1", d: "#D98396",
    back: (c, d, o) => ln("M12 -10 q7 -1 5 -6 q-2 -4 -5 -1", d, 1.6) + (o.wings ? both(sh("M-10 -18 q-16 -14 -24 -2 q8 0 10 4 q6 -2 14 -2Z", "#FFFFFF", "#B9C7D3")) : ""),
    ears: (c, d) => both(sh("M-13 -41 L-11 -53 L-3 -47Z", c, d)),
    front: (c, d) => el(0, -28, 6.5, 4.6, "#F29AAB", d) + el0(-2.2, -28, 1.2, 1.8, "#B5566A") + el0(2.2, -28, 1.2, 1.8, "#B5566A"),
    noMouth: 1, ey: -37 },
  cow: { c: "#FFFFFF", d: "#8C7F72",
    ears: (c, d) => both(el(-16, -39, 6, 3, c, d, -20)),
    top: () => both(sh("M-7 -47 q-2 -6 -7 -7 q2 4 2 9Z", "#F3E3B5", "#B09A6A", 1.1)),
    body: (c, d) => sh("M-7 -19 q6 -3 8 3 q-1 6 -7 5 q-5 -3 -1 -8Z", "#3B3531") + sh("M6 -8 q4 -2 5 2 q-2 4 -5 2Z", "#3B3531"),
    front: (c, d) => sh("M5 -46 q7 1 8 7 q-6 1 -8 -7Z", "#3B3531") + el(0, -27, 9, 5.5, "#F6BDBD", d) + el0(-3, -27, 1.3, 1.8, "#B66") + el0(3, -27, 1.3, 1.8, "#B66"),
    noMouth: 1, ey: -37 },
  bull: { c: "#8B5A3C", d: "#5B3A25",
    ears: (c, d) => both(el(-16, -38, 5.5, 3, c, d, -20)),
    top: () => both(sh("M-9 -44 q-11 -1 -13 -12 q6 5 15 7Z", "#F7EEDB", "#A8987A", 1.1)),
    front: (c, d) => el(0, -27, 9, 5.5, "#C99278", d) + el0(-3, -27, 1.3, 1.8, "#5B3A25") + el0(3, -27, 1.3, 1.8, "#5B3A25") + ln("M-2.6 -22.5 a2.6 2.6 0 1 0 5.2 0", "#E1B53E", 1.4),
    noMouth: 1, ey: -37 },
  horse: { c: "#B9793F", d: "#7A4B22", mane: "#5A3418",
    head: (c, d) => el(0, -34, 13, 16, c, d),
    ears: (c, d) => both(sh("M-9 -45 L-8 -56 L-2 -48Z", c, d)),
    top: (c, d, o) => sh("M-5 -50 q5 -8 10 0 q-2 5 -5 7 q-3 -3 -5 -7Z", o.mane || "#5A3418", "#3E230F", 1),
    front: (c, d) => el(0, -25, 8, 6, "#E0AE7C", d) + ci0(-3, -25, 1.1, "#6B3E1C") + ci0(3, -25, 1.1, "#6B3E1C"),
    noMouth: 1, ey: -37 },
  mule: { c: "#9D958B", d: "#6B645C",
    head: (c, d) => el(0, -34, 13, 16, c, d),
    ears: (c, d) => both(el(-7, -54, 3.6, 10, c, d, -14) + el0(-7, -54, 1.6, 6.5, "#E8BFC4", ` transform="rotate(-14 -7 -54)"`)),
    front: (c, d) => el(0, -25, 9, 7, "#DCD4C8", d) + el0(-3, -25, 1.3, 2, "#5C554E") + el0(3, -25, 1.3, 2, "#5C554E"),
    noMouth: 1, ey: -37 },
  dog: { c: "#DDA968", d: "#9A6B35",
    back: (c, d) => thick("M11 -12 q8 -4 7 -13", c, d, 3.4),
    front: (c, d, o) => both(el(-14, -33, 4.6, 9, "#9A6B35", d, 14)) + el(0, -28, 7, 5, "#F6E6CC", d) + el0(0, -30.5, 2.6, 2, INK) + (o.tongue ? el(0, -22.5, 2, 3, "#F28B9B", "#C9687A", 0, 1) : ""),
    my: -26.5 },
  cat: { c: "#F2A65A", d: "#B86E2B",
    back: (c, d, o) => thick(o.bigTail ? "M11 -8 q22 -6 20 -34" : "M11 -8 q11 -2 10 -15", c, d, o.bigTail ? 7 : 3.4),
    ears: (c, d) => both(sh("M-13 -40 L-12 -53 L-4 -46Z", c, d) + sh0("M-11 -43 L-10.6 -49.5 L-6.2 -46Z", "#F4B6B6")),
    front: (c, d) => sh0("M-1.6 -30.5 h3.2 l-1.6 2Z", "#E47C8C") + ln("M-6 -28.5 h-8 M-6 -26.5 l-8 2", d, .8) + ln("M6 -28.5 h8 M6 -26.5 l8 2", d, .8),
    top: (c, d) => ln("M-3 -48 l1 4 M0 -49 v4 M3 -48 l-1 4", d, 1.2),
    my: -27 },
  sheep: { c: "#FFFFFF", d: "#A89F94", face: "#EFDCCB",
    body: () => "", fluffy: 1 },
  goat: { c: "#F4F1EA", d: "#9A9187",
    ears: (c, d) => both(el(-15, -36, 6, 2.8, c, d, 15)),
    top: () => both(sh("M-6 -47 q-4 -8 -11 -6 q5 1 7 8Z", "#B9A98A", "#8A7A5A", 1.1)),
    front: (c, d) => sh("M-3.5 -21 l3.5 8 l3.5 -8Z", c, d, 1.1) + el(0, -27, 7, 5, "#F8E9E4", d) + el0(-2.4, -28, 1.1, 1.5, "#8A7A6A") + el0(2.4, -28, 1.1, 1.5, "#8A7A6A"),
    noMouth: 1, ey: -37 },
  lion: { c: "#F2C14E", d: "#B8862B",
    back: (c, d) => { let s = ""; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += ci(n(Math.cos(a) * 16), n(-34 + Math.sin(a) * 16), 7, "#D1812F", "#9E5A1C", 1.2); } return s + thick("M11 -8 q10 0 12 -12", c, d, 2.6) + ci(23, -21, 3.2, "#D1812F", "#9E5A1C", 1); },
    ears: (c, d) => both(ci(-11, -46, 4, c, d)),
    front: (c, d) => el(0, -28, 7.5, 5, "#FCE7B2", d) + sh0("M-2.4 -31 h4.8 l-2.4 2.6Z", "#7A4B22"),
    my: -26 },
  fox: { c: "#EC8A3E", d: "#A8521C",
    back: (c, d) => el(16, -14, 7, 15, c, d, 40) + el(23, -24, 4, 5, "#FFF5E6", d, 40, 1),
    ears: (c, d) => both(sh("M-13 -40 L-12 -54 L-3 -46Z", c, d) + sh0("M-12.2 -50 L-12 -54 L-8.7 -51Z", "#4A2A14")),
    front: (c, d) => el(0, -27, 10, 6, "#FFF5E6", d) + el0(0, -30, 2.4, 1.8, INK),
    my: -26 },
  wolf: { c: "#8F98A1", d: "#5C646C",
    back: (c, d) => el(16, -12, 6, 14, c, d, 50) + el(24, -18, 3.5, 4, "#E8EBED", d, 50, 1),
    ears: (c, d) => both(sh("M-13 -40 L-12 -55 L-3 -46Z", c, d) + sh0("M-11.4 -44 L-11.3 -50.5 L-6.6 -46.5Z", "#D9C3C0")),
    front: (c, d) => el(0, -27, 9, 6, "#E8EBED", d) + el0(0, -30, 2.4, 1.8, INK),
    my: -26 },
  elephant: { c: "#AAB4BE", d: "#6F7A85",
    back: (c, d) => both(el(-16, -34, 9, 12, c, d) + el0(-16, -34, 5.5, 8, "#F2C3C8")),
    front: (c, d) => thick("M0 -31 q0 12 6 13 q4 0 4 -4", c, d, 5),
    noMouth: 1, ey: -37 },
  mouse: { c: "#BDB7B2", d: "#7D7671",
    back: () => ln("M12 -6 q12 2 14 -8", "#E7A3AE", 1.4),
    ears: (c, d) => both(ci(-11, -46, 7, c, d) + ci0(-11, -46, 4.2, "#F4B6B6")),
    front: (c, d) => ci0(0, -30, 1.8, "#E47C8C") + ln("M-5 -29 h-7 M-5 -27 l-7 2 M5 -29 h7 M5 -27 l7 2", d, .7),
    my: -27 },
  rat: { c: "#9B8F86", d: "#6A6058",
    back: () => ln("M12 -6 q16 4 20 -10 q2 -6 6 -4", "#E7A3AE", 1.6),
    ears: (c, d) => both(ci(-11, -45, 5, c, d) + ci0(-11, -45, 3, "#F4B6B6")),
    front: (c, d) => el(0, -28, 6, 4, "#C7BCB3", d) + ci0(0, -30, 1.8, "#E47C8C") + ln("M-5 -28 h-8 M5 -28 h8", d, .7),
    my: -26 },
  possum: { c: "#E0DDD8", d: "#8F8A84",
    back: () => ln("M12 -6 q14 0 14 -10 q0 -5 -4 -4", "#E7A3AE", 2),
    ears: () => both(ci(-11, -45, 4.5, "#3C3836", "#2A2624")),
    front: (c, d) => el(0, -28, 6, 4.6, "#F4F2EE", d) + ci0(0, -30.5, 2, "#E47C8C"),
    my: -26.5 },
  squirrel: { c: "#C4773C", d: "#84461C",
    back: (c, d) => sh("M8 -8 q24 -2 18 -32 q-5 -12 -15 -6 q9 6 3 18 q-4 8 -6 20Z", c, d),
    ears: (c, d) => both(sh("M-12 -42 L-10 -52 L-5 -46Z", c, d)),
    body: () => el0(0, -10, 7, 8, "#F3D6B0"),
    front: (c, d) => el0(0, -29.5, 2, 1.6, INK),
    my: -27 },
  beaver: { c: "#9A6236", d: "#64391A",
    back: (c, d) => el(13, -3, 6, 11, "#5A3A22", "#3C2614", -60),
    ears: (c, d) => both(ci(-12, -44, 3.6, c, d)),
    front: (c, d) => el(0, -28, 7, 5, "#D9A77A", d) + el0(0, -31, 2.4, 1.8, INK) + sh("M-2.2 -26 h4.4 v3.6 h-4.4Z", "#FFFFFF", "#B9A98A", .8),
    noMouth: 1 },
  monkey: { c: "#9A6236", d: "#64391A",
    back: (c, d) => thick("M11 -8 q14 0 12 -14 q-1 -6 -6 -4", c, d, 2.6),
    ears: (c, d) => both(ci(-15, -35, 5, c, d) + ci0(-15, -35, 3, "#F2D1A8")),
    front: () => el0(-4.5, -36, 5.2, 5, "#F2D1A8") + el0(4.5, -36, 5.2, 5, "#F2D1A8") + el0(0, -29, 8, 6, "#F2D1A8") + ci0(-1.3, -31, .8, "#6B4A2A") + ci0(1.3, -31, .8, "#6B4A2A"),
    my: -27.5 },
  raccoon: { c: "#A2A8AE", d: "#62676C",
    back: (c, d) => el(15, -12, 5, 12, c, d, 50) + ln("M11 -17 l4 5 M15 -20 l4 5", "#4A4D50", 2),
    ears: (c, d) => both(sh("M-13 -41 L-11 -52 L-4 -46Z", c, d)),
    front: (c, d) => sh0("M-13 -39 q6.5 -4 13 -.5 q6.5 -3.5 13 .5 q-2 6.5 -13 3.5 q-11 3 -13 -3.5Z", "#3C3F42") + el(0, -28, 7, 5, "#EDEFF1", d) + el0(0, -30.5, 2.2, 1.7, INK),
    ink: "#FFFFFF", my: -26.5 },
  croc: { c: "#7FB069", d: "#4C7A3A",
    head: (c, d) => el(0, -32, 18, 11, c, d) + ci(-7, -42, 5, c, d) + ci(7, -42, 5, c, d),
    body: () => el0(0, -10, 8, 8, "#CFE3B3"),
    front: (c, d) => el0(-4, -35, 1.1, 1.4, "#3F6630") + el0(4, -35, 1.1, 1.4, "#3F6630") + ln("M-12 -28 q12 6 24 0", d, 1.3) + sh0("M-8 -27 l1.6 2.6 l1.6 -2 l1.6 2.4 l1.6 -2 l1.6 2.4 l1.6 -2 l1.6 2.4 l1.6 -2 l1.6 2.6 l1.6 -2.8Z", "#FFFFFF"),
    ey: -42, noMouth: 1, noBlush: 1 },
};
function quad(t, o) {
  const P = QUAD[t], c = o.c || P.c, d = P.d, mood = o.mood || "happy";
  let s = P.back ? P.back(c, d, o) : "";
  if (P.fluffy) {
    const wool = o.c || "#FFFFFF", face = o.face || P.face, wd = o.c ? "#2E2A28" : d;
    let puff = ""; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; puff += ci(n(Math.cos(a) * 12), n(-13 + Math.sin(a) * 9), 6, wool, wd, 1.2); }
    s += puff + el0(0, -13, 13, 10, wool) + el(-6, -1, 3.5, 2.6, face, wd) + el(6, -1, 3.5, 2.6, face, wd);
    let top = ""; for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; top += ci(n(Math.cos(a) * 11), n(-37 + Math.sin(a) * 9), 5.5, wool, wd, 1.2); }
    s += top + both(el(-13, -33, 5, 2.6, face, wd, 15)) + el(0, -32, 9, 11, face, wd) + eyes(-4, 4, -33, mood, o.ink || INK, 2.1) + blush(-6, 6, -28) + mouth(0, -27, mood, o.ink || INK);
    return s + (o.extra || "");
  }
  s += el(0, -12, 13, 12, c, d) + el(-6, -1, 4.5, 2.6, c, d) + el(6, -1, 4.5, 2.6, c, d);
  if (P.body) s += P.body(c, d, o);
  if (o.pj) s += sh0("M-12 -16 h24 M-13 -10 h26", "none") + ln("M-12 -17 q12 2 24 0 M-13 -11 q13 2 26 0 M-12 -5 q12 2 24 0", "#7FA7D9", 1.6);
  if (P.ears) s += P.ears(c, d, o);
  s += P.head ? P.head(c, d, o) : ci(0, -34, 15, c, d);
  if (P.front) s += P.front(c, d, o);
  const ey = P.ey || -36;
  s += eyes(-5.5, 5.5, ey, mood, o.ink || P.ink || INK);
  if (!P.noBlush) s += blush(-10, 10, -30);
  if (!P.noMouth) s += mouth(0, P.my || -28, mood);
  if (P.top) s += P.top(c, d, o);
  return s + (o.extra || "");
}

/* ---------- birds: side view facing right, feet at y=0 ---------- */
const BIRD = {
  bird: { c: "#7FB3E0", d: "#3F6F9E", beak: "#F2A33A" },
  crow: { c: "#3B3B46", d: "#1F1F26", beak: "#6A6A72", ink: "#FFFFFF" },
  hawk: { c: "#A86B3C", d: "#6B4020", beak: "#F2C14E", hook: 1, belly: "#F3E3C7" },
  duck: { c: "#FFFFFF", d: "#A89F94", bill: "#F2A33A" },
  duckling: { c: "#F7D65A", d: "#C9A12A", bill: "#F2A33A", small: 1 },
  chick: { c: "#F7D65A", d: "#C9A12A", beak: "#F2A33A", small: 1, noTail: 1 },
  hen: { c: "#FFFFFF", d: "#C9B89A", beak: "#E8A93A", comb: "small" },
  rooster: { c: "#FFFFFF", d: "#A89F94", beak: "#E8A93A", comb: "big", fancyTail: 1 },
  goose: { c: "#FFFFFF", d: "#A89F94", bill: "#F2A33A", neck: "goose" },
  swan: { c: "#FFFFFF", d: "#A89F94", bill: "#E8663A", neck: "swan" },
  turkey: { c: "#8A5A3A", d: "#5A3820", beak: "#E8C35A", fan: 1, headC: "#A9BCD0" },
};
function bird(t, o) {
  const P = BIRD[t], c = o.c || P.c, d = P.d, mood = o.mood || "happy", ink = P.ink || INK;
  let s = ln("M-3 -3 v-5 M3 -3 v-5 M-6 -1 l3 -2 l3 2 M0 -1 l3 -2 l3 2", "#E8A93A", 1.5);
  if (P.fan) { const cols = ["#C0703A", "#E8B85A", "#8A5A3A", "#F3E3C7"]; for (let i = 0; i < 7; i++) s += `<g transform="rotate(${-75 + i * 25} -4 -16)">${el(-4, -32, 5, 14, cols[i % 4], d, 0, 1.1)}</g>`; }
  if (P.fancyTail) s += thick("M-10 -16 q-14 -10 -10 -26", "#3E6B4E", "#274532", 3) + thick("M-10 -14 q-18 -4 -18 -20", "#C0453A", "#8A2A22", 3) + thick("M-9 -12 q-16 2 -20 -10", "#E8A93A", "#A8741C", 2.6);
  else if (!P.noTail && !P.fan) s += sh("M-9 -17 l-10 -7 l2 11Z", c, d);
  const sm = P.small ? .8 : 1;
  s += `<g transform="scale(${sm})">`;
  s += el(0, -14, 12, 11, c, d);
  if (P.belly) s += el0(3, -10, 6, 6, P.belly);
  let hx = 8, hy = -24, hr = 8;
  if (P.neck === "goose") { s += sh("M4 -21 q8 -8 5 -19 l7 0 q2 12 -6 22Z", c, d); hx = 12; hy = -40; hr = 6.5; }
  if (P.neck === "swan") { s += thick("M4 -19 q12 -6 5 -19 q-5 -10 5 -15", c, d, 5.4); hx = 11; hy = -53; hr = 5.4; }
  if (P.comb === "big") s += sh(`M${hx - 5} ${hy - 6} q1 -8 5 -4 q2 -7 5 -1 q4 -4 4 3 q-6 3 -14 2Z`, "#D9534F", "#A8322F", 1);
  if (P.comb === "small") s += sh(`M${hx - 3} ${hy - 6} q1 -5 3 -2 q2 -4 4 0 q2 1 1 3Z`, "#D9534F", "#A8322F", 1);
  s += ci(hx, hy, hr, P.headC || c, d);
  if (P.comb) s += sh(`M${hx + 5} ${hy + 4} q3 1 2 5 q-3 0 -2 -5Z`, "#D9534F", "#A8322F", .9);
  if (P.fan) s += sh(`M${hx + 4} ${hy + 3} q3 2 1 8 q-3 -2 -1 -8Z`, "#D9534F", "#A8322F", .9);
  if (P.bill) s += el(hx + hr + 3, hy + 1, 5, 2.4, P.bill, "#C27A1E", 0, 1) + (t === "swan" ? ci0(hx + hr, hy, 1.4, INK) : "");
  else if (P.hook) s += sh(`M${hx + hr - 1} ${hy - 2} q7 -1 7 5 l-3 -1.5 l-4 1.5Z`, P.beak, "#B8862B", 1);
  else s += sh(`M${hx + hr - 1} ${hy - 1.8} l${P.small ? 4 : 6} 2 l-${P.small ? 4 : 6} 2.4Z`, P.beak, "#C27A1E", .9);
  s += el(-1, -13, 7, 5, c, d, -15);
  const ex = hx + 2, eyy = hy - 1;
  if (mood === "sleep") s += ln(`M${ex - 2.2} ${eyy} q2.2 1.8 4.4 0`, ink, 1.3);
  else if (mood === "happy2") s += ln(`M${ex - 2.2} ${eyy + 1} q2.2 -2.6 4.4 0`, ink, 1.4);
  else if (mood === "shock" || mood === "worried") s += (mood === "worried" ? sh0(`M${ex - 5} ${eyy - 5} q2.4 3.6 0 5 q-2.4 -1.4 0 -5Z`, "#9CC9EC") : "") + ci0(ex, eyy, 2.8, "#fff", ` stroke="${INK}" stroke-width="1"`) + ci0(ex, eyy, 1.2, INK);
  else {
    s += ci0(ex, eyy, 2.2, ink) + ci0(ex + .7, eyy - .7, .7, ink === INK ? "#fff" : INK);
    if (mood === "sad" || mood === "cry") s += sh0(`M${ex - 2.7} ${eyy + .2} a2.7 2.7 0 0 1 5.4 0Z`, P.headC || c) + ln(`M${ex - 2.9} ${eyy + .2} q2.9 -1 5.8 -1.4`, ink, 1) + ln(`M${ex - 2.4} ${eyy - 4.2} l4.6 -1.6`, ink, .9) + sh0(`M${ex + .4} ${eyy + 2.6} q2.2 4 0 5.8 q-2.2 -1.8 0 -5.8Z`, "#7FB6E3") + sh0(`M${ex - 1} ${eyy + 11} q1.6 3 0 4.2 q-1.6 -1.2 0 -4.2Z`, "#7FB6E3", ` opacity=".8"`);
    if (mood === "fierce") s += ln(`M${ex - 3.4} ${eyy - 4.4} l6 2.4`, ink, 1.4);
    if (mood === "worried") s += ln(`M${ex - 3} ${eyy - 3.2} l5 -1.6`, ink, 1.1);
  }
  if (t !== "crow") s += el0(ex + 1, hy + 3.5, 2.4, 1.5, "#F4A6A0", ` opacity=".6"`);
  s += "</g>";
  return s + (o.extra || "");
}
function owl(o) {
  const mood = o.mood || "happy";
  let s = ln("M-4 -2 v-4 M4 -2 v-4 M-7 0 l3 -2 l3 2 M1 0 l3 -2 l3 2", "#E8A93A", 1.5);
  s += both(sh("M-9 -40 l-4 -9 l9 5Z", "#A57C52", "#6E4F2F", 1.1));
  s += el(0, -21, 14, 19, "#A57C52", "#6E4F2F") + both(el(-12, -18, 4.5, 11, "#8C6440", "#6E4F2F", 12));
  s += el0(0, -12, 8, 8, "#E8D2AE") + ln("M-4 -14 l2 2 l2 -2 M0 -14 l2 2 l2 -2 M-2 -9 l2 2 l2 -2", "#A57C52", 1);
  s += ci(-6, -29, 7, "#F1DDBA", "#C9A77A", 1) + ci(6, -29, 7, "#F1DDBA", "#C9A77A", 1);
  if (mood === "sleep") s += ln("M-9 -29 q3 2.4 6 0 M3 -29 q3 2.4 6 0", INK, 1.4);
  else s += ci0(-6, -29, 4, "#fff") + ci0(6, -29, 4, "#fff") + ci0(-5.4, -29, 2.4, INK) + ci0(6.6, -29, 2.4, INK) + ci0(-4.6, -30, .8, "#fff") + ci0(7.4, -30, .8, "#fff");
  s += sh("M-2 -25 l2 4 l2 -4Z", "#E8A93A", "#B8862B", .8);
  return s + (o.extra || "");
}

/* ---------- small critters (centered at 0,0 unless noted) ---------- */
const CRIT = {
  fish: o => { const c = o.c || "#F2A65A", d = o.d || "#B86E2B"; return sh("M-10 0 l-9 -7 v14Z", c, d) + sh("M-3 -7 q4 -6 8 -1Z", c, d, 1.1) + el(0, 0, 13, 8, c, d) + ln("M-2 -6 q-3 6 0 12", d, 1) + (o.mood === "sad" ? ci0(6, -2, 2, INK) + ln("M3 -5.4 l5 1.4", INK, 1) + ln("M9 4 q2 -2 3.4 0", INK, 1) : ci0(6, -2, 2, INK) + ci0(6.6, -2.6, .7, "#fff") + ln("M9 2.5 q2 1.6 3.4 0", INK, 1)); },
  bee: o => { const c = o.hornet ? "#E8962E" : "#F7C948", d = o.hornet ? "#8A4A12" : "#8A6A1A"; return el(-3, -9, 5, 4, "#E3F3FC", "#9CC3E6", -20, 1, ` opacity=".9"`) + el(3, -10, 4, 3.5, "#E3F3FC", "#9CC3E6", 20, 1, ` opacity=".9"`) + sh("M-9 0 l-4 1 l4 1.6Z", INK, INK, .6) + el(0, 0, 9, 7, c, d) + ln("M-3.4 -5.6 v11.2 M1.6 -6.6 v13.2", "#3A3228", 2.6) + ln("M6 -5 q2 -5 5 -5 M7 -4.5 q3 -3 6 -2", "#3A3228", 1) + ci0(5.6, -1.2, 1.7, INK) + (o.hornet ? ln("M4 -3.8 l3 1", INK, 1) : "") + ln("M4.6 2.4 q1.4 1.2 2.8 0", INK, .9); },
  ant: o => ln("M-7 1 l-3 4 M-1 1 v5 M4 1 l3 4 M-7 -1 l-3 -3 M4 -1 l3 -3 M9 -4 q2 -5 5 -5 M10 -3 q3 -2 5 -1", "#3A3228", 1.1) + ci(-7, 0, 3.6, "#3A3228", "#1E1A16", 1) + ci(0, 0, 3, "#3A3228", "#1E1A16", 1) + ci(7, -1, 3.8, "#3A3228", "#1E1A16", 1) + ci0(8.2, -2, 1, "#fff"),
  butterfly: o => { const c = o.c || "#F29BB8", d = o.d || "#C25E82"; return both(sh("M0 -2 q-12 -14 -14 -4 q0 6 14 6Z", c, d, 1.1) + sh("M0 1 q-10 10 -10 3 q0 -4 10 -3Z", o.c2 || "#F7D154", d, 1.1)) + el(0, 0, 1.6, 7, "#3A3228") + ln("M0 -6 q-2 -5 -4 -6 M0 -6 q2 -5 4 -6", "#3A3228", .9); },
  ladybug: o => ci(8, 0, 4, "#2B2624", "#1A1614", 1) + sh("M-9 2 a9 9 0 0 1 18 0Z", "#D9443A", "#9E2A22") + ln("M0 -7 v9", "#3A1A16", 1) + ci0(-4, -2, 1.6, "#2B2624") + ci0(4, -3, 1.6, "#2B2624") + ci0(-3, -5.5, 1.2, "#2B2624") + ci0(9, -1, .9, "#fff"),
  snake: o => thick("M-26 6 q8 -10 16 0 q8 10 16 0 q6 -8 12 -6", "#8BC34A", "#557A2A", 6) + el(20, -1, 6.5, 5, "#8BC34A", "#557A2A") + ci0(21, -3, 1.6, INK) + ci0(21.5, -3.5, .5, "#fff") + ln("M26.5 0 l4 1 m-1 0 l2 -2 m-2 2 l2 2", "#D9443A", .9) + (o.mood === "wink" ? "" : ""),
  clam: o => { const d = "#A8866A", c = o.c || "#F3D9C4"; let s = sh("M-15 0 q15 11 30 0 q-15 -3 -30 0Z", c, d); if (o.open) s += ci(0, -3, 3.8, "#FFFFFF", "#D8D0C8", 1) + sh("M-15 -2 q15 -20 30 0 q-15 -5 -30 0Z", c, d, 1.4, ` transform="rotate(-18 -15 -2)"`); else s += sh("M-15 0 q15 -18 30 0Z", c, d) + ln("M-8 -2 q2 -8 3 -10 M0 -1 v-11 M8 -2 q-2 -8 -3 -10", d, .9); if (!o.open) s += eyes(-5, 5, -4, o.mood || "happy", INK, 1.8) + mouth(0, 3.2, o.mood || "happy"); return s; },
  worm: o => thick("M-10 2 q4 -8 8 0 q4 8 8 0", "#F2A2A8", "#C66E78", 4.4) + ci0(6.5, -1.4, 1.1, INK),
  hornet: o => CRIT.bee({ hornet: 1 }),
};

/* ---------- props (local coords; most sit on y=0) ---------- */
const PROP = {
  cloud: o => (o.rain ? ln("M-10 8 l-2 6 M0 9 l-2 6 M10 8 l-2 6", "#7FB6E3", 1.6) : "") + ci(-9, 0, 7, o.c || "#FFFFFF", o.d || "#C7D6DF", 1.2) + ci(0, -5, 9, o.c || "#FFFFFF", o.d || "#C7D6DF", 1.2) + ci(10, 0, 7, o.c || "#FFFFFF", o.d || "#C7D6DF", 1.2) + el0(0, 2, 16, 5, o.c || "#FFFFFF"),
  sun: o => ln("M0 -17 v-5 M0 17 v5 M-17 0 h-5 M17 0 h5 M-12 -12 l-4 -4 M12 -12 l4 -4 M-12 12 l-4 4 M12 12 l4 4", "#F2B544", 2) + ci(0, 0, 11, "#F7C45C", "#E0A032") + (o.face ? eyes(-4, 4, -1, o.face, "#8A5A1A", 1.6) + mouth(0, 4, "happy", "#8A5A1A") : ""),
  moon: () => sh("M4 -12 a12 12 0 1 0 8 20 a10 10 0 1 1 -8 -20Z", "#F7E3A0", "#D9B85A"),
  star: o => sh("M0 -6 l1.8 4 l4.2 .4 l-3.2 2.8 l1 4.2 l-3.8 -2.2 l-3.8 2.2 l1 -4.2 l-3.2 -2.8 l4.2 -.4Z", o.c || "#F7D154", "#D9A932", .9),
  tree: o => sh("M-3 0 v-22 h6 v22Z", "#8A5A3A", "#5A3820") + ci(-8, -30, 10, o.c || "#8CBF6E", "#5E8C44") + ci(8, -30, 10, o.c || "#8CBF6E", "#5E8C44") + ci(0, -40, 11, o.c || "#8CBF6E", "#5E8C44") + (o.fruit ? ci0(-6, -32, 2, "#D9534F") + ci0(6, -38, 2, "#D9534F") : ""),
  flower: o => ln("M0 0 v-14", "#5E8C44", 1.6) + el(3, -6, 3, 1.6, "#8CBF6E", "#5E8C44", -30, .8) + [0, 72, 144, 216, 288].map(a => ci(n(Math.cos(a * Math.PI / 180) * 3.4), n(-16 + Math.sin(a * Math.PI / 180) * 3.4), 2.6, o.c || "#F29BB8", o.d || "#C25E82", .8)).join("") + ci0(0, -16, 2, "#F7D154"),
  grass: o => ln("M-8 0 l-2 -6 M-6 0 l1 -7 M-3 0 l3 -5 M4 0 l-1 -6 M6 0 l2 -7 M9 0 l3 -5", o.c || "#6E9E56", 1.3),
  fence: o => { let s = ""; for (let i = 0; i < 4; i++) s += sh(`M${i * 12 - 20} 0 v-18 l2.5 -3 l2.5 3 v18Z`, "#D9B98A", "#9A7A4A", 1.1); return s + sh("M-22 -13 h42 v3 h-42Z M-22 -6 h42 v3 h-42Z", "#D9B98A", "#9A7A4A", 1.1); },
  barn: () => sh("M-22 0 v-26 l22 -14 l22 14 v26Z", "#C9523F", "#8E3326") + sh("M-24 -25 l24 -16 l24 16", "none", "#FFFFFF", 2) + sh("M-8 0 v-16 h16 v16Z", "#F7EEDB", "#8E3326", 1.2) + ln("M-8 -16 l16 16 M8 -16 l-16 16", "#C9523F", 1.2) + ci0(0, -29, 3, "#F7EEDB"),
  house: () => sh("M-18 0 v-22 h36 v22Z", "#F4E3C3", "#A8866A") + sh("M-22 -21 l22 -16 l22 16Z", "#C9523F", "#8E3326") + sh("M-4 0 v-12 h8 v12Z", "#8A5A3A", "#5A3820", 1) + sh("M7 -17 h7 v6 h-7Z", "#BFE0F2", "#6F8FA8", 1) + sh("M-14 -17 h7 v6 h-7Z", "#BFE0F2", "#6F8FA8", 1),
  doghouse: o => sh("M-18 0 v-20 h36 v20Z", "#D9A56A", "#8A5A2A") + sh("M-22 -18 l22 -16 l22 16Z", "#C9523F", "#8E3326") + sh("M-8 0 v-9 a8 8 0 0 1 16 0 v9Z", "#4A3426", "#2A1C14", 1) + (o.name ? `<rect x="-7" y="-28" width="14" height="5" rx="1" fill="#F7EEDB"/>` : ""),
  sack: o => sh("M-14 0 q-4 -18 6 -26 l-2 -4 h20 l-2 4 q10 8 6 26Z", "#D8B98A", "#9A7A4A") + ln("M-8 -26 q8 3 16 0", "#8A5A2A", 1.8) + ln("M-8 -12 q2 -4 0 -8 M6 -8 q2 -4 0 -8", "#B89868", 1),
  bubble: o => { const w = o.w || 34; return sh(`M${-w / 2} -22 h${w} a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h${-w / 2 + 10} l-8 7 l1 -7 h${-w / 2 + 2} a5 5 0 0 1 -5 -5 v-10 a5 5 0 0 1 5 -5Z`, "#FFFFFF", "#9AA6AD", 1.2) + tx(0, -8, o.t || "", o.size || 12); },
  thought: o => ci(-12, 6, 2, "#FFFFFF", "#9AA6AD", 1) + ci(-7, 1, 3, "#FFFFFF", "#9AA6AD", 1) + PROP.cloud({ d: "#9AA6AD" }) + (o.inner || ""),
  heart: o => sh("M0 5 q-10 -6 -10 -12 q0 -6 5 -6 q4 0 5 4 q1 -4 5 -4 q5 0 5 6 q0 6 -10 12Z", o.c || "#E86A7A", o.d || "#B8404F", 1.1),
  crown: () => sh("M-10 0 v-9 l5 4 l5 -8 l5 8 l5 -4 v9Z", "#F7C948", "#B88A1C", 1.2) + ci0(0, -4, 1.4, "#D9534F") + ci0(-6, -3, 1, "#7FB3E0") + ci0(6, -3, 1, "#7FB3E0"),
  coin: () => ci(0, 0, 5, "#F7C948", "#B88A1C", 1.1) + ci0(0, 0, 2.8, "#FBDD7A"),
  coins: () => [[-8, 0], [0, 0], [8, 0], [-4, -4], [4, -4], [0, -8]].map(([x, y]) => el(x, y, 5, 2.4, "#F7C948", "#B88A1C", 0, 1)).join(""),
  egg: o => el(0, -7, 5.4, 7, o.c || "#FFF8EC", o.d || "#C9B89A", 0, 1.2) + (o.shine ? ln("M-2 -11 q-1 2 0 4", "#FFFFFF", 1.2) : ""),
  nest: o => (o.eggs || []).map((c, i, a) => el((i - (a.length - 1) / 2) * 8, -9, 4.6, 6, c, c === "#F7C948" ? "#B88A1C" : "#C9B89A", 0, 1.1)).join("") + sh("M-18 -6 q18 14 36 0 q-2 8 -18 8 q-16 0 -18 -8Z", "#A8744A", "#6B4424") + ln("M-15 -4 l8 3 M-6 -1 l10 -3 M4 0 l10 -4 M-12 0 l6 -2", "#6B4424", 1),
  basket: o => (o.inner || "") + sh("M-16 -12 h32 l-4 12 h-24Z", "#C99B5E", "#8A6232") + ln("M-15 -8 h30 M-14 -4 h28 M-8 -12 l1 12 M0 -12 v12 M8 -12 l-1 12", "#8A6232", .9) + ln("M-14 -12 q14 -22 28 0", "#8A6232", 2),
  pie: () => sh("M-20 -7 l3 7 h34 l3 -7Z", "#E3E8EC", "#9AA6AD", 1.2) + el(0, -8, 20, 6.5, "#E8B872", "#B88A4A") + ln("M-12 -12 l8 8 M-4 -13.5 l10 10 M6 -13 l8 8 M-14 -6 l10 -7 M-4 -3 l12 -9 M8 -3 l8 -6", "#C9954E", 1.2) + ln("M-6 -18 q-2 -4 0 -7 M4 -19 q-2 -4 0 -7", "#C7D6DF", 1.2),
  crumb: () => sh("M-3 0 l3 -4 l3 4Z", "#E8B872", "#B88A4A", .8),
  pond: o => el(0, 0, o.rx || 30, o.ry || 8, "#8EC3E6", "#5E97BF") + ln("M-12 -1 h6 M6 2 h8", "#FFFFFF", 1.2),
  trough: () => sh("M-18 0 v-12 h36 v12Z", "#B98A5A", "#7A5530") + sh("M-17 -12 h34 v3 h-34Z", "#8EC3E6", "#5E97BF", 1) + ln("M-18 -6 h36", "#7A5530", 1),
  hay: () => sh("M-18 0 q-2 -16 8 -20 q10 -6 20 0 q10 4 8 20Z", "#F2D27A", "#C9A140") + ln("M-12 -4 l4 -10 M-4 -2 l2 -14 M4 -3 l-1 -12 M11 -3 l-3 -10", "#C9A140", 1),
  cart: () => sh("M-18 -8 h30 v-12 h-30Z", "#C99B5E", "#8A6232") + ln("M12 -14 h14", "#8A6232", 2) + ci(-6, -4, 6, "#8A6232", "#5A3820", 1.2) + ci0(-6, -4, 2, "#5A3820") + ln("M-6 -10 v12 M-12 -4 h12", "#5A3820", 1),
  box: () => sh("M-14 0 v-18 h28 v18Z", "#D9B07A", "#9A7440") + sh("M-14 -18 l-6 -6 h28 l6 6Z", "#E8C48E", "#9A7440", 1.2) + sh("M14 -18 l6 -7 v6Z", "#C99B5E", "#9A7440", 1),
  can: () => sh("M-10 0 v-18 h20 v18Z", "#C3CCD4", "#7D8A96") + el(0, -18, 10, 3, "#DDE3E8", "#7D8A96", 0, 1.2) + sh("M-10 -12 h20 v7 h-20Z", "#D9534F", "#A8322F", .8),
  trophy: () => sh("M-8 -24 h16 v4 q0 10 -8 12 q-8 -2 -8 -12Z", "#F7C948", "#B88A1C") + ln("M-8 -21 q-6 0 -5 5 q1 3 5 3 M8 -21 q6 0 5 5 q-1 3 -5 3", "#B88A1C", 1.4) + sh("M-2 -8 h4 v4 h-4Z M-6 -4 h12 v4 h-12Z", "#D9A932", "#B88A1C", 1),
  podium: () => sh("M-10 0 v-18 h20 v18Z", "#E8D7B0", "#A8906A") + sh("M-28 0 v-11 h18 v11Z M10 0 v-7 h18 v7Z", "#E8D7B0", "#A8906A") + tx(0, -6, "1", 11, "#B88A1C") + tx(-19, -2, "2", 9, "#8A8A8A") + tx(19, -1, "3", 8, "#A8744A"),
  umbrella: o => ln("M0 -26 v24 q0 4 -4 4", "#6B4424", 1.8) + sh("M-20 -24 q20 -22 40 0 q-5 -3 -10 0 q-5 -3 -10 0 q-5 -3 -10 0 q-5 -3 -10 0Z", o.c || "#E86A7A", "#B8404F"),
  cage: () => ln("M-14 0 v-22 M-7 0 v-26 M0 0 v-28 M7 0 v-26 M14 0 v-22 M-14 -22 q14 -14 28 0", "#B9A06A", 1.4) + ln("M-16 0 h32", "#8A7440", 2.4) + ln("M14 -22 l12 4 v18", "#B9A06A", 1.4) + ci(0, -30, 2, "#B9A06A", "#8A7440", 1),
  pot: () => ln("M-6 -24 q-3 -4 0 -8 M0 -26 q-3 -4 0 -8 M6 -24 q-3 -4 0 -8", "#C7D6DF", 1.6) + sh("M-16 -18 h32 v14 q0 4 -4 4 h-24 q-4 0 -4 -4Z", "#6F7A85", "#434B53") + sh("M-18 -20 h36 v3 h-36Z", "#8A96A2", "#434B53", 1) + ln("M-18 -14 h-4 M18 -14 h4", "#434B53", 2),
  cap: o => sh("M-14 0 q2 -14 14 -14 q12 0 14 14Z", o.c || "#5E8C44", "#3E6130") + sh("M-18 0 h36 v2 h-36Z", o.c || "#5E8C44", "#3E6130", 1) + (o.feather !== false ? sh("M6 -10 q10 -14 22 -18 q-6 10 -20 20Z", "#D9534F", "#A8322F", 1) + ln("M8 -8 q8 -10 18 -18", "#A8322F", .8) : ""),
  bonnet: () => sh("M-16 0 q-2 -20 16 -20 q18 0 16 20 q-16 -6 -32 0Z", "#F2D27A", "#C9A140") + ln("M-14 -2 q14 -5 28 0", "#E86A7A", 2.4) + sh("M14 -2 l6 6 l-6 -1Z", "#E86A7A", "#B8404F", .8),
  pants: () => sh("M-12 -26 h24 l2 26 h-10 l-4 -18 l-4 18 h-10Z", "#6F93C9", "#44669A") + ln("M-12 -22 h24", "#44669A", 1.2),
  teacup: o => sh("M-8 -10 h16 q0 10 -8 10 q-8 0 -8 -10Z", o.c || "#FFFFFF", "#8AA6C2", 1.1) + ln("M8 -8 q5 0 4 4 q-1 2 -5 2", "#8AA6C2", 1.2) + el(0, 0.5, 11, 2, o.c || "#FFFFFF", "#8AA6C2", 0, 1) + ci0(0, -5, 1.4, "#7FB3E0"),
  plate: () => el(0, 0, 14, 4, "#FFFFFF", "#9AA6AD", 0, 1.2) + el0(0, 0, 9, 2.4, "#EEF2F4") + ln("M18 2 v-14 M16 -12 v4 q2 2 4 0 v-4", "#9AA6AD", 1.3),
  halo: () => el(0, 0, 10, 3, "none", "#F2C14E", 0, 2.4),
  note: o => ln("M3 0 v-14 l6 2", o.c || "#3F4A44", 1.4) + el0(0, 0, 3.4, 2.6, o.c || "#3F4A44", ` transform="rotate(-20)"`),
  zzz: o => tx(0, 0, "z", 10, "#6F93C9") + tx(7, -8, "z", 12, "#6F93C9") + tx(15, -18, "Z", 14, "#6F93C9"),
  magnifier: () => ln("M6 6 l10 10", "#6B4424", 3.4) + ci(0, 0, 8, "#DDF0FB", "#6F7A85", 2, ` fill-opacity=".6"`),
  drop: o => sh("M0 -6 q4 5 0 7 q-4 -2 0 -7Z", o.c || "#7FB6E3", "#5E97BF", .8),
  snow: () => ln("M0 -5 v10 M-4.3 -2.5 l8.6 5 M-4.3 2.5 l8.6 -5", "#9CC3E6", 1.3),
  wheel: () => ci(0, -22, 20, "none", "#9AA6AD", 2.4, "") + ln("M0 -42 v40 M-20 -22 h40 M-14 -36 l28 28 M14 -36 l-28 28", "#C7D0D6", 1) + ln("M-10 0 l10 -22 l10 22", "#6F7A85", 2.4),
  hive: () => ln("M0 -34 v-4", "#6B4424", 1.6) + el(0, -8, 12, 7, "#F2C94E", "#B88A1C") + el(0, -17, 10, 6, "#F2C94E", "#B88A1C") + el(0, -25, 7, 5, "#F2C94E", "#B88A1C") + el0(0, -9, 3, 2.4, "#6B4A1A"),
  banana: () => sh("M-8 -4 q8 8 16 -6 q-2 0 -2 -2 q-6 10 -14 6Z", "#F7D154", "#C9A12A", 1.1),
  acorn: () => el(0, -4, 4, 5, "#C4803A", "#84461C", 0, 1) + sh("M-5 -7 q5 -5 10 0Z", "#8A5A3A", "#5A3820", 1) + ln("M0 -10 v-2", "#5A3820", 1.2),
  log: () => sh("M-16 0 v-10 h32 v10Z", "#A8744A", "#6B4424") + el(16, -5, 3, 5, "#E8C48E", "#6B4424", 0, 1.2) + ln("M-10 -6 h10 M2 -3 h8", "#6B4424", .9),
  bow: () => sh("M0 0 l-8 -5 v10Z M0 0 l8 -5 v10Z", "#D9534F", "#A8322F", 1) + ci(0, 0, 2.2, "#E86A7A", "#A8322F", 1) + ln("M-1 1 l-3 7 M1 1 l3 7", "#D9534F", 1.6),
  tin: () => el(0, -3, 22, 8, "#C3CCD4", "#7D8A96") + el0(0, -4, 18, 6, "#9FB3C2") + [-10, -4, 2, 8].map(x => el(x, -4, 3, 6, "#B8C6D2", "#6F8196", 0, .9) + ci0(x, -8, .8, INK)).join("") + ln("M20 -4 q10 -4 12 -12", "#7D8A96", 1.6),
  rug: o => sh("M-26 0 q0 -14 6 -16 h40 q6 2 6 16Z", o.c || "#E88B6A", "#B25A3A") + ln("M-20 -12 h40 M-22 -6 h44", "#F7D154", 1.4) + ln("M-26 0 l-2 3 M-20 0 l-1 3 M20 0 l1 3 M26 0 l2 3", "#B25A3A", 1),
  chair: () => sh("M-18 0 v-8 h36 v8Z", "#8FA8C9", "#5E7598") + sh("M-14 -8 v-22 q14 -6 28 0 v22Z", "#9FB8D9", "#5E7598") + sh("M-20 -18 h7 v12 h-7Z M13 -18 h7 v12 h-7Z", "#8FA8C9", "#5E7598", 1.2),
  lamp: () => ln("M0 0 v-30", "#6F7A85", 1.6) + sh("M-8 -30 l3 -10 h10 l3 10Z", "#F7D154", "#C9A12A", 1.1) + el(0, 0, 7, 2, "#6F7A85"),
  sign: o => ln("M0 0 v-18", "#8A5A3A", 2.4) + sh(`M-${o.w || 16} -30 h${(o.w || 16) * 2} v12 h-${(o.w || 16) * 2}Z`, "#E8C48E", "#9A7440", 1.2) + tx(0, -21, o.t || "", o.size || 10, "#5A3820"),
  steps: () => sh("M-30 0 v-10 h20 v-10 h20 v-10 h20 v30Z", "#E8D7B0", "#A8906A"),
  target: () => ci(0, 0, 14, "#FFFFFF", "#D9534F", 2.4) + ci(0, 0, 8.5, "none", "#D9534F", 2.4) + ci0(0, 0, 3, "#D9534F"),
  dash: o => ln(o.d, o.c || "#6F93C9", 1.4, ` stroke-dasharray="3 4"`),
  bacon: () => sh("M-14 0 q4 -6 8 0 q4 6 8 0 q4 -6 8 0 v5 q-4 -6 -8 0 q-4 6 -8 0 q-4 -6 -8 0Z", "#E8826A", "#A8483A", 1) + ln("M-13 2.5 q4 -5 8 0 q4 5 8 0 q4 -5 8 0", "#F7D7C4", 1.1),
  tophat: () => sh("M-8 0 v-14 h16 v14Z", "#2E2A2C", "#1A1618") + sh("M-12 0 h24 v2 h-24Z", "#2E2A2C", "#1A1618", 1) + sh("M-8 -4 h16 v2.4 h-16Z", "#D9534F"),
  glasses: () => ci0(-5.5, 0, 4.2, "none", ` stroke="#3A3228" stroke-width="1.2"`) + ci0(5.5, 0, 4.2, "none", ` stroke="#3A3228" stroke-width="1.2"`) + ln("M-1.3 0 h2.6", "#3A3228", 1.2),
  book: () => sh("M0 0 q-8 -4 -16 0 v-14 q8 -4 16 0Z", "#FFFFFF", "#8AA6C2", 1.1) + sh("M0 0 q8 -4 16 0 v-14 q-8 -4 -16 0Z", "#FFFFFF", "#8AA6C2", 1.1) + ln("M-12 -10 h8 M-12 -7 h8 M4 -10 h8 M4 -7 h8", "#C7D0D6", 1),
  chefhat: () => sh("M-7 0 v-6 h14 v6Z", "#FFFFFF", "#B9C3CA", 1) + ci(-5, -9, 5, "#FFFFFF", "#B9C3CA", 1) + ci(5, -9, 5, "#FFFFFF", "#B9C3CA", 1) + ci(0, -12, 6, "#FFFFFF", "#B9C3CA", 1),
  nightcap: () => sh("M-10 0 q2 -12 18 -14 q-4 6 -2 14Z", "#7FA7D9", "#4E77AE", 1.1) + ci(9, -14, 2.6, "#FFFFFF", "#B9C3CA", 1),
  scone: () => sh("M-8 0 q-1 -9 8 -9 q9 0 8 9Z", "#E8C48E", "#A8864A", 1.1) + ci0(-3, -4, 1, "#8A3A3A") + ci0(3, -5, 1, "#8A3A3A"),
  lectern: () => sh("M-8 0 v-18 h16 v18Z", "#A8744A", "#6B4424") + sh("M-12 -18 h24 l-3 -5 h-18Z", "#C4905A", "#6B4424", 1.2),
  tub: () => ci(-10, -16, 5, "#FFFFFF", "#C7D6DF", 1) + ci(0, -19, 6, "#FFFFFF", "#C7D6DF", 1) + ci(11, -16, 5, "#FFFFFF", "#C7D6DF", 1) + sh("M-22 -14 h44 v6 q0 8 -10 8 h-24 q-10 0 -10 -8Z", "#FFFFFF", "#9AA6AD") + ln("M-16 0 l-2 4 M16 0 l2 4", "#9AA6AD", 2),
  bubbles: () => ci(0, 0, 2.6, "#E3F3FC", "#9CC3E6", .9) + ci(6, -6, 1.8, "#E3F3FC", "#9CC3E6", .9) + ci(-5, -9, 2.2, "#E3F3FC", "#9CC3E6", .9),
  puddle: () => el(0, 0, 22, 5, "#9A7A5A", "#6B4F34"),
  sock: () => sh("M-3 -14 h8 v10 q0 4 -4 4 h-7 q-3 0 -3 -3 q0 -3 3 -3 h3Z", "#E8D7B0", "#A8906A", 1.1) + ln("M-3 -11 h8", "#D9534F", 1.4),
  motion: () => ln("M0 -6 h-10 M2 0 h-14 M0 6 h-10", "#9AA6AD", 1.3),
  bang: o => tx(0, 0, o.t || "!", o.size || 18, o.c || "#D9534F"),
  gift: () => sh("M-10 0 v-14 h20 v14Z", "#7FB3E0", "#3F6F9E") + ln("M0 0 v-14 M-10 -8 h20", "#E86A7A", 2.2) + G(0, -16, .7, PROP.bow()),
  bone: () => sh("M-10 -2 h20 v4 h-20Z", "#FFF8EC", "#C9B89A", 1.1) + ci(-11, -2.4, 2.6, "#FFF8EC", "#C9B89A", 1.1) + ci(-11, 2.4, 2.6, "#FFF8EC", "#C9B89A", 1.1) + ci(11, -2.4, 2.6, "#FFF8EC", "#C9B89A", 1.1) + ci(11, 2.4, 2.6, "#FFF8EC", "#C9B89A", 1.1) + el0(0, 0, 10, 1.8, "#FFF8EC"),
  sweat: () => sh("M0 -6 q3 4 0 6 q-3 -2 0 -6Z", "#9CC9EC", "#5E97BF", .8),
  cowboy: () => sh("M-16 0 q16 -6 32 0 q-4 3 -16 3 q-12 0 -16 -3Z", "#B98A5A", "#7A5530", 1.1) + sh("M-8 -1 q-1 -10 8 -10 q9 0 8 10Z", "#B98A5A", "#7A5530", 1.1),
  cushion: () => sh("M-22 0 q-4 -10 4 -12 h36 q8 2 4 12Z", "#B79AE0", "#7E5FB0") + ci0(-22, -5, 2, "#F7C948") + ci0(22, -5, 2, "#F7C948"),
  wave: o => ln("M-30 0 q7.5 -6 15 0 t15 0 t15 0 t15 0", o.c || "#5E97BF", 1.6),
  rope: () => ln("M0 0 q10 -4 18 2 q6 4 14 0", "#C99B5E", 2.2),
  shell: o => sh("M-6 0 l2 -6 l4 3 l4 -4 l2 7Z", "#FFF8EC", "#C9B89A", 1.1),
  mud: () => el(0, 0, 18, 4, "#9A7A5A", "#6B4F34"),
};

/* ---------- backgrounds ---------- */
const BG = {
  sky: () => `<rect width="160" height="140" fill="#D6E9F2"/>` + el(80, 138, 120, 34, "#BCD9A0", "none"),
  meadow: () => `<rect width="160" height="140" fill="#E2EFE0"/>` + el(80, 140, 130, 36, "#B5D493", "none"),
  night: () => `<rect width="160" height="140" fill="#34466B"/>` + [[18, 20], [46, 12], [120, 16], [146, 34], [70, 28], [100, 40]].map(([x, y]) => ci0(x, y, 1.2, "#F7E3A0")).join("") + el(80, 142, 130, 32, "#4E6B5A", "none"),
  dusk: () => `<rect width="160" height="140" fill="#F7D9B8"/><rect y="0" width="160" height="50" fill="#F2BFA0" opacity=".6"/>` + el(80, 140, 130, 34, "#B5C98A", "none"),
  sea: () => `<rect width="160" height="140" fill="#D6EEF7"/><rect y="70" width="160" height="70" fill="#8EC3E6"/>` + ln("M0 70 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0", "#5E97BF", 1.6),
  under: () => `<rect width="160" height="140" fill="#9FD0EA"/>` + el(80, 142, 120, 18, "#E8D7B0", "none") + ci0(20, 30, 2, "#E3F3FC") + ci0(26, 20, 1.4, "#E3F3FC") + ci0(140, 50, 2, "#E3F3FC"),
  room: () => `<rect width="160" height="140" fill="#F4E6D2"/><rect y="104" width="160" height="36" fill="#D9B98A"/>` + ln("M0 104 h160", "#B8905A", 1.4) + [20, 60, 100, 140].map(x => ln(`M${x} 10 v88`, "#EBD8BC", 5)).join(""),
  shop: () => `<rect width="160" height="140" fill="#F3E9DA"/><rect y="106" width="160" height="34" fill="#C9A77A"/>` + sh("M10 50 h140 v4 h-140Z M10 80 h140 v4 h-140Z", "#B98A5A", "#7A5530", 1),
  plain: () => `<rect width="160" height="140" fill="#FBF4E6"/>` + el(80, 124, 60, 8, "#E8DCC4", "none"),
  rain: () => `<rect width="160" height="140" fill="#C9D6DF"/>` + el(80, 140, 130, 34, "#A9C59A", "none"),
};

/* ---------- placement helpers ---------- */
const fx = (inner, s) => s > 1.9 ? inner.split("url(#wc)").join("url(#wc3)") : s > 1.3 ? inner.split("url(#wc)").join("url(#wc2)") : inner;
function A(t, x, y, s = 1, o = {}) {
  let inner;
  if (QUAD[t]) inner = quad(t, o);
  else if (BIRD[t]) inner = bird(t, o);
  else if (t === "owl") inner = owl(o);
  else if (CRIT[t]) inner = CRIT[t](o);
  else throw new Error("no animal " + t);
  return G(x, y, s, fx(inner, s), o.flip, o.rot);
}
const P = (t, x, y, s = 1, o = {}) => { if (!PROP[t]) throw new Error("no prop " + t); return G(x, y, s, fx(PROP[t](o), s), o.flip, o.rot); };
const T = (x, y, t, size, fill) => tx(x, y, t, size, fill);
const shadow = (x, y, rx = 18) => el0(x, y, rx, rx * .18, "#5E6B4A", ` opacity=".18"`);

/* ---------- one scene per phrase ---------- */
const S = {
  "WHEN PIGS FLY": () => BG.sky() + P("cloud", 30, 30, 1.1) + P("cloud", 130, 48, .9) + P("cloud", 60, 116, 1.3) + A("pig", 84, 88, 1.25, { wings: 1, mood: "happy2", rot: -8 }) + P("motion", 50, 70, 1),
  "HOLD YOUR HORSES": () => BG.meadow() + P("sign", 40, 118, 1.1, { t: "WHOA!", w: 20, size: 11 }) + shadow(100, 119, 22) + A("horse", 100, 118, 1.4, { mood: "shock" }) + P("fence", 140, 118, .7),
  "LET THE CAT OUT OF THE BAG": () => BG.room() + shadow(82, 121, 24) + P("sack", 82, 120, 1.5) + A("cat", 84, 86, 1.1, { mood: "happy2" }) + P("bang", 36, 40, 1, { t: "surprise!", size: 14, c: "#B86E2B" }),
  "THE EARLY BIRD CATCHES THE WORM": () => BG.dusk() + P("sun", 36, 96, 1.3, { face: "happy" }) + A("bird", 92, 116, 1.6) + A("worm", 128, 112, 1.1) + P("grass", 70, 120) + P("grass", 140, 122),
  "RAINING CATS AND DOGS": () => BG.rain() + P("cloud", 50, 26, 1.3, { c: "#E8EDF1", d: "#9AA6AD", rain: 1 }) + P("cloud", 116, 22, 1.1, { c: "#E8EDF1", d: "#9AA6AD", rain: 1 }) + A("cat", 44, 78, .55, { rot: -20, mood: "shock" }) + A("dog", 118, 72, .55, { rot: 18, mood: "happy2" }) + P("umbrella", 82, 120, 1.3) + A("chick", 82, 124, .9),
  "BUSY AS A BEE": () => BG.meadow() + P("flower", 30, 122, 1.4) + P("flower", 60, 124, 1.1, { c: "#F7D154", d: "#C9A12A" }) + P("flower", 128, 122, 1.4, { c: "#B79AE0", d: "#7E5FB0" }) + A("bee", 88, 64, 1.8) + P("dash", 0, 0, 1, { d: "M30 98 q20 -40 44 -34 M104 70 q20 -2 24 30" }) + A("bee", 130, 84, 1, { rot: 10 }),
  "THE LION'S SHARE": () => BG.plain() + shadow(62, 123, 24) + A("lion", 62, 122, 1.35, { mood: "happy2" }) + P("pie", 112, 124, 1.3) + A("mouse", 144, 126, .5, { mood: "sad" }) + P("crumb", 132, 126, 1),
  "BARKING UP THE WRONG TREE": () => BG.sky() + P("tree", 70, 120, 1.25) + P("tree", 132, 120, 1.1) + A("raccoon", 132, 72, .55, { mood: "wink" }) + A("dog", 32, 124, 1, { tongue: 1 }) + P("bubble", 40, 54, 1, { t: "woof!", w: 30 }),
  "A LITTLE BIRD TOLD ME": () => BG.meadow() + P("tree", 116, 122, 1.4) + A("bird", 64, 104, 1.4, { mood: "wink" }) + P("bubble", 44, 60, 1, { t: "psst…", w: 32 }) + A("chick", 34, 124, 1.1, { flip: 1, mood: "shock" }),
  "STRAIGHT FROM THE HORSE'S MOUTH": () => BG.meadow() + shadow(64, 121, 22) + A("horse", 64, 120, 1.4, { mood: "happy" }) + P("bubble", 118, 50, 1.1, { t: "it's true!", w: 40 }),
  "DON'T COUNT YOUR CHICKENS": () => BG.plain() + P("nest", 80, 110, 1.9, { eggs: ["#FFF8EC", "#FFF8EC", "#FFF8EC"] }) + A("chick", 80, 86, .9, { mood: "happy2" }) + T(40, 44, "1?", 16, "#9A7440") + T(120, 40, "2?", 16, "#9A7440"),
  "THE ELEPHANT IN THE ROOM": () => BG.room() + P("lamp", 20, 118, 1) + P("chair", 136, 118, 1) + shadow(80, 121, 26) + A("elephant", 80, 120, 1.45, { mood: "wink" }),
  "GET YOUR DUCKS IN A ROW": () => BG.meadow() + P("pond", 80, 126, 1.4, { rx: 50 }) + A("duck", 38, 112, 1.1) + A("duckling", 74, 114, .95) + A("duckling", 102, 114, .95) + A("duckling", 130, 114, .95),
  "LIKE WATER OFF A DUCK'S BACK": () => BG.rain() + P("cloud", 80, 26, 1.4, { c: "#E8EDF1", d: "#9AA6AD", rain: 1 }) + [60, 72, 90, 104].map((x, i) => P("drop", x, 60 + (i % 2) * 8)).join("") + P("pond", 80, 124, 1.2) + A("duck", 80, 118, 1.6, { mood: "happy2" }),
  "PUT THE CART BEFORE THE HORSE": () => BG.meadow() + P("cart", 44, 120, 1.2) + shadow(112, 121, 18) + A("horse", 112, 120, 1.15, { mood: "worried" }) + P("bang", 140, 60, 1, { t: "?", size: 22, c: "#7A4B22" }),
  "THE BEE'S KNEES": () => BG.meadow() + P("flower", 124, 124, 1.5, { c: "#F7D154", d: "#C9A12A" }) + A("bee", 70, 70, 2.2, { rot: -6 }) + P("star", 40, 36, 1.2) + P("star", 110, 30, .9) + P("star", 124, 64, 1),
  "TAKE THE BULL BY THE HORNS": () => BG.meadow() + P("fence", 30, 118, .9) + shadow(92, 121, 24) + A("bull", 92, 120, 1.5, { mood: "fierce" }) + A("chick", 132, 124, .9, { flip: 1, mood: "fierce" }),
  "SMELL A RAT": () => BG.room() + A("cat", 50, 122, 1.2, { mood: "fierce" }) + A("rat", 120, 122, .8, { mood: "worried", flip: 1 }) + P("dash", 0, 0, 1, { d: "M64 84 q12 -8 20 0 t20 0", c: "#B86E2B" }),
  "GO THE WHOLE HOG": () => BG.meadow() + P("mud", 80, 124, 2) + shadow(80, 121, 26) + A("pig", 80, 120, 1.6, { mood: "happy2" }) + P("star", 36, 40) + P("star", 124, 36),
  "A PIG IN A POKE": () => BG.plain() + P("sack", 80, 122, 1.8) + ln("M100 92 q8 -2 6 -8 q-2 -4 -5 0", "#D98396", 1.8) + P("bang", 120, 50, 1, { t: "?", size: 22, c: "#9A7440" }) + A("chick", 36, 124, .9, { mood: "worried" }),
  "NIGHT OWL": () => BG.night() + P("moon", 124, 32, 1.4) + P("tree", 64, 132, 1.8, { c: "#5E8C6E" }) + A("owl", 64, 74, 1.2, { mood: "happy" }),
  "SLY AS A FOX": () => BG.meadow() + P("grass", 30, 122) + P("grass", 136, 124) + shadow(80, 121, 22) + A("fox", 80, 120, 1.5, { mood: "wink" }),
  "CURIOSITY KILLED THE CAT": () => BG.room() + P("box", 88, 120, 1.6) + A("cat", 90, 92, 1, { mood: "shock" }) + P("bang", 130, 60, 1, { t: "?", size: 20, c: "#B86E2B" }),
  "TILL THE COWS COME HOME": () => BG.dusk() + P("sun", 136, 70, 1.2) + P("barn", 128, 112, 1) + A("cow", 44, 122, 1.15, { mood: "sleep" }) + A("cow", 84, 118, .85, { mood: "happy2" }),
  "MONKEY BUSINESS": () => BG.meadow() + P("tree", 126, 122, 1.4) + shadow(64, 121, 20) + A("monkey", 64, 120, 1.4, { mood: "wink" }) + P("banana", 30, 116, 1.4) + P("banana", 104, 116, 1.2, { flip: 1 }),
  "A FISH OUT OF WATER": () => BG.sky() + P("pond", 36, 126, 1, { rx: 26 }) + A("fish", 100, 108, 1.5, { mood: "sad" }) + P("sweat", 124, 90, 1.2) + P("sun", 136, 26, .9),
  "THE WORLD IS YOUR OYSTER": () => BG.under() + A("clam", 80, 118, 2, { open: 1 }) + P("star", 80, 70, 1, { c: "#FFFFFF" }) + P("shell", 30, 126) + P("shell", 132, 128),
  "HAPPY AS A CLAM": () => BG.under() + A("clam", 80, 116, 2.1, { mood: "happy2" }) + ci0(40, 60, 3, "#E3F3FC") + ci0(46, 48, 2, "#E3F3FC") + P("shell", 130, 128),
  "EVERY DOG HAS ITS DAY": () => BG.sky() + P("sun", 128, 32, 1.1, { face: "happy" }) + P("podium", 76, 124, 1.3) + A("dog", 76, 101, 1.05, { tongue: 1, mood: "happy2" }) + P("crown", 76, 56, 1),
  "A HORSE OF A DIFFERENT COLOR": () => BG.meadow() + A("horse", 44, 120, .9, {}) + A("horse", 116, 120, .9, {}) + shadow(80, 122, 22) + A("horse", 80, 122, 1.3, { c: "#B79AE0", mane: "#F29BB8", mood: "happy2" }),
  "DARK HORSE": () => BG.dusk() + P("fence", 30, 120, .8) + P("fence", 130, 120, .8) + shadow(80, 121, 20) + A("horse", 80, 120, 1.4, { c: "#4A3A34", mane: "#1E1614", mood: "wink" }) + P("star", 110, 50, 1.3),
  "WILD GOOSE CHASE": () => BG.meadow() + A("goose", 110, 118, 1.1, { mood: "happy2" }) + P("motion", 88, 96, 1) + A("dog", 44, 122, .9, { tongue: 1 }) + P("motion", 26, 100, 1),
  "AS THE CROW FLIES": () => BG.sky() + P("house", 26, 122, .9) + P("tree", 134, 122, 1) + P("dash", 0, 0, 1, { d: "M26 76 L134 60" }) + A("crow", 80, 76, 1.1, { rot: -8 }),
  "BIRDS OF A FEATHER": () => BG.meadow() + ln("M10 96 h140", "#8A5A3A", 2.4) + A("bird", 40, 95, 1.1, { mood: "happy2" }) + A("bird", 78, 95, 1.1, { mood: "happy2" }) + A("bird", 120, 95, 1.1, { flip: 1, mood: "happy2" }) + P("heart", 80, 50, .9),
  "RULE THE ROOST": () => BG.meadow() + P("barn", 128, 110, 1.1) + P("fence", 40, 120, .8) + A("rooster", 72, 120, 1.5) + P("crown", 86, 70, .9, { rot: 10 }),
  "NEST EGG": () => BG.plain() + P("nest", 80, 112, 2, { eggs: ["#FFF8EC", "#F7C948", "#FFF8EC"] }) + P("coins", 30, 124, .8) + P("star", 90, 64, .9),
  "MAKE A BEELINE": () => BG.meadow() + P("tree", 132, 122, 1.2) + P("hive", 132, 86, .9) + P("flower", 28, 124, 1.2) + P("dash", 0, 0, 1, { d: "M36 94 L116 70" }) + A("bee", 76, 82, 1.3, { rot: -14 }),
  "OPEN A CAN OF WORMS": () => BG.plain() + P("can", 80, 122, 1.8) + A("worm", 70, 80, 1, { rot: -60 }) + A("worm", 88, 76, 1, { rot: -110 }) + A("worm", 104, 88, .9, { rot: -20 }) + A("worm", 52, 96, .9, { rot: 200 }),
  "A WOLF IN SHEEP'S CLOTHING": () => BG.meadow() + A("sheep", 36, 120, .8) + A("sheep", 128, 120, .8) + shadow(82, 122, 20) + A("wolf", 82, 122, 1.3, { mood: "wink", extra: [0, 1, 2, 3, 4, 5, 6].map(i => { const a = Math.PI + i / 6 * Math.PI; return ci(n(Math.cos(a) * 14), n(-40 + Math.sin(a) * 11), 5.6, "#FFFFFF", "#A89F94", 1.2); }).join("") }),
  "THE BLACK SHEEP OF THE FAMILY": () => BG.meadow() + A("sheep", 32, 120, .85) + A("sheep", 130, 120, .85) + A("sheep", 60, 116, .7) + A("sheep", 104, 116, .7) + A("sheep", 82, 124, 1.15, { c: "#4A4543", face: "#2E2826", ink: "#FFFFFF", mood: "wink" }),
  "STUBBORN AS A MULE": () => BG.meadow() + P("rope", 36, 100, 1.1) + shadow(96, 121, 20) + A("mule", 96, 120, 1.4, { mood: "fierce" }) + A("chick", 30, 124, .9, { mood: "worried" }),
  "SNUG AS A BUG IN A RUG": () => BG.room() + P("rug", 80, 120, 1.8) + el(104, 96, 12, 6, "#FFFFFF", "#B9C3CA", 0, 1.2) + A("ladybug", 92, 94, 1.3, { flip: 1 }) + sh("M40 100 q-4 -8 6 -10 h36 q8 2 6 10Z", "#F7D154", "#C9A12A") + ln("M46 94 h32 M44 98 h38", "#E88B6A", 1.4) + P("zzz", 114, 76, .9),
  "COPYCAT": () => BG.room() + A("cat", 52, 120, 1.1, { mood: "happy2" }) + A("cat", 110, 120, 1.1, { c: "#9AA3AD", mood: "happy2", flip: 1 }),
  "TOP DOG": () => BG.sky() + P("podium", 80, 124, 1.5) + A("dog", 80, 97, 1.05, { tongue: 1, mood: "happy2" }) + A("cat", 52, 108, .6, {}) + A("mouse", 108, 112, .6),
  "PUPPY LOVE": () => BG.meadow() + A("dog", 58, 122, 1.05, { mood: "happy2" }) + A("dog", 104, 122, 1.05, { c: "#F2E1C4", flip: 1, mood: "happy2" }) + P("heart", 81, 58, 1.2) + P("heart", 104, 42, .6),
  "EAT LIKE A HORSE": () => BG.meadow() + P("hay", 118, 122, 1.5) + shadow(56, 121, 20) + A("horse", 56, 120, 1.35, { mood: "happy2" }) + P("hay", 136, 124, .8),
  "CHICKEN OUT": () => BG.meadow() + P("sign", 36, 120, .9, { t: "JUMP", w: 16 }) + A("chick", 108, 120, 1.5, { flip: 0, mood: "shock" }) + P("motion", 84, 104, 1) + P("sweat", 124, 82),
  "SITTING DUCK": () => BG.sky() + P("pond", 80, 124, 1.4, { rx: 40 }) + P("target", 80, 64, 1.3) + A("duck", 80, 120, 1.4, { mood: "worried" }),
  "GOOSEBUMPS": () => BG.sky() + P("snow", 36, 38) + P("snow", 120, 30) + P("snow", 136, 70) + P("snow", 50, 76) + A("goose", 80, 120, 1.5, { mood: "shock" }),
  "MEMORY LIKE AN ELEPHANT": () => BG.plain() + shadow(62, 121, 24) + A("elephant", 62, 120, 1.35, {}) + P("thought", 118, 42, 1.3, { inner: "" }) + A("mouse", 118, 42, .35),
  "BUTTERFLIES IN MY STOMACH": () => BG.meadow() + A("chick", 80, 122, 1.4, { mood: "worried" }) + A("butterfly", 40, 60, 1.1) + A("butterfly", 120, 48, .9, { c: "#9FD3F0", d: "#4E8CB8" }) + A("butterfly", 100, 88, .7, { c: "#F7D154", c2: "#F29BB8", d: "#C9A12A" }),
  "LOOK WHAT THE CAT DRAGGED IN": () => BG.room() + A("cat", 70, 122, 1.2, { mood: "happy2" }) + P("sock", 108, 124, 1.4) + P("mud", 110, 126, .6),
  "TALK TURKEY": () => BG.dusk() + A("turkey", 64, 120, 1.5) + P("bubble", 120, 46, 1, { t: "let's deal", w: 42 }),
  "LIVING HIGH ON THE HOG": () => BG.room() + P("cushion", 80, 118, 1.8) + A("pig", 80, 110, 1.3, { mood: "happy2" }) + P("crown", 80, 52, .9),
  "MAD AS A WET HEN": () => BG.rain() + P("cloud", 80, 30, 1.2, { c: "#E8EDF1", d: "#9AA6AD", rain: 1 }) + A("hen", 76, 120, 1.7, { mood: "fierce" }) + P("puddle", 80, 124, 1.2),
  "COUNT SHEEP": () => BG.night() + P("moon", 130, 30, 1.2) + P("fence", 80, 122, 1) + A("sheep", 76, 86, .8, { mood: "happy2", rot: -10 }) + A("sheep", 132, 124, .7, { mood: "sleep" }) + P("zzz", 26, 52, 1),
  "KILL TWO BIRDS WITH ONE STONE": () => BG.meadow() + P("scone", 80, 120, 1.8) + A("bird", 46, 120, 1.2, { mood: "happy2" }) + A("bird", 114, 120, 1.2, { flip: 1, mood: "happy2", c: "#F29BB8" }) + P("heart", 80, 70, .7),
  "THE CAT'S PAJAMAS": () => BG.night() + P("moon", 128, 30, 1) + A("cat", 80, 122, 1.4, { pj: 1, mood: "happy2", extra: G(3, -48, 1, PROP.nightcap({})) }),
  "CRY WOLF": () => BG.meadow() + A("sheep", 116, 120, 1, { mood: "shock" }) + A("sheep", 142, 122, .7, { mood: "shock" }) + A("wolf", 50, 120, 1.2, { mood: "wink" }) + P("bubble", 44, 50, 1, { t: "WOLF!", w: 36, size: 13 }),
  "EAGER BEAVER": () => BG.meadow() + P("pond", 120, 128, 1, { rx: 40 }) + P("log", 116, 118, 1.2) + shadow(58, 121, 20) + A("beaver", 58, 120, 1.35, { mood: "happy2" }),
  "PECKING ORDER": () => BG.meadow() + P("steps", 90, 124, 1.8) + A("hen", 50, 104, .9) + A("hen", 86, 86, .9) + A("rooster", 122, 70, 1) + A("chick", 26, 124, .8),
  "SCAREDY CAT": () => BG.room() + A("cat", 70, 104, 1.3, { mood: "shock", c: "#9AA3AD" }) + P("motion", 50, 118, 1, { rot: 90 }) + A("mouse", 128, 122, .6, { mood: "happy2", flip: 1 }) + P("bang", 108, 50, 1, { t: "!", size: 22 }),
  "CAT GOT YOUR TONGUE": () => BG.room() + A("cat", 60, 122, 1.35, { mood: "wink" }) + P("bubble", 116, 56, 1, { t: "…", w: 28, size: 18 }),
  "RAT RACE": () => BG.plain() + P("wheel", 80, 124, 1.6) + A("rat", 80, 112, .7, { mood: "worried" }) + P("sweat", 98, 70),
  "DOG DAYS OF SUMMER": () => BG.dusk() + P("sun", 124, 34, 1.4, { face: "happy" }) + P("star", 36, 26, 1.3) + A("dog", 70, 122, 1.25, { tongue: 1, mood: "sleep" }) + P("sweat", 90, 78),
  "IN THE DOGHOUSE": () => BG.sky() + P("doghouse", 86, 122, 2.2) + A("dog", 86, 122, .55, { mood: "sad" }) + P("tree", 22, 124, .8),
  "LET SLEEPING DOGS LIE": () => BG.room() + P("rug", 80, 122, 1.6, { c: "#8FA8C9" }) + A("dog", 80, 118, 1.2, { mood: "sleep" }) + P("zzz", 104, 70, 1),
  "THE TAIL WAGGING THE DOG": () => BG.meadow() + A("dog", 62, 120, 1.1, { mood: "shock", extra: thick("M11 -12 q26 -6 30 -34", "#DDA968", "#9A6B35", 8) }) + P("motion", 122, 60, 1, { rot: 90 }),
  "DOG-EAT-DOG": () => BG.meadow() + A("dog", 44, 122, 1, { mood: "fierce" }) + A("dog", 116, 122, 1, { mood: "fierce", flip: 1, c: "#8A6A4A" }) + P("rope", 64, 96, 1.3) + P("bone", 80, 60, 1.2),
  "CROCODILE TEARS": () => BG.sky() + P("pond", 80, 126, 1.4, { rx: 50 }) + A("croc", 80, 122, 1.4, { mood: "cry" }),
  "EYES LIKE A HAWK": () => BG.sky() + P("tree", 40, 124, 1.3) + A("hawk", 44, 86, 1.2, { mood: "fierce" }) + A("mouse", 132, 124, .45, { mood: "shock", flip: 1 }) + P("dash", 0, 0, 1, { d: "M64 64 L128 108" }),
  "A BIRD'S-EYE VIEW": () => BG.sky() + el(80, 130, 90, 26, "#A9C98A", "#7FA66A") + P("house", 50, 122, .5) + P("barn", 104, 124, .5) + P("tree", 76, 128, .4) + A("bird", 80, 50, 1.3, { mood: "happy2", rot: -6 }),
  "FREE AS A BIRD": () => BG.sky() + P("cage", 44, 120, 1.3) + A("bird", 110, 60, 1.3, { mood: "happy2", rot: -10 }) + P("note", 136, 36) + P("cloud", 130, 100, .7),
  "EAT CROW": () => BG.plain() + P("plate", 110, 122, 1.4) + A("crow", 60, 122, 1.35, { mood: "worried" }),
  "A FEATHER IN YOUR CAP": () => BG.plain() + P("cap", 80, 108, 2.2) + P("star", 36, 50) + P("star", 124, 48, .8),
  "RUFFLE SOME FEATHERS": () => BG.meadow() + A("hen", 76, 120, 1.6, { mood: "fierce" }) + [[40, 60, -20], [120, 50, 30], [130, 84, 60], [34, 90, -50]].map(([x, y, r]) => G(x, y, 1, sh("M0 0 q4 -10 0 -16 q-4 6 0 16Z", "#FFFFFF", "#C9B89A", 1), 0, r)).join(""),
  "MOTHER HEN": () => BG.meadow() + A("hen", 72, 120, 1.6, { mood: "happy2" }) + A("chick", 118, 122, .75) + A("chick", 136, 124, .65) + A("chick", 30, 124, .7, { flip: 1 }),
  "YOUR GOOSE IS COOKED": () => BG.room() + P("pot", 112, 120, 1.4) + A("goose", 54, 120, 1.3, { mood: "shock" }) + P("sweat", 70, 64),
  "THE UGLY DUCKLING": () => BG.sky() + P("pond", 80, 126, 1.5, { rx: 50 }) + A("duckling", 50, 120, 1, { c: "#B9B3A8", mood: "sad" }) + A("swan", 110, 122, 1.2, { mood: "happy2" }) + P("heart", 82, 60, .8),
  "LAME DUCK": () => BG.room() + P("lectern", 104, 120, 1.4) + A("duck", 60, 120, 1.3, { mood: "worried", extra: G(9, -31.5, .6, PROP.tophat({}), 0, 10) }),
  "PIGGYBACK": () => BG.meadow() + A("pig", 96, 70, .7, { mood: "happy2" }) + A("pig", 76, 120, 1.3, { mood: "happy2" }),
  "PIGGY BANK": () => BG.plain() + A("pig", 80, 118, 1.5, { c: "#F29BB8", mood: "happy2", extra: sh("M-4 -50 h8 v2 h-8Z", "#6B3A4A") }) + P("coin", 80, 32, 1.1) + P("coins", 32, 124, .7),
  "HOGWASH": () => BG.room() + P("tub", 80, 122, 1.8) + A("pig", 80, 100, .9, { mood: "happy2" }) + P("bubbles", 40, 70) + P("bubbles", 122, 60),
  "SWEAT LIKE A PIG": () => BG.dusk() + P("sun", 128, 32, 1.3) + P("mud", 70, 124, 1.8) + A("pig", 70, 120, 1.4, { mood: "worried" }) + P("sweat", 96, 64) + P("sweat", 46, 70),
  "BRING HOME THE BACON": () => BG.sky() + P("house", 118, 122, 1.4) + A("dog", 52, 122, 1.05, { mood: "happy2" }) + P("bacon", 52, 96, 1.2),
  "HORSE AROUND": () => BG.meadow() + A("horse", 80, 112, 1.3, { mood: "happy2", rot: -12 }) + P("motion", 44, 100, 1) + P("star", 124, 60) + P("grass", 40, 122),
  "CHOMPING AT THE BIT": () => BG.meadow() + P("fence", 120, 120, 1) + shadow(64, 121, 20) + A("horse", 64, 120, 1.4, { mood: "fierce" }) + P("motion", 30, 100, 1),
  "DON'T LOOK A GIFT HORSE IN THE MOUTH": () => BG.meadow() + shadow(80, 121, 22) + A("horse", 80, 120, 1.4, { mood: "happy2", extra: G(0, -4, 1.3, PROP.bow({})) }) + P("gift", 132, 122, 1),
  "YOU CAN LEAD A HORSE TO WATER": () => BG.meadow() + P("trough", 120, 122, 1.4) + shadow(60, 121, 20) + A("horse", 60, 120, 1.3, { mood: "fierce" }),
  "HORSE SENSE": () => BG.plain() + shadow(70, 121, 20) + A("horse", 70, 120, 1.35, { extra: G(0, -37, 1, PROP.glasses({})) }) + P("book", 124, 122, 1.2),
  "CASH COW": () => BG.meadow() + A("cow", 72, 120, 1.4, { mood: "happy2" }) + P("coins", 124, 124, .9) + P("coin", 124, 90) + P("coin", 30, 70),
  "DON'T HAVE A COW": () => BG.meadow() + A("cow", 80, 120, 1.4, { mood: "sleep" }) + P("bubble", 124, 46, .9, { t: "relax", w: 30 }),
  "SACRED COW": () => BG.sky() + A("cow", 80, 120, 1.4, { mood: "happy2" }) + P("halo", 80, 44, 1.3) + P("star", 40, 50) + P("star", 124, 58),
  "A BULL IN A CHINA SHOP": () => BG.shop() + P("teacup", 30, 49, 1) + P("teacup", 130, 49, 1) + P("teacup", 110, 79, 1) + P("teacup", 50, 79, 1) + A("bull", 80, 124, 1.25, { mood: "worried" }),
  "STIR UP A HORNET'S NEST": () => BG.sky() + P("tree", 60, 124, 1.4) + P("hive", 60, 84, .8) + A("hornet", 100, 50, 1) + A("hornet", 112, 76, .8) + A("hornet", 92, 96, .9) + A("raccoon", 138, 124, .8, { mood: "shock", flip: 1 }),
  "A BEE IN YOUR BONNET": () => BG.meadow() + P("bonnet", 80, 106, 2) + A("bee", 96, 60, 1.2) + P("dash", 0, 0, 1, { d: "M56 76 q10 -20 30 -16" }),
  "ANTS IN YOUR PANTS": () => BG.plain() + P("pants", 80, 122, 1.9) + A("ant", 60, 80, 1) + A("ant", 104, 96, 1, { flip: 1 }) + A("ant", 84, 112, .9) + P("motion", 40, 100),
  "A SNAKE IN THE GRASS": () => BG.meadow() + A("snake", 84, 112, 1.6) + P("grass", 40, 124, 1.4) + P("grass", 90, 126, 1.4) + P("grass", 132, 124, 1.4),
  "CLAM UP": () => BG.under() + A("clam", 80, 116, 2.1, { mood: "worried" }) + P("bubble", 126, 50, .9, { t: "…", w: 24, size: 16 }),
  "PLENTY OF FISH IN THE SEA": () => BG.under() + A("fish", 40, 40, .9) + A("fish", 110, 32, .8, { c: "#9FD3F0", d: "#4E8CB8" }) + A("fish", 72, 70, 1, { c: "#F29BB8", d: "#C25E82" }) + A("fish", 124, 92, .9, { c: "#F7D154", d: "#C9A12A" }) + A("fish", 36, 104, .8, { c: "#8BC34A", d: "#557A2A" }) + P("heart", 96, 60, .6),
  "SOMETHING FISHY": () => BG.under() + A("fish", 64, 80, 1.6, { mood: "wink" }) + P("magnifier", 110, 64, 1.4),
  "RED HERRING": () => BG.under() + A("fish", 50, 60, .8, { c: "#9FB3C2", d: "#6F8196" }) + A("fish", 116, 44, .8, { c: "#9FB3C2", d: "#6F8196" }) + A("fish", 80, 94, 1.7, { c: "#D9534F", d: "#A8322F", mood: "wink" }),
  "BIG FISH IN A SMALL POND": () => BG.meadow() + P("pond", 80, 118, 1, { rx: 36, ry: 10 }) + A("fish", 80, 104, 1.5, { mood: "happy" }),
  "PACKED LIKE SARDINES": () => BG.plain() + P("tin", 76, 110, 2),
  "QUIET AS A MOUSE": () => BG.room() + A("mouse", 70, 122, 1.3, { mood: "happy2" }) + T(124, 56, "shh…", 18, "#7D7671"),
  "WHEN THE CAT'S AWAY": () => BG.room() + P("rug", 124, 122, 1, { c: "#8FA8C9" }) + A("mouse", 50, 118, .8, { mood: "happy2", rot: -10 }) + A("mouse", 86, 120, .8, { mood: "happy2", rot: 10 }) + P("note", 70, 60) + P("note", 110, 50),
  "CATNAP": () => BG.room() + P("rug", 80, 122, 1.6) + A("cat", 80, 118, 1.2, { mood: "sleep" }) + P("zzz", 106, 72),
  "FAT CAT": () => BG.room() + P("coins", 124, 124, 1) + A("cat", 70, 122, 1.4, { mood: "wink", extra: G(0, -48, 1, PROP.tophat({})) }),
  "HERDING CATS": () => BG.meadow() + A("cat", 40, 120, .8, { rot: -12 }) + A("cat", 90, 104, .7, { c: "#9AA3AD", rot: 16 }) + A("cat", 132, 122, .8, { c: "#F2E1C4", flip: 1 }) + A("dog", 70, 124, .8, { mood: "worried", extra: G(0, -48, .7, PROP.cowboy({})) }),
  "NINE LIVES": () => BG.plain() + A("cat", 80, 122, 1.35, { mood: "happy2" }) + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const a = Math.PI + i / 8 * Math.PI; return P("heart", 80 + Math.cos(a) * 56, 90 + Math.sin(a) * 56, .5); }).join(""),
  "PLAY POSSUM": () => BG.meadow() + A("possum", 80, 64, 1.2, { mood: "sleep", rot: 180 }) + P("grass", 40, 122) + P("grass", 124, 124),
  "SQUIRREL AWAY": () => BG.meadow() + P("tree", 124, 122, 1.3) + A("squirrel", 64, 120, 1.3, { mood: "happy2" }) + P("acorn", 30, 122) + P("acorn", 40, 124) + P("acorn", 104, 124),
  "LONE WOLF": () => BG.night() + P("moon", 110, 40, 1.8) + A("wolf", 70, 122, 1.35, { mood: "sleep" }),
  "GRIN LIKE A CHESHIRE CAT": () => BG.night() + P("tree", 110, 130, 1.8, { c: "#5E8C6E" }) + A("cat", 64, 116, 1.35, { c: "#C79ADB", mood: "grin" }),
  "MONKEY SEE MONKEY DO": () => BG.meadow() + A("monkey", 50, 120, 1.15, { mood: "wink", rot: -8 }) + A("monkey", 112, 120, 1.15, { mood: "wink", flip: 1, rot: 8 }),
  "SCAPEGOAT": () => BG.meadow() + P("sign", 118, 118, 1, { t: "oops", w: 16 }) + shadow(66, 121, 20) + A("goat", 66, 120, 1.35, { mood: "worried" }),
  "GET YOUR GOAT": () => BG.meadow() + A("horse", 50, 120, 1.1, { mood: "happy2" }) + A("goat", 112, 120, 1, { mood: "happy2" }) + P("heart", 82, 62, .8),
  "DON'T PUT ALL YOUR EGGS IN ONE BASKET": () => BG.plain() + P("basket", 64, 120, 1.7, { inner: [-8, 0, 8, -4, 4].map((x, i) => el(x, i > 2 ? -24 : -19, 4, 5, "#FFF8EC", "#C9B89A", 0, 1)).join("") }) + A("chick", 122, 122, 1, { mood: "worried" }),
  "SWAN SONG": () => BG.dusk() + P("pond", 80, 126, 1.4, { rx: 50 }) + A("swan", 76, 120, 1.4, { mood: "happy2" }) + P("note", 110, 50) + P("note", 124, 36, .8) + P("note", 40, 44, .9),
  "WALKING ON EGGSHELLS": () => BG.plain() + [30, 60, 100, 130].map((x, i) => G(x, 124, 1, sh("M-7 0 l2 -5 l3 3 l3 -4 l2 3 l3 -2 v5Z", "#FFF8EC", "#C9B89A", 1.1))).join("") + A("chick", 80, 116, 1.7, { mood: "worried", rot: 6 }),
};

window.PECKS_ART = {
  win(phrase) { const f = S[phrase]; if (!f) return null; try { return f(); } catch (e) { console.warn("art", phrase, e); return null; } },
  lose() {
    return BG.rain() + P("cloud", 88, 26, 1.3, { c: "#E8EDF1", d: "#9AA6AD", rain: 1 }) + P("puddle", 80, 126, 1.4) +
      G(118, 124, 1.1, sh("M-8 0 l2 -6 l3 3 l3 -5 l2 4 l3 -2 v6Z", "#FFF8EC", "#C9B89A", 1.1) + sh("M-7 -2 q7 6 14 0", "#F7D65A", "none")) +
      A("hen", 70, 122, 1.7, { mood: "sad", rot: 6 });
  },
  _scenes: S,
};
})();
