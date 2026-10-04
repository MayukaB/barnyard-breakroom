// Adds the newest animal news story to stories.json, with a storybook
// watercolor painting drawn by Claude.
// Usage: ANTHROPIC_API_KEY=... node scripts/update.mjs [source]
// With a source key (see SOURCES) it only tries that source.
import { readFile, writeFile } from "node:fs/promises";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
// STORIES_FILE lets the tests work on a copy instead of the real list.
const FILE = process.env.STORIES_FILE || new URL("../public/stories.json", import.meta.url);

// Every source here allows a summary in our own words plus a link back
// (Mongabay uses CC BY-ND).
// Don't add a source without checking its terms and robots.txt first. National Geographic
// (Disney's terms) and The Guardian forbid using their articles with AI, and The
// Conversation blocks Claude.
const SOURCES = [
  {
    key: "mongabay",
    name: "Mongabay",
    list: "https://news.mongabay.com/list/animals/",
    domains: ["news.mongabay.com"],
    url: /^https:\/\/news\.mongabay\.com\//,
  },
];
// Older articles would land below newer paintings on the page, so they're skipped.
const MAX_AGE_DAYS = 14;

if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const only = process.argv[2] || process.env.ONLY_SOURCE || "";
if (only && !SOURCES.some((s) => s.key === only)) {
  console.error(`Unknown source "${only}". Use one of: ${SOURCES.map((s) => s.key).join(", ")}.`);
  process.exit(1);
}

const stories = JSON.parse(await readFile(FILE, "utf8"));
const known = new Set(stories.map((s) => s.id));
const today = new Date().toISOString().slice(0, 10);

const prompt = (
  src,
) => `You keep a storybook site that paints a new animal news story each day. Today's source is ${src.name}.

1. Use web_fetch on ${src.list} and go down the list from the top. Pick the FIRST article whose main subject is an animal: a species, a group of animals or one particular animal.
   - Skip videos, galleries, quizzes and podcasts.
   - Skip stories where animals are only a side note, such as climate, pollution, energy, forests, farming, policy, events or profiles of people.
   - Sad stories are welcome (deaths, disease, culls, poaching, decline) as long as the animal is at the heart of the story.
   - Only consider articles published in the last ${MAX_AGE_DAYS} days. Today is ${today}.
2. Its id is the last non-empty path segment of its URL. These ids are already on the site: ${JSON.stringify([...known])}.
   If the article you picked is in that list, or no article qualifies, or the page can't be fetched, reply with only: {"new": false, "reason": "<a few words>"}
3. Otherwise web_fetch the article and paint it.

Painting rules (SVG inner markup for viewBox "0 0 400 300"):
- Only these tags: g, path, circle, ellipse, rect, line, polyline, polygon. No <svg> wrapper, no text, script, image, ids, gradients or defs. Double-quoted attributes.
- Filters already defined on the page: filter="url(#wc)" for watercolor shapes with soft darkened edges, filter="url(#wash)" for loose background washes, filter="url(#line)" for wobbly pencil lines (strokes with fill="none"). Paper texture is added automatically on a cream background.
- 70-130 elements, back to front: a sky/background wash that bleeds past the edges (e.g. x="-10" width="420"), the landscape, then the animal as the clear hero near the centre. fill-opacity 0.55-0.95 so layers glaze. Soft, slightly muted storybook palette suited to the habitat.
- Make the animal adorable and recognisable: big round head, simple dot or happy-arc eyes, small pink blush cheeks (~0.55 opacity), a rounded chunky body, and its key features.
- Match the story's mood:
  - Happy or hopeful stories: warm light and a contented animal.
  - Sad stories: the animal stays cute, but the scene is gently sad. Use a cooler, greyer palette, dusk or soft rain, droopy ears or a small tear, the animal curled up, sheltering or looking on. Hint at the loss (an empty nest, a wilted flower, fading footprints, a lone survivor) rather than showing it. Never show blood, wounds, weapons or a dead animal.
- Fill the scene with storybook detail, keeping the animal the clear hero:
  - background life: clouds, distant hills or trees, small birds or far-off animals
  - the animal: fur or feather tufts, a lighter belly or muzzle, paw pads, a soft shadow on the ground beneath it
  - foreground texture: grass tufts, pebbles, flowers, leaves or ripples suited to the habitat
  - three to five small details from the story itself
  The watercolor filter softens edges, so make small details at least 6 units across and give them slightly darker colors than their surroundings.

Reply with only this JSON, nothing else:
{"new": true, "id": "<id>", "title": "<exact headline>", "url": "<full https article URL>",
 "published": "<YYYY-MM-DD, or ${today} if not shown>", "animal": "<short common name>",
 "summary": "<2-3 sentences in your own words; never copy the article's text. Be honest about sad news, gently and without graphic detail>",
 "caption": "<a 4-9 word storybook caption in the story's mood; tender for sad stories>", "alt": "<one sentence describing the painting>",
 "scene": "<the SVG markup>"}`;

