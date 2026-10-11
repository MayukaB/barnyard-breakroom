// What the Discord functions say: the games, players' results, and the wording of messages and recaps.
// No imports and no secrets, so tests/discord-messages.test.mjs can run it with Node. discord.ts re-exports it.

export const GAMES = {
  pecks: { name: "Hen Pecks", emoji: "🐔", secret: "PECKS" },
  biscuit: { name: "Biscuit and Marshmallow", emoji: "🐱", secret: "BISCUIT" },
} as const;
export type Game = keyof typeof GAMES;
export const isGame = (g: unknown): g is Game => typeof g === "string" && Object.hasOwn(GAMES, g);

// Player names are typed by players, so keep Discord's formatting characters from doing anything.
export const plain = (s: string) => s.replace(/[\\*_~`|>#[\]()<@:-]/g, (c) => "\\" + c).slice(0, 64);

/* ---------- Results ---------- */
// What the game sends (window.GameResult in pecks.js and biscuit.js), checked and trimmed to what's posted.
// Null if it isn't a believable result. Players could still send made-up results; nothing here is prized.
export type Result =
  | { game: "pecks"; date: string; no: number; outcome: string; hits: boolean[]; hard: boolean }
  | { game: "biscuit"; date: string; no: number; shape: string; moves: number; par: number };

const int = (n: unknown, lo: number, hi: number) => Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi;

export function checkResult(game: Game, r: Record<string, unknown>): Result | null {
  if (!r || r.game !== game || typeof r.date !== "string" || !nearToday(r.date) || !int(r.no, 1, 100000)) return null;
  if (game === "pecks") {
    const hits = r.hits;
    if (!["pecks", "t1", "t2", "t3", "miss"].includes(r.outcome as string)) return null;
    if (!Array.isArray(hits) || hits.length < 1 || hits.length > 7 || !hits.every((h) => typeof h === "boolean"))
      return null;
    return { game, date: r.date, no: r.no as number, outcome: r.outcome as string, hits, hard: r.hard === true };
  }
  if (typeof r.shape !== "string" || !/^[A-Za-z -]{1,20}$/.test(r.shape)) return null;
  if (!int(r.moves, 0, 9999) || !int(r.par, 1, 500)) return null;
  return { game, date: r.date, no: r.no as number, shape: r.shape, moves: r.moves as number, par: r.par as number };
}

// Games use the player's own date, so it can be a day either side of the date in UTC.
function nearToday(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const diff = Math.abs(Date.parse(date + "T00:00:00Z") - Date.parse(new Date().toISOString().slice(0, 10)));
  return diff <= 864e5;
}

export const stars = (r: Extract<Result, { game: "biscuit" }>) => (r.moves <= r.par ? 3 : r.moves <= r.par + 10 ? 2 : 1);

// One line about a result, e.g. "🐣🥚🐣 cracked on try 2/3" or "⭐⭐☆ 23 swaps (par 18)".
export function summary(r: Result) {
  if (r.game === "pecks") {
    const eggs = r.hits.map((h) => (h ? "🐣" : "🥚")).join("");
    const end =
      r.outcome === "miss"
        ? "the phrase got away 🌧️"
        : r.outcome === "pecks"
          ? "cracked with pecks alone"
          : `cracked on try ${r.outcome.slice(1)}/3`;
    return `${eggs} ${end}${r.hard ? " 🌶️" : ""}`;
  }
  const n = stars(r);
  return `${"⭐".repeat(n)}${"☆".repeat(3 - n)} ${r.moves} swaps (par ${r.par})`;
}

export const title = (r: Result) =>
  r.game === "pecks" ? `Hen Pecks #${r.no}` : `Biscuit and Marshmallow #${r.no} · ${r.shape}`;

// Best first: for Hen Pecks fewer pecks and tries, hard mode breaking ties; for Biscuit, fewer swaps.
export function rank(r: Result) {
  if (r.game === "pecks") {
    const step = ["pecks", "t1", "t2", "t3", "miss"].indexOf(r.outcome);
    return step * 100 + (r.outcome === "pecks" ? r.hits.length * 10 : 0) + (r.hard ? 0 : 1);
  }
  return r.moves;
}

/* ---------- Recaps ---------- */
// A channel's results for one day, best first: the morning recap (discord-recap) and /recap
// (discord-interactions). players are rows of discord_results. today is the date in UTC, so the
// heading can say "Today's … so far" or "Yesterday's …".
export type Player = { user_id: string; display_name: string; result: Result; created_at: string };
const LIMIT = 1900; // Discord allows 2000 characters

export function recap(game: Game, date: string, players: Player[], today = new Date().toISOString().slice(0, 10)) {
  const g = GAMES[game];
  players = [...players].sort(
    (a, b) => rank(a.result) - rank(b.result) || Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  const day = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const yesterday = new Date(Date.parse(today + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
  const heading = date === today ? `Today's ${g.name} so far` : date === yesterday ? `Yesterday's ${g.name}` : g.name;
  const first = players[0].result;
  const no = first.game === "pecks" ? `#${first.no}` : `#${first.no} ${first.shape}`;
  const n = players.length;
  const footer = `\n${n} player${n === 1 ? "" : "s"} · Today's puzzle is ready, press **Play**!`;
  let text = `${g.emoji} **${heading}** · ${no} · ${day}\n\n`;
  // Everyone is numbered; ties share a number and the next one skips ahead (1, 1, 3). The top three places
  // get medals, except a Hen Pecks phrase that got away. The "\." keeps Discord from renumbering it as a list.
  let place = 0;
  for (const [i, p] of players.entries()) {
    if (i === 0 || rank(p.result) !== rank(players[i - 1].result)) place = i + 1;
    const won = !(p.result.game === "pecks" && p.result.outcome === "miss");
    const medal = won && place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] + " " : "";
    // An @mention, which shows the player's name in that server and is clickable. Messages turn off
    // pings, so nobody is notified. Their saved name stands in if the ID somehow isn't one.
    const who = /^\d{17,20}$/.test(p.user_id) ? `<@${p.user_id}>` : `**${plain(p.display_name)}**`;
    const line = `${place}\\. ${medal}${who} ${describe(p.result)}\n`;
    if (text.length + line.length + footer.length > LIMIT) {
      text += `…and ${n - i} more\n`;
      break;
    }
    text += line;
  }
  return text + footer;
}

// A result in words, then its emoji, e.g. "cracked it on try 2 of 3  🥚🐣🐣" or "16 swaps, 2 under par  ⭐⭐⭐".
function describe(r: Result) {
  if (r.game === "pecks") {
    const eggs = r.hits.map((h) => (h ? "🐣" : "🥚")).join("");
    const end =
      r.outcome === "miss"
        ? "the phrase got away 🌧️"
        : r.outcome === "pecks"
          ? "cracked it with pecks alone"
          : `cracked it on try ${r.outcome.slice(1)} of 3`;
    return `${end}${r.hard ? " 🌶️" : ""}  ${eggs}`;
  }
  const d = r.moves - r.par;
  const par = d === 0 ? "on par" : `${Math.abs(d)} ${d < 0 ? "under" : "over"} par`;
  const n = stars(r);
  return `${r.moves} swaps, ${par}  ${"⭐".repeat(n)}${"☆".repeat(3 - n)}`;
}

// The day /recap asks for: "2026-10-05", or nothing for the latest day with results. Null if it isn't a
// real date in that form.
export function recapDate(option: unknown): string | null | undefined {
  if (option === undefined || option === null || option === "") return undefined;
  const s = String(option).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}
