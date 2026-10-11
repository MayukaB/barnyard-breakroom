// Discord sends each game's commands and button presses here (the app's Interactions Endpoint URL,
// …/functions/v1/discord-interactions?game=pecks or ?game=biscuit). Deployed with --no-verify-jwt, since
// Discord signs its requests instead.
//
// Starting a game (the App Launcher's entry point command, /pecks or /biscuit, or a message's Play button)
// opens the Activity, then posts "<name> is playing …" in the channel and keeps the interaction's token,
// so discord-activity can edit that message into the player's result when they finish. Tokens last 15 minutes.
//
// /recap [date] shows a day's results in this channel, best first, like the morning recap (discord-recap),
// for everyone in the channel. Without a date it's the latest day anyone finished here. Being a reply to a
// command, it works even where the game's bot hasn't been added.
import { app, db, discord, GAMES, isGame, json, message, plain, PLAY, recap, recapDate } from "../_shared/discord.ts";

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

  if (i.type === 2 && i.data?.name === "recap") return json(await recapReply(game, i));

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

// The reply to /recap: the day's recap for everyone in the channel, or a note only the asker sees.
async function recapReply(game: keyof typeof GAMES, i: any) {
  // 64: only the asker sees it. play adds the Play button.
  const only = (content: string, play = false) => ({
    type: 4,
    data: { content, flags: 64, ...(play ? { components: PLAY } : {}) },
  });
  const channel = i.channel_id ?? i.channel?.id;
  const option = i.data?.options?.find((o: any) => o.name === "date")?.value;
  let date = recapDate(option);
  if (date === null) return only("Give the date like 2026-10-05 (year, month, day), or leave it out for the latest.");
  if (!channel) return only("There's no recap here.");
  const sb = db();
  if (!date) {
    const { data: latest } = await sb
      .from("discord_results")
      .select("date")
      .eq("game", game)
      .eq("channel_id", channel)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return only(`Nobody has finished ${GAMES[game].name} in this channel yet. Press **Play** to be the first!`, true);
    date = latest.date as string;
  }
  const { data: players, error } = await sb
    .from("discord_results")
    .select("user_id, display_name, result, created_at")
    .eq("game", game)
    .eq("channel_id", channel)
    .eq("date", date);
  if (error) return only("The recap couldn't be loaded just now. Try again in a moment.");
  if (!players?.length) return only(`Nobody finished ${GAMES[game].name} in this channel on ${date}.`);
  return { type: 4, data: message(recap(game, date, players, null)) };
}
