// Stands in for the Anthropic API and the source's feed when tests/update.test.mjs runs
// scripts/update.mjs. Loaded with `node --import`, it replaces fetch before the script starts.
//   FAKE_REPLIES: a JSON array, one entry per API call, used in order. Each entry is either
//     { text, stop_reason, usage }  a normal reply whose text block is `text` (stop_reason defaults to "end_turn"), streamed
//     { events }             a reply streamed as exactly these events
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
  // A streamed reply, the way the API sends one (the script asks for stream: true): the text in two
  // pieces, sent in small chunks that cut through the events, to check they're put back together.
  const half = Math.floor(reply.text?.length / 2);
  const events = reply.events || [
    {
      type: "message_start",
      message: { role: "assistant", content: [], usage: { input_tokens: reply.usage?.input_tokens } },
    },
    { type: "ping" },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: reply.text.slice(0, half) } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: reply.text.slice(half) } },
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: reply.stop_reason || "end_turn" },
      usage: { output_tokens: reply.usage?.output_tokens },
    },
    { type: "message_stop" },
  ];
  const bytes = new TextEncoder().encode(
    events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""),
  );
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 37) controller.enqueue(bytes.slice(i, i + 37));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
};
