// Hen Pecks as a Discord Activity, with Discord's real SDK talking to a stand-in Discord app
// (tests/discord-host.mjs) instead of the stand-in SDK in discord.spec.js. This checks the parts only the
// real SDK cares about: that the Activity, opened on "/" like Discord does, still reaches Discord after
// moving on to its game, and that what it asks Discord for is well formed. The discord-activity function
// is still replaced, so nothing is sent to Discord or Supabase.
import { test, expect } from "@playwright/test";

const port = Number(process.env.PORT || 4173);
const PECKS_APP = "1557552863746461736"; // DISCORD_APPS.pecks in public/site.js
const LAUNCH = "?frame_id=f1&instance_id=i1&channel_id=c1&guild_id=g1&platform=desktop";
const activity = `http://${PECKS_APP}.discordsays.com:${port}/${LAUNCH}`;
test.use({ launchOptions: { args: ["--host-resolver-rules=MAP *.discordsays.com 127.0.0.1"] } });

let errors, sent;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  sent = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route(
    /supabase\.co|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)|\/x\/(gfonts|gstatic)\//,
    (r) => r.abort(),
  );
  await context.route("**/x/supabase/functions/v1/discord-activity/*", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").pop();
    sent.push([path, r.request().postDataJSON()]);
    await r.fulfill({ json: path === "token" ? { access_token: "the-token" } : { posted: true } });
  });
  await context.addInitScript(() => ["biscuit", "pecks"].forEach((g) => localStorage.setItem("bb:howto:" + g, "1")));
  await page.clock.setFixedTime(new Date("2026-09-29T10:00:00"));
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

const rpc = (page) => page.evaluate(() => window.rpc);

test("in Discord, Hen Pecks connects, signs in and posts the result", async ({ page }) => {
  await page.goto(`http://localhost:3333/?activity=${encodeURIComponent(activity)}`);
  const game = page.frameLocator("#activity");
  await expect(game.locator("#puzzleNo")).toContainText("No. 3");
  expect(new URL(page.frames()[1].url()).pathname).toBe("/pecks.html");

  // The handshake reached Discord (only possible if the SDK sent it to Discord's address), and the
  // game asked who's playing.
  await expect
    .poll(async () => (await rpc(page)).find((m) => m.op === 0))
    .toMatchObject({
      client_id: PECKS_APP,
      frame_id: "f1",
    });
  await expect
    .poll(async () => (await rpc(page)).find((m) => m.cmd === "AUTHORIZE")?.args)
    .toMatchObject({
      client_id: PECKS_APP,
      response_type: "code",
      scope: ["identify"],
    });
  await expect.poll(() => sent[0]).toEqual(["token", { game: "pecks", code: "the-code" }]);

  // Win, and the result goes to the function.
  for (const k of ["A", "O", "I", "U", "Y", "DF", "GL"]) await game.locator(`#peckPad .key[data-k="${k}"]`).click();
  const answer = "LET THE CAT OUT OF THE BAG";
  const slots = await game.locator(".tile.slot").evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
  for (const i of slots) await page.keyboard.press(answer[i]);
  await page.keyboard.press("Enter");
  await expect(game.locator("#discordNote")).toHaveText("Your result is in the channel.");
  const [, body] = sent.find(([p]) => p === "result");
  expect(body).toMatchObject({ game: "pecks", access_token: "the-token", channel_id: "c1" });
  expect(body.result).toMatchObject({ outcome: "t1", no: 3 });

  // Share in Discord opens Discord's share dialog.
  await game.getByRole("button", { name: "Share in Discord" }).click();
  await expect
    .poll(async () => (await rpc(page)).find((m) => m.cmd === "SHARE_LINK")?.args?.message)
    .toMatch(/^Hen Pecks #3\n/);
});
