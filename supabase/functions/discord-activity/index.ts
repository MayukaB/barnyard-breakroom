// Called by the game inside Discord (public/discord.js), through the Activity's /x/supabase URL mapping.
// Deployed with --no-verify-jwt: players are checked with their Discord token instead.
//   POST …/discord-activity/token   { game, code }                         → { access_token }
//     Swaps the code from the SDK's authorize() for a token (needs the app's client secret).
//   POST …/discord-activity/result  { game, access_token, channel_id, result } → { posted }
//     Saves the player's result for the day (the first one stands) and posts it in the channel where they
//     started the game: by editing their "is playing" message while its token lasts (15 minutes), and
//     otherwise as a new message from the app's bot, which needs the bot in that server.
//     It only ever posts where that player started the game, so it can't be used to post anywhere else.
import { app, checkResult, db, discord, GAMES, isGame, json, message, plain, summary, title } from "../_shared/discord.ts";

const FRESH_MS = 14 * 60 * 1000; // a little under the token's 15 minutes

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Not found", { status: 404 });
  const route = new URL(req.url).pathname.split("/").pop();
  const body = await req.json().catch(() => ({}));
  if (!isGame(body.game)) return json({ error: "unknown game" }, 400);
  if (route === "token") return token(body.game, body.code);
  if (route === "result") return result(body);
  return new Response("Not found", { status: 404 });
});

async function token(game: keyof typeof GAMES, code: unknown) {
  if (typeof code !== "string") return json({ error: "no code" }, 400);
  const a = app(game);
  const r = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: a.id,
      client_secret: a.clientSecret(),
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) return json({ error: "Discord refused the code" }, 401);
  return json({ access_token: data.access_token });
}

async function result(body: Record<string, any>) {
  const game = body.game as keyof typeof GAMES;
  const a = app(game);
  // Who this is, and that the token was made for this game's app.
  const me = await discord("/oauth2/@me", { auth: `Bearer ${body.access_token}` });
  if (!me.ok || me.data?.application?.id !== a.id || !me.data?.user) return json({ error: "not signed in" }, 401);
  const user = me.data.user;
  const r = checkResult(game, body.result);
  if (!r || typeof body.channel_id !== "string") return json({ error: "bad result" }, 400);

  const sb = db();
  const { data: launch } = await sb
    .from("discord_launches")
    .select("*")
    .eq("game", game)
    .eq("user_id", user.id)
    .eq("channel_id", body.channel_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!launch) return json({ posted: false, reason: "not started here" });

  // The first result of the day stands, whichever channel it was played in.
  await sb.from("discord_results").upsert(
    {
      game,
      user_id: user.id,
      date: r.date,
      puzzle: r.no,
      display_name: launch.display_name,
      channel_id: launch.channel_id,
      guild_id: launch.guild_id,
      result: r,
    },
    { onConflict: "game,user_id,date", ignoreDuplicates: true },
  );
  const { data: saved } = await sb
    .from("discord_results")
    .select("*")
    .eq("game", game)
    .eq("user_id", user.id)
    .eq("date", r.date)
    .single();
  const first = saved.result;
  const text = `${GAMES[game].emoji} **${plain(launch.display_name)}** played ${title(first)}\n${summary(first)}`;

  // Their latest launch is still fresh: turn its "is playing" message into the result.
  if (!launch.shown && Date.now() - Date.parse(launch.created_at) < FRESH_MS) {
    const hook = `/webhooks/${a.id}/${launch.token}`;
    const sent = launch.message_id
      ? await discord(`${hook}/messages/${launch.message_id}`, { method: "PATCH", body: message(text) })
      : await discord(hook, { method: "POST", body: message(text) });
    if (sent.ok) {
      await sb.from("discord_launches").update({ shown: true }).eq("id", launch.id);
      await sb.from("discord_results").update({ posted: true }).eq("game", game).eq("user_id", user.id).eq("date", r.date);
      return json({ posted: true });
    }
  }
  if (saved.posted) return json({ posted: true, already: true });

  // Too late for the token: post as the bot, if it's in that server.
  const sent = await discord(`/channels/${launch.channel_id}/messages`, {
    method: "POST",
    auth: `Bot ${a.botToken()}`,
    body: message(text),
  });
  if (!sent.ok) return json({ posted: false, reason: `bot ${sent.status}` });
  await sb.from("discord_launches").update({ shown: true }).eq("id", launch.id);
  await sb.from("discord_results").update({ posted: true }).eq("game", game).eq("user_id", user.id).eq("date", r.date);
  return json({ posted: true });
}
