// Browser tests for the games inside a Discord Activity (public/discord.js). The browser is told that
// 111.discordsays.com is this computer, so the pages run at a Discord-style address. Discord's SDK and the
// discord-activity function are replaced with stand-ins that record what the game asked for.
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const port = Number(process.env.PORT || 4173);
const ACTIVITY = `http://111.discordsays.com:${port}`;
const LAUNCH = "?frame_id=f1&instance_id=i1&channel_id=c1&guild_id=g1&platform=desktop";
test.use({ launchOptions: { args: ["--host-resolver-rules=MAP *.discordsays.com 127.0.0.1"] } });

// Stands in for vendor/discord-sdk.js; every command is recorded in window.discordCalls.
const FAKE_SDK = `
window.discordCalls = [];
export class DiscordSDK {
  constructor(clientId) {
    const q = new URLSearchParams(location.search);
    this.clientId = clientId;
    window.discordReferrer = document.referrer; // the real SDK talks to this address
    this.channelId = q.get("channel_id");
    const record = (name, reply) => async (args) => (window.discordCalls.push([name, args]), reply);
    this.commands = {
      authorize: record("authorize", { code: "the-code" }),
      openExternalLink: record("openExternalLink", { opened: true }),
      shareLink: record("shareLink", { success: true }),
    };
  }
  ready() { return Promise.resolve(); }
}`;

let errors, sent, posted, tokenStatus;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  sent = [];
  posted = true;
  tokenStatus = 200;
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route(
    /supabase\.co|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)|\/x\/(gfonts|gstatic)\//,
    (r) => r.abort(),
  );
  await context.route("**/vendor/discord-sdk.js", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE_SDK }));
  await context.route("**/x/supabase/functions/v1/discord-activity/*", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").pop();
    sent.push([path, r.request().postDataJSON()]);
    if (path === "token" && tokenStatus !== 200) return r.fulfill({ status: tokenStatus, json: { error: "no" } });
    await r.fulfill({
      json: path === "token" ? { access_token: "the-token" } : { posted, reason: "not started here" },
    });
  });
  await context.addInitScript(() => ["biscuit", "pecks"].forEach((g) => localStorage.setItem("bb:howto:" + g, "1")));
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

const calls = (page, name) =>
  page.evaluate((n) => window.discordCalls.filter((c) => c[0] === n).map((c) => c[1]), name);

async function winPecks(page) {
  await page.clock.setFixedTime(new Date("2026-09-29T10:00:00"));
  await page.goto(`${ACTIVITY}/pecks.html${LAUNCH}`);
  await expect(page.locator("#puzzleNo")).toContainText("No. 3");
  for (const k of ["A", "O", "I", "U", "Y", "DF", "GL"]) await page.locator(`#peckPad .key[data-k="${k}"]`).click();
  const answer = "LET THE CAT OUT OF THE BAG";
  const slots = await page.locator(".tile.slot").evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
  for (const i of slots) await page.keyboard.press(answer[i]);
  await page.keyboard.press("Enter");
  await expect(page.locator("#verdict")).toHaveText("Egg-cellent!");
}

test("on the website, nothing loads from Discord", async ({ page }) => {
  const sdk = [];
  page.on("request", (r) => r.url().includes("discord") && sdk.push(r.url()));
  await page.clock.setFixedTime(new Date("2026-09-29T10:00:00"));
  await page.goto("/pecks.html");
  await expect(page.locator("#puzzleNo")).toContainText("No. 3");
  await expect(page.locator("html")).not.toHaveClass(/discord/);
  expect(sdk.filter((u) => !/\/discord\.js(\?|$)/.test(u))).toEqual([]);
});

test("winning Hen Pecks in Discord signs in with Discord and posts the result", async ({ page }) => {
  await winPecks(page);
  await expect(page.locator("#discordNote")).toHaveText("Your result is in the channel.");
  expect(await calls(page, "authorize")).toEqual([
    { client_id: "111", response_type: "code", state: "", prompt: "none", scope: ["identify"] },
  ]);
  expect(sent[0]).toEqual(["token", { game: "pecks", code: "the-code" }]);
  const [path, body] = sent[1];
  expect(path).toBe("result");
  expect(body).toMatchObject({ game: "pecks", access_token: "the-token", channel_id: "c1" });
  expect(body.result).toMatchObject({ game: "pecks", date: "2026-09-29", no: 3, outcome: "t1", hard: false });
  expect(body.result.hits).toHaveLength(7);
  expect(body.result.text).toBeUndefined(); // the function writes the message itself
  expect(sent).toHaveLength(2);

  // A reload of the finished game sends it again (the function only posts it once).
  await page.reload();
  await expect(page.locator("#discordNote")).toHaveText("Your result is in the channel.");
  expect(sent.filter(([p]) => p === "result")).toHaveLength(2);
});

