// The daily recap: for each game, one message per channel listing everyone who finished the day's puzzle
// there, best first. Started once a day at 4:00 UTC by a cron-job.org job (see README), or by hand with
// .github/workflows/discord-recap.yml, with the RECAP_SECRET secret (deployed with --no-verify-jwt, so that
// header is what keeps anyone else from starting it).
//   POST …/discord-recap   header x-recap-secret   optional body { date: "YYYY-MM-DD" }  → what it posted
// The date defaults to yesterday in UTC. It runs at 4:00 UTC, when the Americas are still on
// that day, so results finished there afterwards miss the recap. Each channel gets a day's recap once,
// even if this runs again.
// Posting needs the game's bot in that server; channels where it isn't are skipped.
import { app, db, discord, GAMES, json, message, plain, rank, stars, type Game, type Result } from "../_shared/discord.ts";

const LIMIT = 1900; // Discord allows 2000 characters

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
  return json(report);
});

function recap(game: Game, date: string, players: any[]) {
  const g = GAMES[game];
  players.sort((a, b) => rank(a.result) - rank(b.result) || Date.parse(a.created_at) - Date.parse(b.created_at));
  const day = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const yesterday = date === new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const first = players[0].result;
  const no = first.game === "pecks" ? `#${first.no}` : `#${first.no} ${first.shape}`;
  const n = players.length;
  const footer = `\n${n} player${n === 1 ? "" : "s"} · Today's puzzle is ready, press **Play**!`;
  let text = `${g.emoji} **${yesterday ? "Yesterday's " : ""}${g.name}** · ${no} · ${day}\n\n`;
  // Everyone is numbered; ties share a number and the next one skips ahead (1, 1, 3). The top three places
  // get medals, except a Hen Pecks phrase that got away. The "\." keeps Discord from renumbering it as a list.
  let place = 0;
  for (const [i, p] of players.entries()) {
    if (i === 0 || rank(p.result) !== rank(players[i - 1].result)) place = i + 1;
    const won = !(p.result.game === "pecks" && p.result.outcome === "miss");
    const medal = won && place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] + " " : "";
    // An @mention, which shows the player's name in that server and is clickable. message() turns off
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
