// Browser tests for Biscuit and Marshmallow. Like the Hen Pecks tests, they play through what a player
// sees: tiles to tap, drag and move between with the keyboard.
import { test, expect } from "@playwright/test";

// Pin the date so every run gets board No. 1.
const DAY = new Date("2026-09-30T10:00:00");

let errors;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route(/supabase|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)/, (r) => r.abort());
  // The how-to-play pop-up opens on a first visit; howto.spec.js tests it. Here it would cover the page.
  await context.addInitScript(() => ["biscuit", "pecks"].forEach((g) => localStorage.setItem("bb:howto:" + g, "1")));
  await page.clock.setFixedTime(DAY);
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

async function open(page) {
  await page.goto("/biscuit.html");
  await expect(page.locator("#puzzleNo")).toContainText("No. 1");
}
const tile = (page, i) => page.locator(`#board .tile[data-i="${i}"]`);
const swaps = (page) => page.locator("#moves");
// The board as the player sees it (letters, 1 for the kitten, 2 for the sheep, 3 for the yarn) and today's solution.
const boardNow = (page) =>
  page.locator("#board").evaluate((b) => {
    let s = "";
    for (const el of b.querySelectorAll(".hole, .tile")) s += el.classList.contains("hole") ? "." : el.dataset.ch;
    return s;
  });
const solution = (page) => page.evaluate(() => window.BISCUIT_PUZZLES.list[0].s.join(""));
// Marshmallow (2) and the yarn (3) can trade places; Biscuit (1) can't.
const same = (a, b) => a === b || (/[23]/.test(a) && /[23]/.test(b));
// Two squares that aren't green yet.
async function twoMovable(page) {
  const ids = await page.locator("#board .tile:not(.g)").evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
  return [ids[0], ids[1]];
}

test("the board starts scrambled with 29 squares and the animals apart", async ({ page }) => {
  await open(page);
  await expect(page.locator("#board .tile")).toHaveCount(29);
  await expect(page.locator("#board .tile.animal")).toHaveCount(3);
  await expect(swaps(page)).toHaveText("0");
  await expect(page.locator("#par")).toContainText("par");
  expect(await page.locator("#board .tile.g").count()).toBeGreaterThan(0);
});

test("tapping two tiles swaps them and counts a swap", async ({ page }) => {
  await open(page);
  const [a, b] = await twoMovable(page);
  const before = await boardNow(page);
  await tile(page, a).click();
  await expect(tile(page, a)).toHaveClass(/picked/);
  await tile(page, b).click();
  await expect(swaps(page)).toHaveText("1");
  const after = await boardNow(page);
  expect(after[a]).toBe(before[b]);
  expect(after[b]).toBe(before[a]);
});

test("green letters stay put", async ({ page }) => {
  await open(page);
  const green = Number(await page.locator("#board .tile.g").first().getAttribute("data-i"));
  const [other] = await twoMovable(page);
  // Green tiles are marked disabled for screen readers, but a tap on one still explains why.
  await tile(page, green).click({ force: true });
  await expect(page.locator("#msg")).toContainText("Green letters");
  // Picking up another tile and then the green one doesn't swap them either.
  await tile(page, other).click();
  await tile(page, green).click({ force: true });
  await expect(swaps(page)).toHaveText("0");
});

test("dragging a tile onto another swaps them", async ({ page }) => {
  await open(page);
  const [a, b] = await twoMovable(page);
  const before = await boardNow(page);
  // The story strip sits above the board, so on phones the board starts below the fold.
  await page.locator("#board").scrollIntoViewIfNeeded();
  const from = await tile(page, a).boundingBox(),
    to = await tile(page, b).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(swaps(page)).toHaveText("1");
  expect((await boardNow(page))[a]).toBe(before[b]);
});

test("arrow keys and Enter swap tiles", async ({ page }) => {
  await open(page);
  const before = await boardNow(page);
  // Start on the first movable tile, pick it up, move right to the next square in the row and swap.
  const first = await page.locator('#board .tile[tabindex="0"]').getAttribute("data-i");
  await page.locator('#board .tile[tabindex="0"]').focus();
  await page.keyboard.press("Enter");
  let target = Number(first) + 1;
  while (before[target] === "." || (await tile(page, target).getAttribute("class")).includes(" g")) {
    await page.keyboard.press("ArrowRight");
    target++;
  }
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(swaps(page)).toHaveText("1");
});

// Swaps tiles into place until the board is solved.
async function solve(page) {
  const sol = await solution(page);
  for (let guard = 0; guard < 40; guard++) {
    const b = await boardNow(page);
    const wrong = [...b].map((ch, i) => i).filter((i) => sol[i] !== "." && !same(b[i], sol[i]));
    if (!wrong.length) break;
    const i = wrong[0],
      j = wrong.find((k) => k !== i && same(b[k], sol[i]));
    await tile(page, i).click();
    await tile(page, j).click();
  }
  // The win screen follows the celebration, which can be slow when every test runs at once.
  await expect(page.locator("#result")).toBeVisible({ timeout: 15000 });
}