test("in Discord, the menu, sign-in and the other game are hidden, and Share uses Discord's dialog", async ({
  page,
}) => {
  await winPecks(page);
  await expect(page.locator("#menuBtn")).toBeHidden();
  await expect(page.locator(".brand a")).not.toHaveAttribute("href");
  await expect(page.locator("#acctChip")).toBeHidden();
  await expect(page.locator("#otherGame")).toBeHidden();
  await expect(page.getByRole("link", { name: "Read today’s story →" })).toBeHidden();
  await page.getByRole("button", { name: "Share in Discord" }).click();
  await expect.poll(() => calls(page, "shareLink")).toHaveLength(1);
  const [{ message }] = await calls(page, "shareLink");
  expect(message).toMatch(/^Hen Pecks #3\nPecks: [🐣🥚]{7}\nCracked on try 1\/3 🐔$/u);
});

test("in Discord, any link to another page opens in the browser, at the website's address", async ({ page }) => {
  await winPecks(page);
  // The game has no such links in Discord now, so add one, as a later change might.
  await page.evaluate(() =>
    document.querySelector("#result").insertAdjacentHTML("beforeend", '<a href="./">Story</a>'),
  );
  await page.getByRole("link", { name: "Story" }).click();
  await expect.poll(() => calls(page, "openExternalLink")).toEqual([{ url: "https://barnyardbreakroom.com/" }]);
  expect(new URL(page.url()).pathname).toBe("/pecks.html");
});

test("when the result can't be posted, the player is offered Share instead", async ({ page }) => {
  posted = false;
  await winPecks(page);
  await expect(page.locator("#discordNote")).toHaveText(
    "Couldn’t post your result in this channel (not started here). Share it instead?",
  );
  await expect(page.getByRole("button", { name: "Share in Discord" })).toBeVisible();
});

test("when signing in with Discord fails, the result screen says which step went wrong", async ({ page }) => {
  tokenStatus = 401;
  await winPecks(page);
  await expect(page.locator("#discordNote")).toHaveText(
    "Couldn’t post your result: something went wrong signing in (token answered 401).",
  );
  expect(sent.filter(([p]) => p === "result")).toEqual([]);
});

test("solving Biscuit and Marshmallow in Discord posts the result", async ({ page }) => {
  test.slow(); // plays a whole board
  await page.clock.setFixedTime(new Date("2026-09-30T10:00:00"));
  await page.goto(`${ACTIVITY}/biscuit.html${LAUNCH}`);
  await expect(page.locator("#puzzleNo")).toContainText("No. 1");
  const sol = await page.evaluate(() => window.BISCUIT_PUZZLES.list[0].s.join(""));
  const same = (a, b) => a === b || (/[23]/.test(a) && /[23]/.test(b));
  const board = () =>
    page
      .locator("#board")
      .evaluate((b) => [...b.querySelectorAll(".hole, .tile")].map((el) => el.dataset.ch || ".").join(""));
  for (let guard = 0; guard < 40; guard++) {
    const b = await board();
    const wrong = [...b].map((ch, i) => i).filter((i) => sol[i] !== "." && !same(b[i], sol[i]));
    if (!wrong.length) break;
    const i = wrong[0],
      j = wrong.find((k) => k !== i && same(b[k], sol[i]));
    await page.locator(`#board .tile[data-i="${i}"]`).click();
    await page.locator(`#board .tile[data-i="${j}"]`).click();
  }
  await expect(page.locator("#discordNote")).toHaveText("Your result is in the channel.", { timeout: 15000 });
  const [, body] = sent.find(([p]) => p === "result");
  const moves = Number(await page.locator("#moves").textContent());
  expect(body.result).toMatchObject({ game: "biscuit", date: "2026-09-30", no: 1, moves });
  expect(body.result.par).toBeGreaterThan(0);
});

test("the Activity opens on the home page and goes on to its game, still talking to Discord", async ({ page }) => {
  // As if DISCORD_APPS in site.js had this app's ID for Hen Pecks.
  await page.route(/\/site\.js/, async (r) => {
    const body = (await readFile("public/site.js", "utf8")).replace(/pecks: "\d*"/, 'pecks: "111"');
    await r.fulfill({ contentType: "text/javascript", body });
  });
  // Discord's window opens the Activity, so it's the referrer.
  await page.goto(`${ACTIVITY}/${LAUNCH}`, { referer: "https://discord.com/" });
  await expect(page).toHaveURL(/\/pecks\.html\?/);
  await expect(page.locator("#puzzleNo")).toContainText("No.");
  // Discord's launch details came along, and the SDK still talks to Discord, not to this site.
  const q = new URL(page.url()).searchParams;
  expect([q.get("frame_id"), q.get("instance_id"), q.get("channel_id")]).toEqual(["f1", "i1", "c1"]);
  await expect.poll(() => page.evaluate(() => window.discordReferrer)).toBe("https://discord.com/");
});