// Each API call gets 5 minutes (it includes Claude's own page fetches). Temporary
// failures (rate limits, overload, network errors, timeouts) are retried twice.
const CALL_TIMEOUT_MS = 5 * 60 * 1000;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 16000;
// Server tools can pause a long turn; it's resent up to this many times.
const MAX_ROUNDS = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(messages, src) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await postMessages(messages, src);
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

function postMessages(messages, src) {
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
      max_tokens: MAX_TOKENS,
      messages,
      tools: [
        {
          type: "web_fetch_20250910",
          name: "web_fetch",
          max_uses: 4,
          allowed_domains: src.domains,
        },
      ],
    }),
  });
}

// Asks Claude for the source's newest animal story. Returns the checked story,
// or null when there's nothing new. Throws when the reply is unusable.
async function fromSource(src) {
  // Resend paused turns until Claude finishes.
  const messages = [{ role: "user", content: prompt(src) }];
  let reply;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    reply = await callClaude(messages, src);
    if (reply.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: reply.content });
  }

  const text = reply.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  // A reply that didn't finish is cut off mid-painting, so say why rather than "not JSON".
  const why = `stop_reason ${reply.stop_reason}, ${reply.usage?.output_tokens ?? "?"} output tokens`;
  if (reply.stop_reason === "max_tokens") {
    throw new Error(`Claude's reply was cut off at the ${MAX_TOKENS}-token limit (${why}).`);
  }
  if (reply.stop_reason === "pause_turn") {
    throw new Error(`Claude was still working after ${MAX_ROUNDS} rounds (${why}).`);
  }
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let story;
  try {
    story = JSON.parse(json);
  } catch {
    throw new Error(`Claude's reply wasn't valid JSON (${why}):\n` + text);
  }

  if (!story.new) {
    console.log(`${src.name}: nothing new (${story.reason || story.id || "no reason given"}).`);
    return null;
  }

  const id = String(story.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 200);
  const required = ["title", "url", "published", "animal", "summary", "caption", "alt", "scene"];
  const missing = required.filter((k) => typeof story[k] !== "string" || !story[k].trim());
  if (!id || missing.length) throw new Error(`Story is missing: ${missing.join(", ") || "id"}`);
  if (known.has(id)) {
    console.log(`${src.name}: nothing new (${id} is already on the site).`);
    return null;
  }
  // The prompt asks for 70-130 shapes (older paintings are ~4 KB with ~40 shapes).
  // Refuse anything far outside that so one bad reply can't bloat stories.json.
  const MAX_SCENE_CHARS = 30000;
  const shapes = (story.scene.match(/<(g|path|circle|ellipse|rect|line|polyline|polygon)\b/g) || []).length;
  if (story.scene.length > MAX_SCENE_CHARS || shapes < 10 || shapes > 200) {
    throw new Error(
      `Painting rejected: ${story.scene.length} characters, ${shapes} shapes (allowed: up to ${MAX_SCENE_CHARS} characters, 10-200 shapes).`,
    );
  }
  if (!src.url.test(story.url)) throw new Error(`Unexpected article URL: ${story.url}`);

  return {
    id,
    title: story.title.trim(),
    summary: story.summary.trim(),
    url: story.url.trim(),
    source: src.name,
    published: /^\d{4}-\d{2}-\d{2}$/.test(story.published) ? story.published : today,
    animal: story.animal.trim(),
    caption: story.caption.trim(),
    alt: story.alt.trim(),
    addedAt: today,
    scene: story.scene.trim(),
  };
}

// With more than one source, each day starts with a different one, so the site rotates.
// If that source has nothing new (or can't be read), the next one gets a turn.
const day = Math.floor(Date.parse(today) / 864e5);
const order = only ? SOURCES.filter((s) => s.key === only) : SOURCES.map((_, i) => SOURCES[(day + i) % SOURCES.length]);

let failures = 0;
for (const src of order) {
  let story;
  try {
    story = await fromSource(src);
  } catch (err) {
    failures++;
    console.error(`${src.name}: ${err.message}`);
    continue;
  }
  if (!story) continue;
  stories.unshift(story);
  await writeFile(FILE, JSON.stringify(stories, null, 2) + "\n");
  console.log(`Added from ${src.name}: ${story.title} (${story.animal})`);
  process.exit(0);
}

// Quiet days are normal. Fail the run (which opens an alert issue) only when
// every source broke, since that points at the API key, the model or this script.
if (failures === order.length) {
  console.error("Every source failed.");
  process.exit(1);
}
console.log("No new story today.");
