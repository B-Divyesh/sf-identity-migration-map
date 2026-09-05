import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  ["/", "Identity Migration Map — Find identifier dependencies"],
  ["/demo/", "Demo — Identity Migration Map"],
  ["/privacy/", "Privacy — Identity Migration Map"],
  ["/terms/", "Terms — Identity Migration Map"]
] as const;

for (const [route, title] of routes) {
  test(`${route} has one clear page structure and no serious accessibility violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /social-card\.png$/);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("phone first screen states the job, audience, first action, and three facts before scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find every dependency before renaming a user");
  await expect(page.getByText(/For self-hosters and small-team administrators/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Try it with sample data" })).toBeVisible();
  await expect(page.locator(".trust-list li")).toHaveCount(3);
  const bottom = await page.locator(".trust-list").evaluate((element) => element.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("keyboard focus, sample validation, empty state, and recovery work", async ({ page }) => {
  await page.goto("/demo/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  const skipOutline = await page.getByRole("link", { name: "Skip to main content" }).evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(Number.parseFloat(skipOutline)).toBeGreaterThanOrEqual(3);

  await page.locator("#new-id").fill("alice");
  await page.getByRole("button", { name: "Map this excerpt" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#demo-error")).toContainText("must be different");
  await expect(page.locator("#new-id")).toBeFocused();

  await page.locator("#new-id").fill("alice.ops");
  await page.locator("#old-id").fill("missing-user");
  await page.getByRole("button", { name: "Map this excerpt" }).click();
  await expect(page.getByRole("heading", { name: /No literal/ })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator("#result-count")).toHaveText("4 hits");
});

test("mobile controls meet target sizes and 200 percent text does not create horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/");
  const undersized = await page.locator("a, button, input, textarea").evaluateAll((elements) => elements.flatMap((element) => {
    const target = element instanceof HTMLInputElement && element.type === "checkbox" ? element.closest("label")! : element;
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    if (style.display === "none" || style.visibility === "hidden") return [];
    return rect.width < 44 || rect.height < 44 ? [`${element.tagName}:${(element.textContent || (element as HTMLInputElement).name).trim()}:${rect.width}x${rect.height}`] : [];
  }));
  expect(undersized).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("reduced motion removes meaningful movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo/");
  const duration = await page.locator(".hit-list li").first().evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
});

test("unknown paths return the designed 404 document", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-route");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Identity Migration Map");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist");
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
});

test("all internal links on each route resolve", async ({ page, request }) => {
  for (const [route] of routes) {
    await page.goto(route);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => [...new Set(links.map((link) => (link as HTMLAnchorElement).href))]);
    for (const href of hrefs) {
      const response = await request.get(href.split("#")[0]);
      expect(response.status(), href).toBe(200);
    }
  }
});
