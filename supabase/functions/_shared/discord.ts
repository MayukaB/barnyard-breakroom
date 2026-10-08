// Shared by the Discord functions: each game's Discord app, calls to Discord's API, the database, and the
// wording of the messages. Secrets come from Supabase → Edge Functions → Secrets (see README, Discord Activities).
import { createClient } from "npm:@supabase/supabase-js@2";

export const GAMES = {
  pecks: { name: "Hen Pecks", emoji: "🐔", secret: "PECKS" },
  biscuit: { name: "Biscuit and Marshmallow", emoji: "🐱", secret: "BISCUIT" },
} as const;
export type Game = keyof typeof GAMES;
export const isGame = (g: unknown): g is Game => typeof g === "string" && Object.hasOwn(GAMES, g);

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};

// DISCORD_PECKS_APP_ID, DISCORD_PECKS_PUBLIC_KEY, DISCORD_PECKS_CLIENT_SECRET, DISCORD_PECKS_BOT_TOKEN, and the same for BISCUIT.
export function app(game: Game) {
  const p = `DISCORD_${GAMES[game].secret}_`;
  return {
    id: env(p + "APP_ID"),
    publicKey: () => env(p + "PUBLIC_KEY"),
    clientSecret: () => env(p + "CLIENT_SECRET"),
    botToken: () => env(p + "BOT_TOKEN"),
  };
}

export const db = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

// A call to Discord's API. auth: "Bot <token>", "Bearer <token>", or nothing (interaction webhooks).
export async function discord(path: string, init: { method?: string; body?: unknown; auth?: string } = {}) {
  const r = await fetch(`https://discord.com/api/v10${path}`, {
    method: init.method || "GET",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.auth ? { Authorization: init.auth } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Player names are typed by players, so keep Discord's formatting characters from doing anything.
export const plain = (s: string) => s.replace(/[\\*_~`|>#[\]()<@:-]/g, (c) => "\\" + c).slice(0, 64);

// Messages never ping anyone, and carry a Play button (custom_id "play", handled by discord-interactions).
export const PLAY = [{ type: 1, components: [{ type: 2, style: 1, label: "Play", custom_id: "play" }] }];
export const message = (content: string) => ({ content, components: PLAY, allowed_mentions: { parse: [] } });

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
