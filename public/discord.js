/* Barnyard Breakroom as a Discord Activity. Loaded by pecks.html and biscuit.html as a module; on the
   website it does nothing. Inside Discord (site.js sets window.InDiscord) it:
   - connects to Discord with the Embedded App SDK (vendor/discord-sdk.js) and asks the player to let the
     game know who they are (the "identify" scope only),
   - when the game ends (the game's "game:finished" event, or a finished game already saved on this
     device), sends window.GameResult() to the discord-activity function, which posts it in the channel
     (supabase/functions/discord-activity),
   - turns "Copy my result" into "Share in Discord", since the clipboard is often blocked in Discord,
   - opens links to other pages in the player's browser, because the Activity can only show its own game.
   The app ID is the first part of the address (<app id>.discordsays.com). The function is reached through
   the app's /x/supabase URL mapping (README, Discord Activities). */
const API = "/x/supabase/functions/v1/discord-activity";
const SITE = "https://barnyardbreakroom.com";
const $ = (id) => document.getElementById(id);
let sdk = null;

// How far the connection to Discord got, so a failure can say which step went wrong (on the result
// screen, in the console, and to the visit counts as discord-failed-<step>).
let step = "loading Discord's script";
const STEPS = {};
const timeout = (ms, what) => new Promise((_, no) => setTimeout(() => no(new Error(`no answer to ${what}`)), ms));

async function main() {
  if (!window.InDiscord) return;
  const game = location.pathname.replace(/^\/|\.html$/g, "");
  const appId = location.hostname.split(".")[0];
  const { DiscordSDK } = await import("./vendor/discord-sdk.js");
  step = "connecting to Discord";
  sdk = new DiscordSDK(appId);
  await Promise.race([sdk.ready(), timeout(15000, "the connection")]);

  // Links to anything but this page open in the browser instead (on the website, not the proxy).
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    const target = url.origin === location.origin ? SITE + url.pathname + url.hash : url.href;
    sdk.commands.openExternalLink({ url: target }).catch(() => {});
  });

  // Who's playing: Discord gives the game a one-time code, the function swaps it for a token.
  // The first time, Discord asks the player to allow it, so there's no time limit on that step.
  step = "asking Discord who's playing";
  const token = (async () => {
    const { code } = await sdk.commands.authorize({
      client_id: appId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });
    step = "signing in";
    const r = await post("token", { game, code });
    step = "signed in";
    return r.access_token;
  })();
  token.catch(failed);

  let sent = null; // the date already sent, so a result is only sent once per page view
  async function report() {
    const result = window.GameResult?.();
    if (!result || sent === result.date) return;
    sent = result.date;
    shareButton(result);
    if (step !== "signed in" && !STEPS.failed) note("Waiting for Discord to say who’s playing…");
    try {
      const access_token = await token;
      step = "posting your result";
      const r = await post("result", {
        game,
        access_token,
        channel_id: sdk.channelId,
        result: { ...result, text: undefined },
      });
      note(
        r.posted
          ? "Your result is in the channel."
          : `Couldn’t post your result in this channel (${r.reason}). Share it instead?`,
      );
    } catch (e) {
      sent = null;
      failed(e);
    }
  }
  document.addEventListener("game:finished", report);
  report();
}

function failed(e) {
  if (STEPS.failed === step) return; // once per step
  STEPS.failed = step;
  const why = String(e?.message || e).slice(0, 80);
  console.warn("Discord:", step, e);
  window.Stats?.event(`discord-failed-${step.replace(/\W+/g, "-")}`, why);
  note(`Couldn’t post your result: something went wrong ${step} (${why}).`);
}

async function post(path, body) {
  const r = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} answered ${r.status}`);
  return r.json();
}

// "Copy my result" → "Share in Discord": Discord's own share dialog, with the result (minus the
// website address, which Discord replaces with a link to the Activity).
function shareButton(result) {
  const old = $("share");
  if (!old || old.dataset.discord) return;
  const b = old.cloneNode(true); // drops the game's copy-to-clipboard handler
  b.dataset.discord = "1";
  b.textContent = "Share in Discord";
  b.addEventListener("click", () => {
    window.Stats?.event(`${result.game}-shared-discord`, "Shared a result in Discord");
    sdk.commands.shareLink({ message: result.text.replace(/\n\S+$/, "") }).catch(() => {});
  });
  old.replaceWith(b);
}

function note(text) {
  let p = $("discordNote");
  if (!p) {
    p = document.createElement("p");
    p.id = "discordNote";
    p.className = "discord-note";
    p.setAttribute("role", "status");
    $("share")?.closest(".actions")?.before(p);
  }
  p.textContent = text;
}

main().catch(failed);
