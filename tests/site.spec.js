// Browser tests for the top bar shared by every page: the menu, the light/dark switch and sign-in.
// Like pecks.spec.js, they only use what a visitor sees, so they survive changes to the code behind it.
import { test, expect } from "@playwright/test";

let errors;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Keep tests offline and fast: no sign-in services, fonts or CDNs.
  await context.route(/supabase|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)/, (r) => r.abort());
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

const menu = (page) => page.getByRole("dialog", { name: "Site menu" });
const openMenu = (page) => page.locator("#menuBtn").click();

test("the menu switches between pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".topbar .here")).toHaveText("Wild Watercolors");
  await expect(menu(page)).toBeHidden();

  await openMenu(page);
  await expect(menu(page)).toBeVisible();
  await expect(page.locator("#menuBtn")).toHaveAttribute("aria-expanded", "true");
  await expect(menu(page).locator('[aria-current="page"]')).toContainText("Wild Watercolors");

  await menu(page)
    .getByRole("link", { name: /Hen Pecks/ })
    .click();
  await expect(page).toHaveURL(/pecks\.html$/);
  await expect(page.locator(".topbar .here")).toHaveText("Hen Pecks");

  await openMenu(page);
  await expect(menu(page).locator('[aria-current="page"]')).toContainText("Hen Pecks");
  await menu(page)
    .getByRole("link", { name: /Wild Watercolors/ })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test("the menu closes with Escape, the close button and the current page's link", async ({ page }) => {
  await page.goto("/pecks.html");
  await openMenu(page);
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(page.locator("#menuBtn")).toHaveAttribute("aria-expanded", "false");

  await openMenu(page);
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(menu(page)).toBeHidden();

  await openMenu(page);
  await menu(page)
    .getByRole("link", { name: /Hen Pecks/ })
    .click();
  await expect(menu(page)).toBeHidden();
  await expect(page).toHaveURL(/pecks\.html$/);
});

test("typing in the menu doesn't play Hen Pecks", async ({ page }) => {
  await page.goto("/pecks.html");
  await openMenu(page);
  await page.keyboard.press("E");
  await page.keyboard.press("Escape");
  await expect(page.locator('#peckPad .key[data-k="E"]')).toBeEnabled();
});

test("the light/dark switch is saved and carries across pages", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  const toggle = (mode) => page.locator(`[data-theme-set="${mode}"]:visible`);
  // Phones keep the switch inside the menu.
  const reveal = async () => {
    if (!(await toggle("dark").count())) await openMenu(page);
  };

  await reveal();
  await expect(toggle("light")).toHaveAttribute("aria-pressed", "true");
  await toggle("dark").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle("dark")).toHaveAttribute("aria-pressed", "true");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(22, 29, 27)");

  await page.goto("/pecks.html");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await reveal();
  await toggle("light").click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("with no choice saved, the page follows the system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
  await openMenu(page);
  await expect(page.locator('[data-theme-set="dark"]').first()).toHaveAttribute("aria-pressed", "true");
});

test("sign-in opens from the menu and the top bar on every page", async ({ page }) => {
  for (const path of ["/", "/pecks.html"]) {
    await page.goto(path);
    await page.locator("#acctChip").click();
    await expect(menu(page)).toBeVisible();
    await menu(page).getByRole("button", { name: "Sign in" }).click();
    await expect(menu(page)).toBeHidden();
    const dialog = page.getByRole("dialog", { name: "Keep your streak" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Email address" })).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  }
});

test("a link to #account opens the sign-in dialog", async ({ page }) => {
  await page.goto("/#account");
  await expect(page.getByRole("dialog", { name: "Keep your streak" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("the top bar and menu show who is signed in", async ({ page }) => {
  // The last signed-in player is remembered, so the page shows them before the sign-in service loads.
  await page.addInitScript(() =>
    localStorage.setItem("bb:account", JSON.stringify({ id: "u1", email: "hen.fan@example.com" })),
  );
  await page.goto("/");
  await expect(page.locator("#acctChip")).toHaveAccessibleName("Account: hen.fan@example.com");
  await expect(page.locator("#chipAvatar")).toHaveText("H");
  await openMenu(page);
  await expect(menu(page)).toContainText("Signed in as hen.fan@example.com");
  await expect(menu(page).getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(menu(page).getByRole("button", { name: "Sign in" })).toBeHidden();
});

test("the menu button shows a dot until today's Hen Pecks is played", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#menuBtn .dot")).toBeAttached();
  await expect(page.locator("#menuBtn")).toHaveAccessibleName(/today's Hen Pecks isn't finished/);
});

test("the story page is allowed to load the sign-in services", async ({ page }) => {
  const blocked = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) blocked.push(m.text());
  });
  // A request the policy blocks never reaches the network, so reaching this route means it was allowed.
  // The stand-in isn't the real Supabase file, so its integrity check fails and it never runs.
  let supabaseRequested = false;
  await page.route("https://cdn.jsdelivr.net/**", (r) => {
    supabaseRequested = true;
    return r.fulfill({ contentType: "text/javascript", body: "window.__supabaseLoaded = true;" });
  });
  await page.route("https://accounts.google.com/gsi/client", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "window.__gsiLoaded = true; window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };",
    }),
  );
  await page.goto("/");
  await expect.poll(() => supabaseRequested).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__gsiLoaded === true)).toBe(true);
  expect(await page.evaluate(() => window.__supabaseLoaded === true)).toBe(false);
  expect(blocked).toEqual([]);
});

test("a missing address shows the 404 page, styled and linking home, even when nested", async ({ page }) => {
  const blocked = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) blocked.push(m.text());
  });
  await page.addInitScript(() => localStorage.setItem("bb:theme", "dark"));
  for (const path of ["/no-such-page", "/a/b/c.html"]) {
    const res = await page.goto(path);
    expect(res.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page wandered off" })).toBeVisible();
    // site.css loaded from the root (its dark paper colour applies) and site.js applied the saved theme.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(22, 29, 27)");
    await page.getByRole("link", { name: "Hen Pecks" }).click();
    await expect(page).toHaveURL(/\/pecks\.html$/);
  }
  expect(blocked).toEqual([]);
});
