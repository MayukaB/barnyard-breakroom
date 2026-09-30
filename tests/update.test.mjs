// Tests for scripts/update.mjs, the daily story pipeline. Run: npm run test:scripts
// Each test runs the real script on a copy of a small story list, with the Anthropic API
// replaced by tests/fixtures/fake-anthropic.mjs, so nothing is sent anywhere and no key is needed.
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
const story = (overrides = {}) => ({
  new: true,
  id: "kiwi-return-to-wellington",
  title: "  Kiwi return to Wellington  ",
  url: "https://news.mongabay.com/2026/09/kiwi-return-to-wellington/",
  published: "2026-09-29",
  animal: "Kiwi",
  summary: "Kiwi are back.",
  caption: "Home at last",
  alt: "A kiwi in a fern forest.",
  scene: SCENE,
  ...overrides,
});
const reply = (obj) => ({ text: JSON.stringify(obj) });

// Runs the script and returns its exit code, output, the story list afterwards and the requests it sent.
function run({ replies = [], args = [], env = {} } = {}) {
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

test("adds a new story to the top of the list, tidied and credited", () => {
  const r = run({ replies: [reply(story())] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Added from Mongabay: Kiwi return to Wellington \(Kiwi\)/);
  assert.equal(r.stories.length, 2);
  const [added, old] = r.stories;
  assert.equal(old.id, "old-story");
  assert.equal(added.id, "kiwi-return-to-wellington");
  assert.equal(added.title, "Kiwi return to Wellington");
  assert.equal(added.source, "Mongabay");
  assert.equal(added.published, "2026-09-29");
  assert.equal(added.addedAt, new Date().toISOString().slice(0, 10));
  assert.equal("new" in added, false);
});

test("asks for an animal story from Mongabay only, with the sad-story rules", () => {
  const r = run({ replies: [reply(story())] });
  assert.equal(r.requests.length, 1);
  const [req] = r.requests;
  assert.deepEqual(req.tools[0].allowed_domains, ["news.mongabay.com"]);
  const prompt = req.messages[0].content;
  assert.match(prompt, /news\.mongabay\.com\/list\/animals/);
  assert.match(prompt, /main subject is an animal/);
  assert.match(prompt, /Sad stories: the animal stays cute/);
  assert.match(prompt, /"old-story"/, "the prompt lists the stories already on the site");
});

test("keeps going after a paused turn", () => {
  const r = run({ replies: [{ text: "", stop_reason: "pause_turn" }, reply(story())] });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.requests.length, 2);
  assert.equal(r.stories[0].id, "kiwi-return-to-wellington");
});

test("a quiet day changes nothing and still succeeds", () => {
  const r = run({ replies: [reply({ new: false, reason: "nothing new" })] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Mongabay: nothing new \(nothing new\)/);
  assert.ok(r.unchanged);
});

test("a story that's already on the site isn't added twice", () => {
  const r = run({ replies: [reply(story({ id: "old-story" }))] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /old-story is already on the site/);
  assert.ok(r.unchanged);
});

// Replies that must be refused. With one source, a refused reply means every source failed,
// which exits with 1 so the alert issue opens.
const refused = {
  "a reply that isn't JSON": [{ text: "Sorry, the page returned 403." }, /wasn't valid JSON/],
  "a link to another site": [reply(story({ url: "https://evil.example/kiwi" })), /Unexpected article URL/],
  "a missing summary": [reply(story({ summary: " " })), /Story is missing: summary/],
  "a painting with too few shapes": [reply(story({ scene: "<circle/>" })), /Painting rejected/],
  "a painting that's too big": [reply(story({ scene: "<circle/>".repeat(201) })), /Painting rejected/],
  "an API error": [{ status: 401, body: "invalid x-api-key" }, /Anthropic API 401/],
};
for (const [name, [answer, message]] of Object.entries(refused)) {
  test(`refuses ${name} and leaves the list alone`, () => {
    const r = run({ replies: [answer] });
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
