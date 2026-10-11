// Shared by the Discord functions: each game's Discord app, calls to Discord's API and the database.
// Secrets come from Supabase → Edge Functions → Secrets (see README, Discord Activities). The games, results
// and the wording of messages are in messages.ts, passed on from here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { GAMES, type Game } from "./messages.ts";
export * from "./messages.ts";

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

// Messages never ping anyone, and carry a Play button (custom_id "play", handled by discord-interactions).
export const PLAY = [{ type: 1, components: [{ type: 2, style: 1, label: "Play", custom_id: "play" }] }];
export const message = (content: string) => ({ content, components: PLAY, allowed_mentions: { parse: [] } });
