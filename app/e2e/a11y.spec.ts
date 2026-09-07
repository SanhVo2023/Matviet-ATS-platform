import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * axe scans of the five critical pages.
 *
 * Gate (renovation R0): zero CRITICAL violations. `serious` counts are logged
 * as annotations; the gate tightens to include `serious` once the R4 a11y
 * batch (contrast, labels, touch targets) lands — do not tighten before.
 */
async function scan(page: import("@playwright/test").Page, name: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");
  test.info().annotations.push({ type: `axe:${name}`, description: `serious=${serious.length}` });
  expect(
    critical,
    `${name}: critical a11y violations:\n${critical.map((v) => `${v.id}: ${v.help}`).join("\n")}`,
  ).toHaveLength(0);
}

test.describe("axe — public (fresh context)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page", async ({ page }) => {
    await page.goto("/dang-nhap");
    await scan(page, "dang-nhap");
  });

  test("careers page", async ({ page }) => {
    await page.goto("/tuyen-dung");
    await scan(page, "tuyen-dung");
  });
});

test.describe("axe — signed in", () => {
  test("dashboard", async ({ page }) => {
    await page.goto("/");
    await scan(page, "dashboard");
  });

  test("candidates list", async ({ page }) => {
    await page.goto("/ung-vien");
    await scan(page, "ung-vien");
  });

  test("job workspace (kanban)", async ({ page }) => {
    await page.goto("/vi-tri");
    const jobLink = page
      .locator('a[href*="/vi-tri/"]')
      .filter({ hasNot: page.locator('[href$="/moi"]') })
      .first();
    const href = (await jobLink.count()) ? await jobLink.getAttribute("href") : null;
    // Only a real workspace URL (/vi-tri/<id>, not /vi-tri or /vi-tri/moi).
    const isWorkspace = href && /\/vi-tri\/[^/]+$/.test(href) && !href.endsWith("/moi");
    test.skip(!isWorkspace, "no seeded job workspace in local DB");
    await page.goto(href!, { waitUntil: "networkidle" });
    await scan(page, "vi-tri-kanban");
  });
});
