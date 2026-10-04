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
function run({ replies = [], items = [item()], feedStatus = 200, args = [], env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "update-test-"));
  const file = join(dir, "stories.json");
  const log = join(dir, "requests.jsonl");
  const before = JSON.stringify([OLD_STORY], null, 2) + "\n";
  writeFileSync(file, before);
  const result = spawnSync(process.execPath, ["--import", FAKE, SCRIPT, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: "test-key",
      ONLY_SOURCE: "",
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
    /cut off at the 16000-token limit \(stop_reason max_tokens/,
  ],
  "an article that isn't in the list": [{ replies: [reply(story({ id: "made-up" }))] }, /isn't in the list: made-up/],
  "a missing summary": [{ replies: [reply(story({ summary: " " }))] }, /Story is missing: summary/],
  "a painting with too few shapes": [{ replies: [reply(story({ scene: "<circle/>" }))] }, /Painting rejected/],
  "a painting that's too big": [{ replies: [reply(story({ scene: "<circle/>".repeat(201) }))] }, /Painting rejected/],
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
