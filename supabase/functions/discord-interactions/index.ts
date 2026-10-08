// Discord sends each game's commands and button presses here (the app's Interactions Endpoint URL,
// …/functions/v1/discord-interactions?game=pecks or ?game=biscuit). Deployed with --no-verify-jwt, since
// Discord signs its requests instead.
//
// Starting a game (the App Launcher's entry point command, /pecks or /biscuit, or a message's Play button)
// opens the Activity, then posts "<name> is playing …" in the channel and keeps the interaction's token,
// so discord-activity can edit that message into the player's result when they finish. Tokens last 15 minutes.
import { app, db, discord, GAMES, isGame, json, message, plain } from "../_shared/discord.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const hex = (s: string) => Uint8Array.from(s.match(/../g) || [], (b) => parseInt(b, 16));

async function signedByDiscord(req: Request, body: string, publicKey: string) {
  const sig = req.headers.get("x-signature-ed25519"),
    time = req.headers.get("x-signature-timestamp");
  if (!sig || !time) return false;
  try {
    const key = await crypto.subtle.importKey("raw", hex(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, hex(sig), new TextEncoder().encode(time + body));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const game = new URL(req.url).searchParams.get("game");
  if (req.method !== "POST" || !isGame(game)) return new Response("Not found", { status: 404 });
  const a = app(game);
  const body = await req.text();
  if (!(await signedByDiscord(req, body, a.publicKey()))) return new Response("Bad signature", { status: 401 });
  const i = JSON.parse(body);

  if (i.type === 1) return json({ type: 1 }); // PING, when the endpoint is saved in the Developer Portal

  // 2: a command (the entry point or /pecks); 3: a button (Play)
  if (i.type === 2 || (i.type === 3 && i.data?.custom_id === "play")) {
    const work = announce(game, a.id, i).catch((e) => console.error("announce", e));
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
    return json({ type: 12 }); // LAUNCH_ACTIVITY
  }
  return json({ type: 4, data: { content: "Use the Play button to start.", flags: 64 } });
});

// "<name> is playing Hen Pecks", sent as a follow-up once Discord has the launch reply.
async function announce(game: keyof typeof GAMES, appId: string, i: any) {
  const user = i.member?.user ?? i.user;
  const name = i.member?.nick || user.global_name || user.username;
  const channel = i.channel_id ?? i.channel?.id;
  if (!user || !channel) return;
  const g = GAMES[game];
  let msg = null;
  for (let tries = 0; tries < 3 && !msg; tries++) {
    if (tries) await new Promise((r) => setTimeout(r, 800 * tries)); // the launch reply may still be on its way
    const r = await discord(`/webhooks/${appId}/${i.token}?wait=true`, {
      method: "POST",
      body: message(`${g.emoji} **${plain(name)}** is playing ${g.name}…`),
    });
    if (r.ok) msg = r.data;
    else if (r.status !== 404) return console.error("follow-up", r.status, JSON.stringify(r.data));
  }
  await db()
    .from("discord_launches")
    .insert({
      game,
      user_id: user.id,
      display_name: name.slice(0, 64),
      channel_id: channel,
      guild_id: i.guild_id ?? null,
      token: i.token,
      message_id: msg?.id ?? null,
    });
}
