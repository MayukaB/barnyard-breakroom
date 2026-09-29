// Browser tests for Hen Pecks and the story page's Hen Pecks card.
// They only use what a player sees (the page, its buttons and keys), so they keep working
// when the code behind the page is reorganised.
import { test, expect } from "@playwright/test";

// Pin the date so every run gets the same puzzle: No. 3, "Let the cat out of the bag".
const DAY = new Date("2026-09-29T10:00:00");
const ANSWER = "LET THE CAT OUT OF THE BAG";
// Seven pecks that leave blanks to fill in and don't include Q, the letter used for wrong guesses.
const PECKS = ["A", "O", "I", "U", "Y", "DF", "GL"];
const WRONG = "Q";

let errors;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Keep tests offline and fast: no sign-in services, fonts or CDNs.
  await context.route(/supabase|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.clock.setFixedTime(DAY);
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

async function open(page) {
  await page.goto("/pecks.html");
  await expect(page.locator("#puzzleNo")).toContainText("No. 3");
}
async function peckAll(page, pecks = PECKS) {
  for (const k of pecks) await page.locator(`#peckPad .key[data-k="${k}"]`).click();
}
// Type into every blank: the right letter, or `wrongAt` positions get a wrong one.
async function fill(page, wrongAt = () => false) {
  const slots = await page.locator(".tile.slot").evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
  for (const [n, i] of slots.entries()) await page.keyboard.press(wrongAt(n) ? WRONG : ANSWER[i]);
  return slots.length;
}
const submit = (page) => page.keyboard.press("Enter");

test("pecking reveals letters and counts down", async ({ page }) => {
  await open(page);
  await page.locator('#peckPad .key[data-k="E"]').click();
  await expect(page.locator(".tile.shown")).toHaveCount(3); // lEt thE thE
  await expect(page.locator("#eggs")).toHaveAttribute("aria-label", "Pecks used: 1 of 7");
  await expect(page.locator('#peckPad .key[data-k="E"]')).toBeDisabled();
  await page.keyboard.press("q"); // a key pecks its pair
  await expect(page.locator('#peckPad .key[data-k="QV"]')).toBeDisabled();
  await expect(page.locator("#msg")).toContainText("5 pecks left");
});

test("after 7 pecks the hint shows and a correct fill-in wins", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await peckAll(page);
  await expect(page.locator("#hint")).toBeVisible();
  await expect(page.locator("#hintText")).not.toBeEmpty();
  await expect(page.locator("#solvePad")).toBeVisible();
  await fill(page);
  await submit(page);
  await expect(page.locator("#verdict")).toHaveText("Egg-cellent!");
  await expect(page.locator("#answer")).toHaveText("Let the cat out of the bag");
  await expect(page.locator("#artNote")).toBeHidden();
  await expect(page.locator("#dist li.today")).toContainText("1st try");
  await page.locator("#share").click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toMatch(/^Hen Pecks #3\nPecks: [🐣🥚]{7}\nCracked on try 1\/3/u);
});

test("a wrong try keeps the right letters (green) and uses one try", async ({ page }) => {
  await open(page);
  await peckAll(page);
  const blanks = await fill(page, (n) => n === 0);
  await submit(page);
  await expect(page.locator("#msg")).toContainText("1 letter wrong");
  await expect(page.locator(".tile.locked")).toHaveCount(blanks - 1);
  await expect(page.locator("#checkNote")).toHaveText("2 tries left");
});

test("pressing Enter twice during the wrong-answer shake only uses one try", async ({ page }) => {
  await open(page);
  await peckAll(page);
  await fill(page, () => true);
  await submit(page);
  await submit(page);
  await submit(page);
  await expect(page.locator("#checkNote")).toHaveText("2 tries left");
});

test("three wrong tries loses and shows the sad hen", async ({ page }) => {
  await open(page);
  await peckAll(page);
  for (let t = 0; t < 3; t++) {
    await fill(page, () => true);
    await submit(page);
    if (t < 2) await expect(page.locator("#checkNote")).toHaveText(`${2 - t} ${2 - t === 1 ? "try" : "tries"} left`);
  }
  await expect(page.locator("#verdict")).toHaveText("The phrase got away this time");
  await expect(page.locator("#artNote")).toBeVisible();
  await expect(page.locator("#dist li.today")).toContainText("Missed");
});

test("hard mode hides the hint; winning without peeking earns the badge", async ({ page }) => {
  await open(page);
  await page.locator("#hard").check();
  await expect(page.locator("#hardNote")).toHaveText("hint hidden");
  await peckAll(page);
  await expect(page.locator("#hard")).toBeDisabled();
  await expect(page.locator("#peek")).toBeVisible();
  await expect(page.locator("#hintText")).toBeEmpty();
  await fill(page);
  await submit(page);
  await expect(page.locator("#hardBadge")).toBeVisible();
});

test("peeking in hard mode shows the hint but loses the badge (Enter works on the button)", async ({ page }) => {
  await open(page);
  await page.locator("#hard").check();
  await peckAll(page);
  await page.locator("#peek").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#hintText")).not.toBeEmpty();
  await expect(page.locator("#checkNote")).toHaveText("3 tries left"); // Enter didn't submit
  await fill(page);
  await submit(page);
  await expect(page.locator("#verdict")).toBeVisible();
  await expect(page.locator("#hardBadge")).toBeHidden();
});

test("progress survives a reload and shows on the story page card", async ({ page }) => {
  await open(page);
  await peckAll(page, ["E", "A", "O"]);
  await page.reload();
  await expect(page.locator("#eggs")).toHaveAttribute("aria-label", "Pecks used: 3 of 7");
  await page.goto("/");
  await expect(page.locator("#teaserTitle")).toHaveText("Your Hen Pecks game is waiting");
  await expect(page.locator("#teaserSub")).toHaveText("4 pecks left.");
  await expect(page.locator("#teaserEggs i.on")).toHaveCount(3);
});

test("a finished game stays finished after a reload", async ({ page }) => {
  await open(page);
  await peckAll(page);
  await fill(page);
  await submit(page);
  await expect(page.locator("#verdict")).toBeVisible();
  await page.reload();
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#peckPad")).toBeHidden();
  await expect(page.locator("#stats")).toContainText("1 played");
});

test("stats saved by older versions of the game are upgraded, not lost", async ({ page }) => {
  // What a player who last visited before stats were logged by day has saved (no version number).
  const old = {
    days: {
      "2026-09-27": {
        p: "WHEN PIGS FLY",
        pecks: ["E"],
        hitsPerPeck: [1],
        phase: "won",
        tries: 1,
        locked: [],
        counted: true,
        solvedOnTry: 2,
      },
    },
    stats: { played: 5, wins: 4, streak: 2, best: 3, last: "2026-09-28" },
    settings: { hard: false },
  };
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("henpecks:v1", JSON.stringify(data));
      sessionStorage.setItem("seeded", "1");
    }
  }, old);
  await open(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("henpecks:v1")));
  expect(saved.version).toBeGreaterThanOrEqual(5);
  expect(saved.log).toEqual({ "2026-09-27": "t2" }); // the saved game moved into the log…
  expect(saved.base.played).toBe(4); // …and out of the old totals
  // Finish today's game: 5 old games + today = 6, and the streak carries on from yesterday.
  await peckAll(page);
  await fill(page);
  await submit(page);
  await expect(page.locator("#stats")).toContainText("6 played");
  await expect(page.locator("#stats")).toContainText("3 streak");
});

