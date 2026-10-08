// A stand-in for the Discord app, for tests/discord-client.spec.js. It shows an Activity in a frame and
// answers Discord's SDK (public/vendor/discord-sdk.js, the real one) the way Discord does: the handshake
// with READY, and commands (AUTHORIZE, OPEN_EXTERNAL_LINK, SHARE_LINK, …) with replies. Every message the
// Activity sends is kept in window.rpc for the tests to check.
// It runs at http://localhost:3333, one of the addresses the SDK accepts messages from (for Discord's
// own development), so the page's origin is right without a real Discord. Started by playwright.config.js.
//   http://localhost:3333/?activity=<the Activity's address, with Discord's launch details>
import { createServer } from "node:http";

const PORT = 3333;

const page = (activity) => `<!doctype html><meta charset="utf-8"><title>Discord (stand-in)</title>
<style>body{margin:0}iframe{border:0;width:100vw;height:100vh;display:block}</style>
<iframe id="activity" src="${activity.replace(/"/g, "&quot;")}"></iframe>
<script>
  window.rpc = [];
  const frame = document.getElementById("activity");
  const READY = { v: 1, config: { cdn_host: "cdn.discordapp.com", api_endpoint: "//discord.com/api", environment: "production" } };
  const REPLIES = { AUTHORIZE: { code: "the-code" }, OPEN_EXTERNAL_LINK: { opened: true }, SHARE_LINK: { success: true } };
  addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow || !Array.isArray(e.data)) return;
    const [op, msg] = e.data;
    window.rpc.push({ op, ...msg });
    const send = (m) => frame.contentWindow.postMessage(m, "*");
    if (op === 0) send([1, { cmd: "DISPATCH", evt: "READY", nonce: null, data: READY }]); // handshake
    else if (op === 1) send([1, { cmd: msg.cmd, evt: null, nonce: msg.nonce, data: REPLIES[msg.cmd] ?? null }]);
  });
</script>`;

createServer((req, res) => {
  const activity = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("activity") || "about:blank";
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(activity));
}).listen(PORT, () => console.log(`Discord stand-in on http://localhost:${PORT}`));
