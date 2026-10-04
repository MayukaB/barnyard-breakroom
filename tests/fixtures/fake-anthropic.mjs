// Stands in for the Anthropic API and the source's feed when tests/update.test.mjs runs
// scripts/update.mjs. Loaded with `node --import`, it replaces fetch before the script starts.
//   FAKE_REPLIES: a JSON array, one entry per API call, used in order. Each entry is either
//     { text, stop_reason }  a normal reply whose text block is `text` (stop_reason defaults to "end_turn")
//     { status, body }       an HTTP error
//   FAKE_FEED: the XML any feed request gets back; FAKE_FEED_STATUS: its HTTP status (default 200).
//   FAKE_LOG: a file that gets one JSON line per API request body, so tests can check what was sent.
import { appendFileSync } from "node:fs";

const replies = JSON.parse(process.env.FAKE_REPLIES || "[]");
let call = 0;

globalThis.fetch = async (url, options) => {
  if (String(url).endsWith("/feed/")) {
    return new Response(process.env.FAKE_FEED || "", { status: Number(process.env.FAKE_FEED_STATUS || 200) });
  }
  if (!String(url).startsWith("https://api.anthropic.com/")) throw new Error(`Unexpected fetch: ${url}`);
  if (process.env.FAKE_LOG) appendFileSync(process.env.FAKE_LOG, options.body + "\n");
  const reply = replies[call++];
  if (!reply) throw new Error(`No fake reply left for API call ${call}`);
  if (reply.status) return new Response(reply.body || "error", { status: reply.status });
  const content = [{ type: "text", text: reply.text }];
  return new Response(JSON.stringify({ stop_reason: reply.stop_reason || "end_turn", content }), { status: 200 });
};
