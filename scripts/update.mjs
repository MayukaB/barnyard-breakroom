// Adds the newest National Geographic animal story to stories.json,
// with a storybook watercolor painting drawn by Claude.
// Usage: ANTHROPIC_API_KEY=... node scripts/update.mjs
import { readFile, writeFile } from "node:fs/promises";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const FILE = new URL("../stories.json", import.meta.url);
const SOURCE = "https://www.nationalgeographic.com/animals";

if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const stories = JSON.parse(await readFile(FILE, "utf8"));
const known = new Set(stories.map((s) => s.id));
const today = new Date().toISOString().slice(0, 10);

const PROMPT = `You keep a storybook site that paints the newest National Geographic animal story each day.

1. Use web_fetch on ${SOURCE} and find the FIRST (top) animal article listed. Skip videos, galleries, quizzes and anything not about animals.
2. Its id is the last path segment of its URL. These ids are already on the site: ${JSON.stringify([...known])}.
   If the top article's id is in that list, reply with only: {"new": false, "id": "<id>"}
3. Otherwise web_fetch the article and paint it.

Painting rules (SVG inner markup for viewBox "0 0 400 300"):
- Only these tags: g, path, circle, ellipse, rect, line, polyline, polygon. No <svg> wrapper, no text, script, image, ids, gradients or defs. Double-quoted attributes.
- Filters already defined on the page: filter="url(#wc)" for watercolor shapes with soft darkened edges, filter="url(#wash)" for loose background washes, filter="url(#line)" for wobbly pencil lines (strokes with fill="none"). Paper texture is added automatically on a cream background.
- 25-60 elements, back to front: a sky/background wash that bleeds past the edges (e.g. x="-10" width="420"), the landscape, then the animal as the clear hero near the centre. fill-opacity 0.55-0.95 so layers glaze. Soft, warm, slightly muted storybook palette suited to the habitat.
- Make the animal adorable and recognisable: big round head, simple dot or happy-arc eyes, small pink blush cheeks (~0.55 opacity), a rounded chunky body, and its key features. Add one or two small details from the story.

Reply with only this JSON, nothing else:
{"new": true, "id": "<id>", "title": "<exact headline>", "url": "<full https article URL>",
 "published": "<YYYY-MM-DD, or ${today} if not shown>", "animal": "<short common name>",
 "summary": "<2-3 sentences in your own words; never copy the article's text>",
 "caption": "<a sweet 4-9 word storybook caption>", "alt": "<one sentence describing the painting>",
 "scene": "<the SVG markup>"}`;

// Each API call gets 5 minutes (it includes Claude's own page fetches). Temporary
// failures (rate limits, overload, network errors, timeouts) are retried twice.
const CALL_TIMEOUT_MS = 5 * 60 * 1000;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(messages) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await postMessages(messages);
    } catch (err) {
      // fetch throws on network errors and when the timeout aborts the request.
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`Anthropic API call failed (${err.name}: ${err.message}); retrying in ${20 * attempt}s.`);
        await sleep(20_000 * attempt);
        continue;
      }
      throw new Error(`Anthropic API unreachable after ${attempt} attempts: ${err.message}`);
    }
    if (res.ok) return res.json();
    const body = await res.text();
    if (RETRY_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
      console.warn(`Anthropic API ${res.status}; retrying in ${20 * attempt}s.`);
      await sleep(20_000 * attempt);
      continue;
    }
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }
}

function postMessages(messages) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      messages,
      tools: [
        {
          type: "web_fetch_20250910",
          name: "web_fetch",
          max_uses: 4,
          allowed_domains: ["nationalgeographic.com", "www.nationalgeographic.com"],
        },
      ],
    }),
  });
}

// Server tools can pause a long turn; resend until Claude finishes.
const messages = [{ role: "user", content: PROMPT }];
let reply;
for (let round = 0; round < 5; round++) {
  reply = await callClaude(messages);
  if (reply.stop_reason !== "pause_turn") break;
  messages.push({ role: "assistant", content: reply.content });
}

const text = reply.content.filter((b) => b.type === "text").map((b) => b.text).join("");
const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
let story;
try {
  story = JSON.parse(json);
} catch {
  console.error("Claude's reply wasn't valid JSON:\n" + text);
  process.exit(1);
}

if (!story.new) {
  console.log(`No new story today (top story is still ${story.id}).`);
  process.exit(0);
}

const id = String(story.id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 200);
const required = ["title", "url", "published", "animal", "summary", "caption", "alt", "scene"];
const missing = required.filter((k) => typeof story[k] !== "string" || !story[k].trim());
if (!id || missing.length) {
  console.error(`Story is missing: ${missing.join(", ") || "id"}`);
  process.exit(1);
}
if (known.has(id)) {
  console.log(`No new story today (${id} is already on the site).`);
  process.exit(0);
}
if (!/^https:\/\/(www\.)?nationalgeographic\.com\//.test(story.url)) {
  console.error(`Unexpected article URL: ${story.url}`);
  process.exit(1);
}

stories.unshift({
  id,
  title: story.title.trim(),
  summary: story.summary.trim(),
  url: story.url.trim(),
  source: "National Geographic",
  published: /^\d{4}-\d{2}-\d{2}$/.test(story.published) ? story.published : today,
  animal: story.animal.trim(),
  caption: story.caption.trim(),
  alt: story.alt.trim(),
  addedAt: today,
  scene: story.scene.trim(),
});
await writeFile(FILE, JSON.stringify(stories, null, 2) + "\n");
console.log(`Added: ${story.title} (${story.animal})`);
