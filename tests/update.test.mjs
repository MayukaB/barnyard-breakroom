// Tests for scripts/update.mjs, the daily story pipeline. Run: npm run test:scripts
// Each test runs the real script on a copy of a small story list, with the Anthropic API and the
// source's feed replaced by tests/fixtures/fake-anthropic.mjs, so nothing is sent anywhere and no key is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/update.mjs", import.meta.url));
const FAKE = new URL("fixtures/fake-anthropic.mjs", import.meta.url).href;

const OLD_STORY = { id: "old-story", title: "An old story", addedAt: "2026-09-01", scene: "<rect/>" };
const SCENE = '<circle cx="200" cy="150" r="20" fill="#E3B98A"/>'.repeat(20);
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

// One feed entry, written the way Mongabay's feed writes them.
const item = ({
  slug = "kiwi-return-to-wellington",
  title = "Kiwi&#8217;s return to Wellington",
  url = `https://news.mongabay.com/2026/09/${slug}/`,
  date = daysAgo(1),
  tags = "Animals, Birds",
  text = "<p>Kiwi are back in the hills &amp; valleys.</p>",
} = {}) => `<item>
  <title>${title}</title>
  <link>${url}</link>
  <pubDate>${date.toUTCString()}</pubDate>
  <topic-tags><![CDATA[${tags}]]></topic-tags>
  <description><![CDATA[Kiwi are back [&#8230;]]]></description>
  <content:encoded><![CDATA[${text}]]></content:encoded>
</item>`;
const feed = (...items) =>
  `<?xml version="1.0"?><rss><channel><title>News on Animals</title>${items.join("")}</channel></rss>`;

// Claude's side: which article it picked, and the painting.
const story = (overrides = {}) => ({
  new: true,
  id: "kiwi-return-to-wellington",
  animal: "Kiwi",
  summary: "Kiwi are back.",
  caption: "Home at last",
  alt: "A kiwi in a fern forest.",
  scene: SCENE,
  ...overrides,
});
const reply = (obj) => ({ text: JSON.stringify(obj) });

// Runs the script and returns its exit code, output, the story list afterwards and the API requests it sent.
function run({ replies = [], items = [item()], feedStatus = 200, args = [], env = {}, list = [OLD_STORY] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "update-test-"));
  const file = join(dir, "stories.json");
  const log = join(dir, "requests.jsonl");
  const before = JSON.stringify(list, null, 2) + "\n";
  writeFileSync(file, before);
  const result = spawnSync(process.execPath, ["--import", FAKE, SCRIPT, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: "test-key",
      ONLY_SOURCE: "",
      EXTRA_STORY: "",
      STORIES_FILE: file,
      FAKE_REPLIES: JSON.stringify(replies),
      FAKE_FEED: feed(...items),
      FAKE_FEED_STATUS: String(feedStatus),
      FAKE_LOG: log,
      ...env,
    },
  });
  const after = readFileSync(file, "utf8");
  const requests = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map(JSON.parse) : [];
  return {
    code: result.status,
    out: result.stdout + result.stderr,
    stories: JSON.parse(after),
    unchanged: after === before,
    requests,
  };
}

