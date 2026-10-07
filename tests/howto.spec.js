// Browser tests for the how-to-play pop-up on both game pages: it opens by itself on a first visit, comes
// back from the "?" by the title, and points to the full rules.
import { test, expect } from "@playwright/test";

let errors;
test.beforeEach(async ({ page, context }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Keep tests offline and fast: no sign-in services, fonts or CDNs.
  await context.route(/supabase|jsdelivr|accounts\.google|fonts\.(googleapis|gstatic)/, (r) => r.abort());
});
test.afterEach(() => expect(errors, "no script errors on the page").toEqual([]));

const popup = (page) => page.getByRole("dialog", { name: "How to play" });

for (const [path, saved] of [
  ["/biscuit.html", "biscuit:v1"],
  ["/pecks.html", "henpecks:v1"],
]) {
  test.describe(path, () => {
    test("opens on a first visit, then only from the ? button", async ({ page }) => {
      await page.goto(path);
      await expect(popup(page)).toBeVisible();
      await expect(popup(page).getByRole("button", { name: "Let’s play" })).toBeFocused();
      await popup(page).getByRole("button", { name: "Let’s play" }).click();
      await expect(popup(page)).toBeHidden();

      await page.reload();
      await expect(page.locator("#howtoBtn")).toBeVisible();
      await expect(popup(page)).toBeHidden();

      await page.locator("#howtoBtn").click();
      await expect(popup(page)).toBeVisible();
      await expect(popup(page).getByRole("button", { name: "Back to the game" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(popup(page)).toBeHidden();
      await expect(page.locator("#howtoBtn")).toBeFocused();
    });

    test("closes from the ×, and from a click outside it", async ({ page }) => {
      await page.goto(path);
      await popup(page).getByRole("button", { name: "Close" }).click();
      await expect(popup(page)).toBeHidden();
      await page.locator("#howtoBtn").click();
      await page.mouse.click(4, 4);
      await expect(popup(page)).toBeHidden();
    });

    test("its How to play link opens the full rules on the page", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("#how")).not.toHaveAttribute("open", "");
      await popup(page).getByRole("button", { name: "full rules" }).click();
      await expect(popup(page)).toBeHidden();
      await expect(page.locator("#how")).toHaveAttribute("open", "");
      await expect(page.locator("#how summary")).toBeFocused();
    });

    test("waits for the next visit when the first one arrives to sign in", async ({ page }) => {
      await page.goto(path + "#account");
      await expect(page.locator("#howtoBtn")).toBeVisible();
      await expect(popup(page)).toBeHidden();
      await page.goto(path);
      await expect(popup(page)).toBeVisible();
      await popup(page).getByRole("button", { name: "Let’s play" }).click();
      await page.reload();
      await expect(page.locator("#howtoBtn")).toBeVisible();
      await expect(popup(page)).toBeHidden();
    });

    test("doesn't open by itself for someone who already has a game saved", async ({ page }) => {
      await page.addInitScript((key) => localStorage.setItem(key, "{}"), saved);
      await page.goto(path);
      await expect(page.locator("#howtoBtn")).toBeVisible();
      await expect(popup(page)).toBeHidden();
    });
  });
}

// Biscuit's first picture plays the swap; with reduced motion it's a still "before → after" pair instead.
test("the swap picture is still for players who turn off motion", async ({ page }) => {
  const after = () => page.locator("#howto .hz-after");
  await page.goto("/biscuit.html");
  await expect(after()).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(after()).toBeVisible();
  await expect(after()).toHaveText("CAT");
});