test("solving the board reunites the animals, shows the result and survives a reload", async ({ page }) => {
  test.slow(); // plays a whole game, which can pass 30 seconds when every test runs at once
  await open(page);
  await solve(page);
  await expect(page.getByRole("link", { name: "Read today’s story →" })).toHaveAttribute("href", "./");
  // The story panels stay the same after the win (on phones they're in the fold-out).
  if (await page.locator("#storyBook").isVisible()) await page.locator("#storyBook summary").click();
  await expect(page.locator("figcaption:visible").filter({ hasText: "lead Biscuit home" })).toHaveCount(1);
  await expect(page.locator("#summary")).toContainText("Solved in");
  await expect(page.locator("#stats")).toContainText("1 solved");
  const n = await swaps(page).textContent();
  await page.reload();
  await expect(page.locator("#result")).toBeVisible();
  await expect(swaps(page)).toHaveText(n);
  // A solved board can't be changed.
  const [a, b] = await page.locator("#board .tile.animal").evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
  await tile(page, a).click({ force: true });
  await tile(page, b).click({ force: true });
  await expect(swaps(page)).toHaveText(n);
});

test("progress is kept after a reload", async ({ page }) => {
  await open(page);
  const [a, b] = await twoMovable(page);
  await tile(page, a).click();
  await tile(page, b).click();
  const after = await boardNow(page);
  await page.reload();
  await expect(swaps(page)).toHaveText("1");
  expect(await boardNow(page)).toBe(after);
});

test("the story page card shows today's progress", async ({ page }) => {
  test.slow(); // plays a whole game, which can pass 30 seconds when every test runs at once
  await open(page);
  await expect(page.locator(".menu-page[href='biscuit.html']")).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator("#bmTitle")).toHaveText("Today’s Biscuit and Marshmallow is ready");
  await page.goto("/biscuit.html");
  const [a, b] = await twoMovable(page);
  await tile(page, a).click();
  await tile(page, b).click();
  await page.goto("/");
  await expect(page.locator("#bmTitle")).toHaveText("Biscuit and Marshmallow are waiting");
  await expect(page.locator("#bmSub")).toContainText("1 swap so far");
  await page.locator("#bmTeaser").click();
  await expect(page).toHaveURL(/biscuit\.html$/);
  await solve(page);
  await page.goto("/");
  await expect(page.locator("#bmTitle")).toHaveText("You reunited Biscuit and Marshmallow!");
  await expect(page.locator('.menu-page[href="biscuit.html"] .dot')).toHaveCount(0);
});

test("a signed-in player's solved boards are saved to their account", async ({ page }) => {
  test.slow(); // plays a whole game, which can pass 30 seconds when every test runs at once
  // A stand-in for account.js's window.Account: signed in, with an account that already has one
  // solved day from another device. account.js's own assignment is ignored.
  await page.addInitScript(() => {
    window.__rpc = [];
    const user = { id: "player-1", email: "player@example.test" };
    const fake = {
      enabled: true,
      user,
      client: {
        rpc: async (name, args) => {
          window.__rpc.push({ name, args });
          return { data: { log: { ...args.p_log, "2026-09-20": { moves: 14, stars: 3 } } }, error: null };
        },
      },
      onChange(fn) {
        setTimeout(() => fn(user));
        return () => {};
      },
      open() {},
      message() {},
    };
    Object.defineProperty(window, "Account", { get: () => fake, set() {}, configurable: true });
  });
  await open(page);
  await expect(page.locator("#acctBtnText")).toHaveText("Stats saved to your account");
  await expect.poll(() => page.evaluate(() => window.__rpc.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__rpc[0])).toEqual({ name: "biscuit_sync", args: { p_log: {} } });
  await solve(page);
  // Today's board goes up, and the stats include the day saved from the other device.
  await expect
    .poll(() => page.evaluate(() => window.__rpc.at(-1).args.p_log["2026-09-30"]))
    .toEqual({ moves: Number(await swaps(page).textContent()), stars: expect.any(Number) });
  await expect(page.locator("#stats")).toContainText("2 solved");
  await expect(page.locator("#acctNote")).toContainText("Saved to your account");
});

test("the story shows beside the game on wide screens, and folds out on phones", async ({ page }) => {
  await open(page);
  const wide = page.viewportSize().width >= 1180;
  const captions = page.locator("figcaption:visible");
  if (wide) {
    await expect(page.locator("#storyBook")).toBeHidden();
    await expect(captions).toHaveCount(6);
    await expect(captions.first()).toContainText("sleepy morning");
    await expect(captions.nth(4)).toContainText("MISSING posters");
    return;
  }
  // Folded on a first visit, then it stays however the player left it.
  const book = page.locator("#storyBook");
  await expect(book).toHaveJSProperty("open", false);
  await expect(captions).toHaveCount(0);
  await book.locator("summary").click();
  await expect(book).toHaveJSProperty("open", true);
  await expect(captions.first()).toContainText("sleepy morning");
  await expect(page.locator("#storyStrip .sb-plate")).toHaveCount(6);
  await page.reload();
  await expect(book).toHaveJSProperty("open", true);
  await book.locator("summary").click();
  await page.reload();
  await expect(book).toHaveJSProperty("open", false);
});

