/* Biscuit and Marshmallow pictures: Biscuit the orange kitten, Marshmallow the fluffy sheep and her
   ball of yarn, as SVG markup.
   Each face is drawn around (0, 0) to fit a viewBox of "-24 -24 48 48". The watercolor
   filters (#wc2, #wc3) are defined once in biscuit.html.
   mood: "calm" (open eyes), "happy" (closed, smiling eyes, for the reunion), "sad" (worried brows,
   a frown and, for Biscuit, a tear) or "worried" (brows and a frown, no tear). */
window.BISCUIT_ART = (() => {
  const eyes = (x, y, mood, r = 2.4) =>
    mood === "happy"
      ? `<path d="M${-x - 2.6} ${y + 0.8} q2.6 -3.2 5.2 0 M${x - 2.6} ${y + 0.8} q2.6 -3.2 5.2 0" fill="none" stroke="#2C2A28" stroke-width="1.5" stroke-linecap="round"/>`
      : `<ellipse cx="${-x}" cy="${y}" rx="${r}" ry="${r * 1.08}" fill="#2C2A28"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.08}" fill="#2C2A28"/>` +
        `<circle cx="${-x + 0.8}" cy="${y - 0.9}" r="${r * 0.34}" fill="#fff"/><circle cx="${x + 0.8}" cy="${y - 0.9}" r="${r * 0.34}" fill="#fff"/>`;
  const glum = (mood) => mood === "sad" || mood === "worried";
  // Brows tilted up in the middle, over eyes at (±x, y).
  const brows = (x, y) =>
    `<path d="M${-x - 3} ${y - 4} l5.4 -2.2 M${x + 3} ${y - 4} l-5.4 -2.2" fill="none" stroke="#6B4A33" stroke-width="1.3" stroke-linecap="round"/>`;
  const tear = (x, y) => `<path d="M${x} ${y} q-1.8 3 0 4.2 q1.8 -1.2 0 -4.2Z" fill="#9CC3E6" stroke="#6E9CC6" stroke-width=".5"/>`;

  function kitten(mood = "calm") {
    const ear = `<path d="M-17 -5 L-15 -21 L-4 -13Z" fill="#F29B45" stroke="#C4702A" stroke-width="1.3" stroke-linejoin="round" filter="url(#wc3)"/><path d="M-14.2 -8.5 L-13.4 -17 L-7.6 -12.6Z" fill="#F7B9A6"/>`;
    return (
      `<g>${ear}<g transform="scale(-1 1)">${ear}</g>` +
      `<ellipse cx="0" cy="2" rx="17.5" ry="15" fill="#F5A552" stroke="#C4702A" stroke-width="1.3" filter="url(#wc3)"/>` +
      `<path d="M-4.5 -12.4 q1.2 3 0 5.6 M0 -13.2 v6 M4.5 -12.4 q-1.2 3 0 5.6" fill="none" stroke="#D7772C" stroke-width="1.7" stroke-linecap="round"/>` +
      `<path d="M-17 2 h4.5 M-16.6 5.6 h4" stroke="#D7772C" stroke-width="1.5" stroke-linecap="round"/><path d="M17 2 h-4.5 M16.6 5.6 h-4" stroke="#D7772C" stroke-width="1.5" stroke-linecap="round"/>` +
      `<ellipse cx="0" cy="8.6" rx="7.6" ry="5.4" fill="#FCE6CC"/>` +
      eyes(6.6, 1, mood) +
      `<ellipse cx="-10.5" cy="6" rx="3" ry="1.8" fill="#F08C8C" opacity=".55"/><ellipse cx="10.5" cy="6" rx="3" ry="1.8" fill="#F08C8C" opacity=".55"/>` +
      `<path d="M-2 5.4 h4 l-2 2.4Z" fill="#E27A8A" stroke="#C45F70" stroke-width=".6" stroke-linejoin="round"/>` +
      (glum(mood)
        ? `<path d="M-3 10.6 q3 -2.6 6 0" fill="none" stroke="#8A5230" stroke-width="1.1" stroke-linecap="round"/>` + brows(6.6, 1) + (mood === "sad" ? tear(-7.4, 4) : "")
        : `<path d="M0 7.8 q-1.6 2.2 -3.4 1 M0 7.8 q1.6 2.2 3.4 1" fill="none" stroke="#8A5230" stroke-width="1" stroke-linecap="round"/>`) +
      `<path d="M-7.5 8 l-9 -1.4 M-7.5 10 l-8.6 1.8 M7.5 8 l9 -1.4 M7.5 10 l8.6 1.8" stroke="#8A5230" stroke-width=".8" stroke-linecap="round" opacity=".75"/></g>`
    );
  }

  function sheep(mood = "calm") {
    // A ring of wool puffs, then the face, then a tuft on top.
    let puffs = "";
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.3;
      puffs += `<circle cx="${(Math.cos(a) * 14.5).toFixed(1)}" cy="${(Math.sin(a) * 13.5 + 1).toFixed(1)}" r="7.4"/>`;
    }
    const ear = `<ellipse cx="-14" cy="0" rx="6.4" ry="3.2" transform="rotate(-24 -14 0)" fill="#EBCDB0" stroke="#B89878" stroke-width="1.2" filter="url(#wc3)"/>`;
    return (
      `<g><g fill="#FFFDF7" stroke="#CFC3AE" stroke-width="1.3" filter="url(#wc2)">${puffs}</g>` +
      `<ellipse cx="0" cy="1" rx="15" ry="14" fill="#FFFDF7"/>` +
      `${ear}<g transform="scale(-1 1)">${ear}</g>` +
      `<ellipse cx="0" cy="4" rx="9.6" ry="10.6" fill="#F4E4D2" stroke="#BFA88E" stroke-width="1.2" filter="url(#wc3)"/>` +
      `<g fill="#FFFDF7" stroke="#CFC3AE" stroke-width="1.1" filter="url(#wc3)"><circle cx="-5.4" cy="-7" r="4.8"/><circle cx="5.4" cy="-7" r="4.8"/><circle cx="0" cy="-9" r="5.4"/></g>` +
      eyes(4.2, 3, mood, 2) +
      `<ellipse cx="-6.4" cy="7.4" rx="2.4" ry="1.5" fill="#F08C8C" opacity=".5"/><ellipse cx="6.4" cy="7.4" rx="2.4" ry="1.5" fill="#F08C8C" opacity=".5"/>` +
      `<ellipse cx="0" cy="8.6" rx="2.4" ry="1.5" fill="#D98396"/>` +
      (glum(mood)
        ? `<path d="M-2.6 12 q2.6 -2.2 5.2 0" fill="none" stroke="#8C6E58" stroke-width="1" stroke-linecap="round"/>` + brows(4.2, 3)
        : `<path d="M0 10 q-1.4 1.9 -3 .9 M0 10 q1.4 1.9 3 .9" fill="none" stroke="#8C6E58" stroke-width="1" stroke-linecap="round"/>`) +
      `</g>`
    );
  }

  const heart = (x, y, s, fill = "#E8798A") =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-6 -1 -5 -7 -1.6 -6 C-.6 -5.8 0 -5 0 -4.2 C0 -5 .6 -5.8 1.6 -6 C5 -7 6 -1 0 3Z" fill="${fill}"/>`;

  // Biscuit lying as a loaf facing left: paws in front, stripes on her back, and her tail along `tail`
  // (an SVG path starting at her back end), drawn over her body when tailOnTop.
  function catLoaf(x, y, tail, tailOnTop = false) {
    const t =
      `<path d="${tail}" fill="none" stroke="#C4702A" stroke-width="8.6" stroke-linecap="round"/>` +
      `<path d="${tail}" fill="none" stroke="#F5A552" stroke-width="6" stroke-linecap="round"/>`;
    return (
      (tailOnTop ? "" : t) +
      `<ellipse cx="${x}" cy="${y}" rx="27" ry="15" fill="#F5A552" stroke="#C4702A" stroke-width="1.4" filter="url(#wc3)"/>` +
      `<path d="M${x + 16} ${y - 12} q-3 5 0 9 M${x + 6} ${y - 14} q-3 6 0 10 M${x - 4} ${y - 13} q-3 5 0 9" fill="none" stroke="#D7772C" stroke-width="2" stroke-linecap="round"/>` +
      `<ellipse cx="${x - 14}" cy="${y + 13}" rx="6" ry="3.4" fill="#FCE6CC" stroke="#C4702A" stroke-width="1.1"/><ellipse cx="${x - 1}" cy="${y + 14}" rx="6" ry="3.4" fill="#FCE6CC" stroke="#C4702A" stroke-width="1.1"/>` +
      (tailOnTop ? t : "")
    );
  }
  // Marshmallow lying down: a cloud of wool with two hooves tucked under.
  function woolBody(cx, cy, rx, ry) {
    let wool = "";
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      wool += `<circle cx="${(cx + Math.cos(a) * rx).toFixed(1)}" cy="${(cy + Math.sin(a) * ry).toFixed(1)}" r="9"/>`;
    }
    return (
      `<ellipse cx="${cx - 14}" cy="${cy + ry + 2}" rx="4.5" ry="2.6" fill="#7A6656"/><ellipse cx="${cx + 20}" cy="${cy + ry + 2}" rx="4.5" ry="2.6" fill="#7A6656"/>` +
      `<g fill="#FFFDF7" stroke="#CFC3AE" stroke-width="1.3" filter="url(#wc2)">${wool}</g><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFDF7"/>`
    );
  }
  const yarnBall = (x, y, r = 10, rot = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${r / 9})"><circle r="9" fill="#E27A8A" stroke="#B85466" stroke-width="1.2" filter="url(#wc3)"/>` +
    `<path d="M-7 -4 q7 -3 13 3 M-8 1 q8 -3 15 4 M-5 6 q5 -1 9 2 M-3 -8 q2 7 -2 15" fill="none" stroke="#B85466" stroke-width="1" stroke-linecap="round"/></g>`;
  const yarn = (d, w = 1.8) => `<path d="${d}" fill="none" stroke="#E27A8A" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const paw = (x, y, rot) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})" fill="#B7825A" opacity=".7"><ellipse cx="0" cy="1.2" rx="2.2" ry="1.8"/><circle cx="-2.2" cy="-1.6" r=".9"/><circle cx="0" cy="-2.4" r=".9"/><circle cx="2.2" cy="-1.6" r=".9"/></g>`;

  // The ball of yarn as a board tile, in the same "-24 -24 48 48" box as the faces, with a loose end.
  const yarnTile = () =>
    yarnBall(-2, 0, 15, 15) + `<path d="M11 8 q7 5 3 11 q-3 4 3 7" fill="none" stroke="#E27A8A" stroke-width="1.8" stroke-linecap="round"/>`;

  // Biscuit curled up in front of Marshmallow, nestled into his wool with her tail wrapped around
  // her paws and her ball of yarn beside them, while he leans in over her. For the result card and
  // the link preview: viewBox "0 0 160 120".
  function snuggle() {
    return (
      `<ellipse cx="80" cy="106" rx="68" ry="8" fill="#9BB58F" opacity=".5" filter="url(#wc)"/>` +
      `<path d="M14 106 l-2 -7 M18 106 l1 -8 M22 106 l3 -6 M142 106 l-2 -7 M146 106 l1 -8 M150 106 l3 -6" stroke="#6E9E56" stroke-width="1.6" stroke-linecap="round"/>` +
      woolBody(84, 78, 44, 19) +
      `<g transform="translate(114 50) scale(1.25) rotate(-14)">${sheep("happy")}</g>` +
      catLoaf(78, 94, "M103 100 C108 112 76 113 60 110", true) +
      `<path d="M96 108.4 l.5 -4.6 M80 110.8 l0 -4.6" stroke="#D7772C" stroke-width="1.8" stroke-linecap="round"/>` +
      // her ball of yarn by her front paws, its loose end looped round one paw
      yarn("M50 106 C54 112 60 112 62 106", 1.6) + yarn("M34 104 C28 106 24 102 20 104", 1.6) + yarnBall(42, 101, 9, -20) +
      `<g transform="translate(60 68) scale(1.25) rotate(14)">${kitten("happy")}</g>` +
      `<g class="hearts">${heart(92, 24, 1.6)}${heart(78, 14, 0.9, "#F3A9B4")}${heart(106, 12, 1.1, "#F3A9B4")}</g>`
    );
  }

  /* ---------- The story, as storybook panels ----------
     Each panel is drawn in a viewBox of "0 0 200 170" with its own painted sky, so the time of day
     stays the same in light and dark mode. `key` keeps each copy's gradient id unique, since the
     page shows the panels twice (beside the game on wide screens, and in a fold-out on phones). */
  const ORANGE = "#F5A552", LINE = "#C4702A", STRIPE = "#D7772C", CREAM = "#FCE6CC";
  const sky = (key, top, bottom) =>
    `<defs><linearGradient id="sky-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="200" height="170" fill="url(#sky-${key})"/>`;
  // Ground: a full-width band with a soft hill on top.
  const ground = (color) =>
    `<path d="M0 144 C50 134 120 140 200 132 V170 H0Z" fill="${color}" filter="url(#wc)"/><rect y="158" width="200" height="12" fill="${color}"/>`;
  const grass = (x, y) => `<path d="M${x} ${y} l-2 -7 M${x + 3} ${y} l1 -8 M${x + 6} ${y} l3 -6" stroke="#6E9E56" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  const flower = (x, y, c) =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 v-11" stroke="#5E8C44" stroke-width="1.4" stroke-linecap="round"/><circle cx="0" cy="-13" r="3" fill="${c}"/><circle cx="0" cy="-13" r="1.1" fill="#F7D154"/></g>`;
  const cloud = (x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF" opacity=".92" filter="url(#wc2)"><ellipse cx="0" cy="0" rx="20" ry="8"/><ellipse cx="10" cy="-6" rx="11" ry="7"/></g>`;
  const sun = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F7D57A" filter="url(#wc2)"/>`;
  // A thick orange leg or tail: an outline stroke with a fill stroke on top.
  const limb = (d, w = 6) =>
    `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${w + 2.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${ORANGE}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const pawTip = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.6" fill="${CREAM}" stroke="${LINE}" stroke-width="1"/>`;
  const sweat = (x, y, s = 1) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -5 q-3.4 5 0 7 q3.4 -2 0 -7Z" fill="#9CC3E6" stroke="#6E9CC6" stroke-width=".6"/>`;
  const sparkle = (x, y, s, c = "#F2C94C") =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1Z" fill="${c}"/>`;
  const pine = (x, y, s, c = "#4F6E62") =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-2.5 0 v-10 h5 v10Z" fill="#5A4232"/>` +
    `<path d="M0 -72 L-18 -40 L-9 -40 L-24 -9 L24 -9 L9 -40 L18 -40Z" fill="${c}" stroke="#3E584D" stroke-width="1.2" stroke-linejoin="round" filter="url(#wc2)"/></g>`;
  const barn = (x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-26 0 v-30 l26 -18 l26 18 v30Z" fill="#C8574B" stroke="#98392F" stroke-width="1.3" stroke-linejoin="round" filter="url(#wc3)"/>` +
    `<path d="M-30 -28 l30 -22 l30 22" fill="none" stroke="#6E4A3A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M-9 0 v-18 h18 v18Z M-9 -18 l18 18 M9 -18 l-18 18" fill="none" stroke="#F4ECE0" stroke-width="1.6"/></g>`;
  const fence = (y) => {
    let posts = "";
    for (let k = 0; k < 10; k++) posts += `<path d="M${k * 22 - 3} ${y} v-22 l3 -3 l3 3 v22Z"/>`;
    return `<g fill="#D9B98A" stroke="#9A7A4A" stroke-width="1.1" stroke-linejoin="round" filter="url(#wc3)">${posts}<path d="M-6 ${y - 17} h220 v3 h-220Z M-6 ${y - 9} h220 v3 h-220Z"/></g>`;
  };

  // 1. A sunny morning: Biscuit bounds after a ball of yarn that unravels as it rolls away.
  function chasing(key) {
    return (
      sky(key, "#CFE4F0", "#F6EBD3") + sun(34, 30, 13) + cloud(150, 30, 1) + cloud(96, 52, 0.6) +
      ground("#BFD9A2") + flower(18, 160, "#F29BB8") + flower(186, 156, "#B79AE0") + grass(40, 164) + grass(150, 164) +
      yarn("M160 132 C140 142 124 134 108 144 C92 152 70 146 52 150 C34 154 18 146 0 150") +
      yarnBall(164, 128, 11, 30) +
      `<path d="M146 118 l-8 -2 M144 128 l-10 0" stroke="#B85466" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>` +
      `<path d="M22 96 h16 M16 106 h18 M24 116 h12" stroke="#C9B89A" stroke-width="1.6" stroke-linecap="round"/>` +
      // Mid-leap, facing right: tail up behind, back legs pushing off, front paws reaching
      `<g transform="translate(92 104) rotate(-10)">` +
      limb("M-24 -2 C-36 -8 -40 -22 -32 -30", 5.6) +
      limb("M-14 8 L-30 20", 6.2) + limb("M-6 10 L-20 24", 6.2) +
      `<ellipse cx="0" cy="0" rx="27" ry="13" fill="${ORANGE}" stroke="${LINE}" stroke-width="1.4" filter="url(#wc3)"/>` +
      `<path d="M-14 -11 q3 5 0 9 M-4 -12 q3 6 0 10 M6 -11 q3 5 0 9" fill="none" stroke="${STRIPE}" stroke-width="2" stroke-linecap="round"/>` +
      limb("M16 6 L34 16", 6.2) + limb("M22 2 L40 6", 6.2) + pawTip(35, 17) + pawTip(41, 6) + pawTip(-31, 21) + pawTip(-21, 25) +
      `</g>` +
      `<g transform="translate(124 80) scale(1.05) rotate(8)">${kitten("happy")}<path d="M-3.2 9.2 q3.2 5.6 6.4 0Z" fill="#B5566A"/></g>` +
      sparkle(146, 62, 1.1) + sparkle(110, 54, 0.8) + sparkle(140, 96, 0.7)
    );
  }

  // 2. Night in the woods: Biscuit crouched small and scared, tangled in yarn. A kindly owl watches.
  function scared(key) {
    const owl =
      `<g transform="translate(160 52)"><path d="M-22 12 h40" stroke="#6B4E3A" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="0" cy="0" rx="10" ry="12" fill="#9C7C62" stroke="#6B4E3A" stroke-width="1" filter="url(#wc3)"/>` +
      `<path d="M-9 -8 l-2 -6 l6 4 M9 -8 l2 -6 l-6 4" fill="#9C7C62" stroke="#6B4E3A" stroke-width="1"/>` +
      `<circle cx="-4" cy="-3" r="3.6" fill="#F7E7A0"/><circle cx="4" cy="-3" r="3.6" fill="#F7E7A0"/><circle cx="-4" cy="-3" r="1.6" fill="#2C2A28"/><circle cx="4" cy="-3" r="1.6" fill="#2C2A28"/>` +
      `<path d="M-1.4 1 l1.4 2.4 l1.4 -2.4Z" fill="#E8A93A"/></g>`;
    const firefly = (x, y) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#F7E08A" opacity=".4"/><circle cx="${x}" cy="${y}" r="1.3" fill="#F9E27A"/>`;
    return (
      sky(key, "#2F3A5A", "#6B79A3") +
      `<path d="M40 20 a11 11 0 1 0 9 18 a8.5 8.5 0 1 1 -9 -18Z" fill="#F1DE9E" filter="url(#wc3)"/>` +
      sparkle(80, 18, 0.7, "#E9D48E") + sparkle(120, 30, 0.5, "#E9D48E") + sparkle(186, 16, 0.6, "#E9D48E") +
      pine(58, 132, 0.9, "#4B6A60") + pine(150, 128, 0.8, "#4B6A60") + pine(20, 150, 1.5) + pine(186, 156, 1.6) +
      owl + ground("#4F6B5F") +
      `<g fill="#46645A" stroke="#34504A" stroke-width="1.1" filter="url(#wc2)"><circle cx="30" cy="152" r="14"/><circle cx="46" cy="156" r="10"/><circle cx="172" cy="152" r="14"/></g>` +
      firefly(70, 70) + firefly(132, 88) + firefly(96, 40) +
      `<g transform="translate(100 134)">` +
      limb("M22 4 C28 10 22 15 12 15", 5.4) +
      `<ellipse cx="0" cy="0" rx="24" ry="13" fill="${ORANGE}" stroke="${LINE}" stroke-width="1.4" filter="url(#wc3)"/>` +
      `<path d="M4 -10 q-3 5 0 8 M13 -9 q-3 5 0 8" fill="none" stroke="${STRIPE}" stroke-width="2" stroke-linecap="round"/>` +
      pawTip(-13, 12) + pawTip(-2, 13) + `</g>` +
      yarn("M72 128 C84 118 110 116 124 124 C132 130 122 142 104 144 C84 146 76 138 84 130 C92 122 120 128 126 138", 1.6) +
      yarnBall(66, 142, 9) +
      `<g transform="translate(88 108) scale(1.1)">${kitten("sad")}</g>` +
      `<path d="M62 96 q-4 4 0 8 M58 92 q-6 8 0 16 M114 96 q4 4 0 8 M118 92 q6 8 0 16" fill="none" stroke="#E3D6BE" stroke-width="1.4" stroke-linecap="round"/>` +
      sweat(108, 90, 1.1)
    );
  }

  // 3. Back home in the sunny meadow: Marshmallow, worried, calling for Biscuit.
  function searching(key) {
    let wool = "";
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      wool += `<circle cx="${(112 + Math.cos(a) * 30).toFixed(1)}" cy="${(112 + Math.sin(a) * 16).toFixed(1)}" r="9"/>`;
    }
    const leg = (x) => `<path d="M${x} 118 v26" stroke="#6E5A4E" stroke-width="5.4" stroke-linecap="round"/>`;
    return (
      sky(key, "#CFE4F0", "#F6EBD3") + sun(170, 28, 12) + cloud(120, 26, 0.8) +
      `<path d="M0 104 C60 88 140 96 200 86 V140 H0Z" fill="#CFE3B8" filter="url(#wc)"/>` +
      barn(166, 96, 0.8) + fence(118) +
      ground("#BFD9A2") + flower(22, 158, "#F29BB8") + flower(180, 160, "#F7D154") + grass(46, 164) + grass(160, 164) +
      leg(94) + leg(104) + leg(122) + leg(132) +
      `<g fill="#FFFDF7" stroke="#CFC3AE" stroke-width="1.3" filter="url(#wc2)">${wool}</g><ellipse cx="112" cy="112" rx="30" ry="16" fill="#FFFDF7"/>` +
      `<g transform="translate(80 92) scale(1.2) rotate(-8)">${sheep("worried")}</g>` +
      sweat(96, 70, 1.2) + sweat(62, 84, 0.9) +
      `<g transform="translate(40 40)"><path d="M-30 -16 h60 a8 8 0 0 1 8 8 v14 a8 8 0 0 1 -8 8 h-30 l-10 9 l2 -9 h-22 a8 8 0 0 1 -8 -8 v-14 a8 8 0 0 1 8 -8Z" fill="#FFFFFF" stroke="#C9CFD3" stroke-width="1.2" filter="url(#wc3)"/>` +
      `<text x="0" y="4" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="16" fill="#5B4A3E">Biscuit?!</text></g>`
    );
  }

  // 4, before the win: at the edge of the woods, Biscuit spots the yarn trail winding toward the barn far away.
  function wayHome(key) {
    return (
      sky(key, "#9FB0D6", "#F4D9B0") + sun(160, 64, 10) +
      `<path d="M60 112 C100 96 150 100 200 92 V150 H60Z" fill="#CFE3B8" filter="url(#wc)"/>` +
      barn(170, 100, 0.5) +
      pine(14, 150, 1.5) + pine(46, 140, 1.05) + pine(-6, 120, 1.1, "#4B6A60") +
      ground("#B5D29A") +
      yarn("M90 157 C106 158 110 142 122 132 C134 122 128 112 146 108 C156 106 160 104 166 102", 1.6) +
      paw(114, 144, 60) + paw(128, 126, 50) +
      // Biscuit sitting at the edge of the woods: body, cream chest, front paws and her tail curled round
      limb("M92 148 C104 150 104 160 92 160", 5.2) +
      `<ellipse cx="78" cy="143" rx="17" ry="14" fill="${ORANGE}" stroke="${LINE}" stroke-width="1.4" filter="url(#wc3)"/>` +
      `<path d="M89 135 q-3 4 0 8 M92 143 q-3 4 0 7" fill="none" stroke="${STRIPE}" stroke-width="2" stroke-linecap="round"/>` +
      `<ellipse cx="74" cy="145" rx="7" ry="8" fill="${CREAM}"/>` +
      pawTip(70, 156) + pawTip(81, 157) +
      `<g transform="translate(76 118) scale(1.05)">${kitten("calm")}</g>` +
      sparkle(96, 104, 0.8) + flower(186, 160, "#F29BB8") + grass(150, 164)
    );
  }

  // 4, after the win: home together.
  function together(key) {
    return (
      sky(key, "#CFE4F0", "#F8E2BE") + sun(30, 26, 12) + cloud(160, 26, 0.8) + ground("#BFD9A2") +
      `<g transform="translate(12 34) scale(1.1)">${snuggle()}</g>`
    );
  }

  // The four panels in order: [draw, caption, description for screen readers].
  function panels(won) {
    return [
      [chasing, "Biscuit spots a ball of yarn and gives chase…", "Biscuit the kitten happily leaps after a ball of yarn in a sunny meadow."],
      [scared, "…all the way into the woods. Now she’s lost!", "At night in the woods, Biscuit crouches, scared and teary, tangled in yarn."],
      [searching, "Back home, Marshmallow searches everywhere.", "In the meadow by the barn, Marshmallow the sheep looks worried and calls out “Biscuit?!”"],
      won
        ? [together, "Together again!", "Biscuit and Marshmallow snuggle together in the meadow, with hearts above them."]
        : [wayHome, "Swap the letters to lead her home!", "At the edge of the woods, Biscuit spots a yarn trail leading to the barn far away."],
    ];
  }

  return Object.freeze({ kitten, sheep, yarnTile, heart, snuggle, panels });
})();
