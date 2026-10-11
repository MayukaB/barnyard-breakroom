// The daily recap: for each game, one message per channel listing everyone who finished the day's puzzle
// there, best first. Started once a day at 4:00 UTC by a cron-job.org job (see README), or by hand with
// .github/workflows/discord-recap.yml, with the RECAP_SECRET secret (deployed with --no-verify-jwt, so that
// header is what keeps anyone else from starting it).
//   POST …/discord-recap   header x-recap-secret   optional body { date: "YYYY-MM-DD" }  → what it posted
// The date defaults to yesterday in UTC. It runs at 4:00 UTC, when the Americas are still on
// that day, so results finished there afterwards miss the recap. Each channel gets a day's recap once,
// even if this runs again.
// Posting needs the game's bot in that server; channels where it isn't are skipped. Any day's recap can also
// be shown in a channel at any time with /recap (discord-interactions); both are worded by recap() in
// _shared/messages.ts.
import { app, db, discord, GAMES, json, message, recap, type Game } from "../_shared/discord.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("RECAP_SECRET");
  if (req.method !== "POST" || !secret || req.headers.get("x-recap-secret") !== secret)
    return new Response("Not found", { status: 404 });
  const body = await req.json().catch(() => ({}));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  const sb = db();
  const report: Record<string, unknown> = { date };
  for (const game of Object.keys(GAMES) as Game[]) {
    const { data: rows, error } = await sb.from("discord_results").select("*").eq("game", game).eq("date", date);
    if (error) throw error;
    const byChannel = new Map<string, any[]>();
    for (const row of rows) byChannel.set(row.channel_id, [...(byChannel.get(row.channel_id) || []), row]);
    const done: string[] = [];
    for (const [channel, players] of byChannel) {
      // Claim the channel's recap first, so two runs can't both post it.
      const { data: claimed } = await sb
        .from("discord_recaps")
        .upsert({ game, channel_id: channel, date }, { onConflict: "game,channel_id,date", ignoreDuplicates: true })
        .select();
      if (!claimed?.length) continue;
      const sent = await discord(`/channels/${channel}/messages`, {
        method: "POST",
        auth: `Bot ${app(game).botToken()}`,
        body: message(recap(game, date, players)),
      });
      // Discord trouble (not "no access"): free the claim so the next run tries again.
      if (!sent.ok && sent.status >= 500)
        await sb.from("discord_recaps").delete().eq("game", game).eq("channel_id", channel).eq("date", date);
      done.push(`${channel}: ${sent.ok ? "posted" : sent.status}`);
    }
    report[game] = done;
  }
  // Launch tokens are useless after 15 minutes; keep a couple of days for looking into problems.
  await sb.from("discord_launches").delete().lt("created_at", new Date(Date.now() - 2 * 864e5).toISOString());
  // Which recaps were posted only matters while a day might be run again by hand; results themselves are
  // kept, so /recap can show any day.
  await sb.from("discord_recaps").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
  return json(report);
});