test("green letters aren't enough: Biscuit has to touch both Marshmallow and her yarn", async ({ page }) => {
  await open(page);
  const sol = await solution(page);
  // Every letter in place, but Biscuit swapped with Marshmallow or the yarn so she isn't touching both.
  const at = (s, ch) => [Math.floor(s.indexOf(ch) / 5), s.indexOf(ch) % 5];
  const touch = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
  const home = (s) => touch(at(s, "1"), at(s, "2")) && touch(at(s, "1"), at(s, "3"));
  const swapped = ["2", "3"]
    .map((other) => sol.replace("1", "#").replace(other, "1").replace("#", other))
    .find((s) => !home(s));
  test.skip(!swapped, "today's three squares all touch each other");
  await page.evaluate(
    ([b, day]) =>
      localStorage.setItem(
        "biscuit:v1",
        JSON.stringify({ version: 1, days: { [day]: { p: 0, b, moves: 5, done: false } }, log: {} }),
      ),
    [swapped, "2026-09-30"],
  );
  await page.reload();
  await expect(page.locator("#board .tile.g")).toHaveCount(26);
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#msg")).toContainText("One more swap");
  await expect(page.locator("#msg")).toHaveClass(/nudge/);
  await expect(page.locator("#board")).toHaveClass(/last-swap/);
  // One swap of the special tiles puts her home.
  const kitten = await page.locator('#board .tile[data-ch="1"]').getAttribute("data-i");
  const target = sol.indexOf("1");
  await tile(page, Number(kitten)).click();
  await tile(page, target).click();
  await expect(page.locator("#result")).toBeVisible();
  await expect(swaps(page)).toHaveText("6");
  await expect(page.locator("#msg")).not.toHaveClass(/nudge/);
  await expect(page.locator("#board")).not.toHaveClass(/last-swap/);
});

test("each day of the week has its own board shape, and it fits the screen", async ({ page }) => {
  const week = [
    ["2026-10-05", "Mini waffle", 21],
    ["2026-10-06", "Signpost", 23],
    ["2026-09-30", "Classic", 29],
    ["2026-10-01", "Zig-zag", 29],
    ["2026-10-02", "Wide meadow", 29],
    ["2026-10-03", "Barn", 33],
    ["2026-10-04", "Big weekend", 40],
  ];
  for (const [day, shape, squares] of week) {
    await page.clock.setFixedTime(new Date(day + "T10:00:00"));
    await page.goto("/biscuit.html");
    await expect(page.locator("#puzzleNo")).toContainText(shape);
    await expect(page.locator("#board .tile")).toHaveCount(squares);
    await expect(page.locator("#board .tile.animal")).toHaveCount(3);
    const [right, width] = await page.evaluate(() => [
      document.getElementById("board").getBoundingClientRect().right,
      innerWidth,
    ]);
    expect(right, `${shape} board fits`).toBeLessThanOrEqual(width);
  }
});

test("stars: par or better is 3, up to 10 over par is 2, more is 1", async ({ page }) => {
  await open(page);
  const { par, b } = await page.evaluate(() => {
    const p = window.BISCUIT_PUZZLES.list[0];
    return { par: p.par, b: p.b.join("") };
  });
  for (const [moves, stars] of [
    [par, 3],
    [par + 1, 2],
    [par + 10, 2],
    [par + 11, 1],
  ]) {
    await page.evaluate(
      ([board, m]) =>
        localStorage.setItem(
          "biscuit:v1",
          JSON.stringify({ version: 1, days: { "2026-09-30": { p: 0, b: board, moves: m, done: false } }, log: {} }),
        ),
      [b, moves],
    );
    await page.reload();
    await expect(page.locator("#stars")).toHaveAccessibleName(`${stars} star${stars === 1 ? "" : "s"} so far`);
  }
});

test("How to play has pictures for splitting words, the last swap and stars, with the animals drawn in", async ({
  page,
}) => {
  await open(page);
  const how = page.locator("#how");
  if (!(await how.evaluate((d) => d.open))) await how.locator("summary").click();
  const pictures = how.locator(".howpic");
  await expect(pictures).toHaveCount(3);
  for (const pic of await pictures.all()) await expect(pic).toHaveAttribute("aria-label", /\w/);
  await expect(how.locator("[data-a] svg")).toHaveCount(await how.locator("[data-a]").count());
  // Tips for when a player is stuck, at the end
  await expect(how.locator(".stuck")).toContainText("Stuck?");
});