test("data saved by a newer version of the game is left alone", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(
        "henpecks:v1",
        JSON.stringify({
          version: 999,
          days: {},
          stats: { played: 0 },
          settings: {},
          log: {},
          base: {},
          future: "keep me",
        }),
      );
      sessionStorage.setItem("seeded", "1");
    }
  });
  await open(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("henpecks:v1")));
  expect(saved.version).toBe(999);
  expect(saved.future).toBe("keep me");
});

test("Backspace removes the letter just typed, even in the last blank", async ({ page }) => {
  await open(page);
  await peckAll(page);
  const slots = page.locator(".tile.slot");
  const last = slots.last();
  await last.click();
  await page.keyboard.press("X");
  await expect(last).toHaveText("X");
  await page.keyboard.press("Backspace");
  await expect(last).toHaveText("");
  // Typing then Backspace in the middle still works as before.
  await slots.first().click();
  await page.keyboard.press("X");
  await page.keyboard.press("Backspace");
  await expect(slots.first()).toHaveText("");
});

test("the story archive shows 12 paintings at a time", async ({ page }) => {
  // 30 stories: the newest is the main story, so 29 go in "Earlier pages".
  const real = await (await page.request.get("/stories.json")).json();
  const stories = Array.from({ length: 30 }, (_, n) => ({
    ...real[0],
    id: `story-${n}`,
    title: `Story ${n}`,
    published: `2026-08-${String(30 - n).padStart(2, "0")}`,
  }));
  await page.route("**/stories.json", (r) => r.fulfill({ json: stories }));
  await page.goto("/");
  const cards = page.locator("#grid .card"),
    more = page.locator("#more");
  await expect(cards).toHaveCount(12);
  await expect(more).toHaveText("Show 12 more");
  await more.click();
  await expect(cards).toHaveCount(24);
  await expect(cards.nth(12)).toBeFocused();
  await expect(more).toHaveText("Show 5 more");
  await more.click();
  await expect(cards).toHaveCount(29);
  await expect(more).toBeHidden();
  // Opening an older story keeps the longer list.
  await cards.nth(20).click();
  await expect(cards).toHaveCount(29);
});

test("with only a few stories there's no Show more button", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grid .card").first()).toBeVisible();
  await expect(page.locator("#more")).toBeHidden();
});