test("adds a new story to the top of the list, with its title, link and date from the feed", () => {
  const r = run({ replies: [reply(story())] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Added from Mongabay: Kiwi’s return to Wellington \(Kiwi\)/);
  assert.equal(r.stories.length, 2);
  const [added, old] = r.stories;
  assert.equal(old.id, "old-story");
  assert.equal(added.id, "kiwi-return-to-wellington");
  assert.equal(added.title, "Kiwi’s return to Wellington");
  assert.equal(added.url, "https://news.mongabay.com/2026/09/kiwi-return-to-wellington/");
  assert.equal(added.published, daysAgo(1).toISOString().slice(0, 10));
  assert.equal(added.source, "Mongabay");
  assert.equal(added.addedAt, new Date().toISOString().slice(0, 10));
  assert.equal("new" in added, false);
});

test("gives Claude the feed's articles as plain text, with the sad-story rules", () => {
  const r = run({ replies: [reply(story())] });
  assert.equal(r.requests.length, 1);
  const [req] = r.requests;
  assert.deepEqual(req.tools[0].allowed_domains, ["news.mongabay.com"]);
  const prompt = req.messages[0].content;
  assert.match(prompt, /id="kiwi-return-to-wellington"/);
  assert.match(prompt, /tags="Animals, Birds"/);
  assert.match(prompt, /Kiwi are back in the hills & valleys\./, "HTML tags and entities are removed");
  assert.match(prompt, /main subject is an animal/);
  assert.match(prompt, /Sad stories: the animal stays cute/);
  assert.match(prompt, /If it can't be fetched, work from its opening paragraphs/);
});

test("leaves out old articles, ones already on the site and links to other sites", () => {
  const items = [
    item({ slug: "old-story" }),
    item({ slug: "two-weeks-ago", date: daysAgo(20) }),
    item({ slug: "elsewhere", url: "https://evil.example/elsewhere/" }),
    item(),
  ];
  const r = run({ items, replies: [reply(story())] });
  assert.equal(r.code, 0, r.out);
  const prompt = r.requests[0].messages[0].content;
  assert.doesNotMatch(prompt, /old-story|two-weeks-ago|elsewhere/);
  assert.match(prompt, /kiwi-return-to-wellington/);
});

test("doesn't call Claude when the feed has nothing new", () => {
  const r = run({ items: [item({ slug: "old-story" })] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Mongabay: nothing new/);
  assert.equal(r.requests.length, 0);
  assert.ok(r.unchanged);
});

const TODAYS_STORY = { ...OLD_STORY, id: "todays-story", addedAt: new Date().toISOString().slice(0, 10) };

test("stops without calling Claude when today's story is already up", () => {
  const r = run({ list: [TODAYS_STORY, OLD_STORY], replies: [reply(story())] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Today's story is already up/);
  assert.equal(r.requests.length, 0);
  assert.ok(r.unchanged);
});

test("EXTRA_STORY adds a second story on the same day", () => {
  const r = run({ list: [TODAYS_STORY, OLD_STORY], replies: [reply(story())], env: { EXTRA_STORY: "1" } });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.stories.length, 3);
  assert.equal(r.stories[0].id, "kiwi-return-to-wellington");
});

test("keeps going after a paused turn", () => {
  const r = run({ replies: [{ text: "", stop_reason: "pause_turn" }, reply(story())] });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.requests.length, 2);
  assert.equal(r.stories[0].id, "kiwi-return-to-wellington");
});

test("gives up when the turn is still paused after five rounds", () => {
  const paused = { text: "", stop_reason: "pause_turn" };
  const r = run({ replies: Array(5).fill(paused) });
  assert.equal(r.code, 1, r.out);
  assert.equal(r.requests.length, 5);
  assert.match(r.out, /still working after 5 rounds/);
  assert.ok(r.unchanged);
});

test("a quiet day changes nothing and still succeeds", () => {
  const r = run({ replies: [reply({ new: false, reason: "no animal stories" })] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Mongabay: nothing new \(no animal stories\)/);
  assert.ok(r.unchanged);
});

// Feeds and replies that must be refused. With one source, a refusal means every source failed,
// which exits with 1 so the alert issue opens.
const refused = {
  "a feed that's blocked": [{ feedStatus: 403 }, /Feed 403/],
  "a feed with no articles": [{ items: [] }, /Feed had no articles/],
  "a reply that isn't JSON": [{ replies: [{ text: "Sorry." }] }, /wasn't valid JSON \(stop_reason end_turn/],
  "a reply cut off at the token limit": [
    { replies: [{ text: JSON.stringify(story()).slice(0, 300), stop_reason: "max_tokens" }] },
    /cut off at the 48000-token limit \(stop_reason max_tokens/,
  ],
  "an article that isn't in the list": [{ replies: [reply(story({ id: "made-up" }))] }, /isn't in the list: made-up/],
  "a missing summary": [{ replies: [reply(story({ summary: " " }))] }, /Story is missing: summary/],
  "a painting with too few shapes": [{ replies: [reply(story({ scene: "<circle/>" }))] }, /Painting rejected/],
  "a painting that's too big": [{ replies: [reply(story({ scene: "<circle/>".repeat(401) }))] }, /Painting rejected/],
  "an API error": [{ replies: [{ status: 401, body: "invalid x-api-key" }] }, /Anthropic API 401/],
};
for (const [name, [options, message]] of Object.entries(refused)) {
  test(`refuses ${name} and leaves the list alone`, () => {
    const r = run(options);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, message);
    assert.match(r.out, /Every source failed/);
    assert.ok(r.unchanged);
  });
}

test("keeps what's inside a painting wrapped in its own <svg> tag, which the page would draw blank", () => {
  const wrapped = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">${SCENE}</svg>`;
  const r = run({ replies: [reply(story({ scene: wrapped }))] });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.stories[0].scene, SCENE);
});

test("leaves out shapes whose position or size isn't a single number, and keeps the rest", () => {
  const bad = '<ellipse cx="280,268" rx="7" ry="4" fill="#b3a483"/>';
  const alsoBad = '<rect x="10" y="" width="5" height="5"></rect>';
  const r = run({ replies: [reply(story({ scene: SCENE + bad + alsoBad }))] });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.stories[0].scene, SCENE);
  assert.match(r.out, /left out 2 shapes/);
});

test("the source can be chosen, and unknown ones are refused", () => {
  assert.equal(run({ replies: [reply(story())], args: ["mongabay"] }).code, 0);
  const r = run({ args: ["natgeo"] });
  assert.equal(r.code, 1);
  assert.match(r.out, /Unknown source "natgeo"/);
  assert.equal(r.requests.length, 0);
});

test("stops before calling the API without a key", () => {
  const r = run({ env: { ANTHROPIC_API_KEY: "" } });
  assert.equal(r.code, 1);
  assert.match(r.out, /ANTHROPIC_API_KEY is not set/);
  assert.equal(r.requests.length, 0);
});

test("asks Opus 5.5 at high effort and prints what the call cost", () => {
  const r = run({ replies: [{ ...reply(story()), usage: { input_tokens: 15000, output_tokens: 20000 } }] });
  assert.equal(r.code, 0, r.out);
  const [req] = r.requests;
  assert.equal(req.model, "claude-opus-5-5");
  assert.equal(req.stream, true);
  assert.deepEqual(req.output_config, { effort: "high" });
  assert.match(req.messages[0].content, /mix-blend-mode:multiply/);
  assert.deepEqual(req.cache_control, { type: "ephemeral" });
  assert.match(
    r.out,
    /Mongabay: 1 round, 0 pages fetched; 15000 input tokens \(0 read from the cache, 0 written to it\), 20000 output tokens on claude-opus-5-5, about \$0\.46\./,
  );
});

test("refuses a reply Claude declined", () => {
  const r = run({ replies: [{ text: "", stop_reason: "refusal" }] });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Claude declined/);
  assert.ok(r.unchanged);
});

// Stories already on the site, for repainting.
const onSite = (n) => ({
  id: `story-${n}`,
  title: `Story ${n}`,
  url: `https://news.mongabay.com/2026/10/story-${n}/`,
  animal: "Kiwi",
  caption: "Home at last",
  summary: "Kiwi are back.",
  alt: "An old painting.",
  addedAt: TODAYS_STORY.addedAt,
  scene: "<rect/>",
});
const NEW_SCENE = '<ellipse cx="200" cy="150" rx="30" ry="20" fill="#8DB25E"/>'.repeat(20);

test("REPAINT with a number repaints the newest stories, even on a day with a story already up", () => {
  const list = [onSite(1), onSite(2), onSite(3)];
  const r = run({
    list,
    env: { REPAINT: "2" },
    replies: [reply({ alt: "A new painting.", scene: NEW_SCENE }), reply({ alt: "Another.", scene: NEW_SCENE })],
  });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.requests.length, 2);
  assert.match(r.requests[0].messages[0].content, /url="https:\/\/news\.mongabay\.com\/2026\/10\/story-1\/"/);
  assert.deepEqual(r.requests[0].tools[0].allowed_domains, ["news.mongabay.com"]);
  assert.deepEqual(
    r.stories.map((s) => [s.id, s.scene === NEW_SCENE, s.alt]),
    [
      ["story-1", true, "A new painting."],
      ["story-2", true, "Another."],
      ["story-3", false, "An old painting."],
    ],
  );
  assert.equal(r.stories[0].caption, "Home at last", "only the painting and alt text change");
  assert.match(r.out, /Repainted: Story 1/);
});

test("REPAINT with ids keeps the ones that worked and fails the run for the rest", () => {
  const list = [onSite(1), onSite(2), onSite(3)];
  const r = run({
    list,
    env: { REPAINT: "story-3 story-2" },
    replies: [reply({ alt: "New.", scene: NEW_SCENE }), reply({ alt: "Bad.", scene: "<circle/>" })],
  });
  assert.equal(r.code, 1, r.out);
  assert.equal(r.stories[2].scene, NEW_SCENE);
  assert.equal(r.stories[1].scene, "<rect/>");
  assert.match(r.out, /story-2: Painting rejected/);
  assert.match(r.out, /1 of 2 couldn't be repainted/);
});

test("REPAINT refuses an id that isn't on the site, without calling Claude", () => {
  const r = run({ list: [onSite(1)], env: { REPAINT: "nope" } });
  assert.equal(r.code, 1);
  assert.match(r.out, /No story with the id: nope/);
  assert.equal(r.requests.length, 0);
  assert.ok(r.unchanged);
});

test("REPAINT doesn't fetch a story from a site that's no longer a source", () => {
  const natgeo = { ...onSite(1), url: "https://www.nationalgeographic.com/animals/article/kiwi" };
  const r = run({ list: [natgeo], env: { REPAINT: "1" }, replies: [reply({ alt: "New.", scene: NEW_SCENE })] });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.requests[0].tools, undefined);
  assert.doesNotMatch(r.requests[0].messages[0].content, /web_fetch/);
  assert.equal(r.stories[0].scene, NEW_SCENE);
});

test("puts a streamed reply with thinking and a web fetch back together, and sends it back when paused", () => {
  const url = "https://news.mongabay.com/2026/09/kiwi-return-to-wellington/";
  const events = [
    { type: "message_start", message: { role: "assistant", content: [], usage: { input_tokens: 900 } } },
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "Plan the " } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "light." } },
    { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig123" } },
    { type: "content_block_stop", index: 0 },
    {
      type: "content_block_start",
      index: 1,
      content_block: { type: "server_tool_use", id: "srv_1", name: "web_fetch", input: {} },
    },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"url": "' } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: url + '"}' } },
    { type: "content_block_stop", index: 1 },
    {
      type: "content_block_start",
      index: 2,
      content_block: {
        type: "web_fetch_tool_result",
        tool_use_id: "srv_1",
        content: { type: "web_fetch_result", url },
      },
    },
    { type: "content_block_stop", index: 2 },
    { type: "message_delta", delta: { stop_reason: "pause_turn" }, usage: { output_tokens: 300 } },
    { type: "message_stop" },
  ];
  const r = run({ replies: [{ events }, { ...reply(story()), usage: { input_tokens: 100, output_tokens: 200 } }] });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.requests[1].messages[1], {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "Plan the light.", signature: "sig123" },
      { type: "server_tool_use", id: "srv_1", name: "web_fetch", input: { url } },
      { type: "web_fetch_tool_result", tool_use_id: "srv_1", content: { type: "web_fetch_result", url } },
    ],
  });
  assert.match(r.out, /2 rounds, 1 page fetched; 1000 input tokens/, "both rounds count toward the cost");
  assert.equal(r.stories[0].id, "kiwi-return-to-wellington");
});

test("prices tokens read from and written to the cache", () => {
  const usage = {
    input_tokens: 1000,
    cache_creation_input_tokens: 100000,
    cache_read_input_tokens: 200000,
    output_tokens: 10000,
  };
  const r = run({ replies: [{ ...reply(story()), usage }] });
  assert.equal(r.code, 0, r.out);
  // 1000 x $4 + 100000 x $5 + 200000 x $0.20 + 10000 x $20, per million = $0.744
  assert.match(
    r.out,
    /301000 input tokens \(200000 read from the cache, 100000 written to it\), 10000 output tokens on claude-opus-5-5, about \$0\.74\./,
  );
});
