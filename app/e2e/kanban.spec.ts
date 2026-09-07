import { test, expect } from "@playwright/test";

/**
 * Render smoke only for now. The keyboard-drag regression spec lands with
 * renovation R4/3a (the current board has no KeyboardSensor and the audit
 * found pointer drag swallowed by the overlay link — both fixed there).
 *
 * Needs a seeded job workspace; skips cleanly when the local DB has none
 * (demo-seed is env-gated and may be off in local dev).
 */
test("job workspace kanban renders its columns", async ({ page }) => {
  await page.goto("/vi-tri");
  // A real workspace link is /vi-tri/<id> — exclude the list itself, /moi, etc.
  const jobLink = page
    .locator('a[href*="/vi-tri/"]')
    .filter({ hasNot: page.locator('[href$="/moi"]') })
    .first();

  const href = (await jobLink.count()) ? await jobLink.getAttribute("href") : null;
  const isWorkspace = href && /\/vi-tri\/[^/]+$/.test(href) && !href.endsWith("/moi");
  test.skip(!isWorkspace, "no seeded job workspace in local DB");

  await page.goto(href!);
  await expect(page.getByRole("heading").first()).toBeVisible();
  // The pipeline group columns (Vietnamese labels from STAGE_GROUPS)
  await expect(page.getByText(/Tiếp nhận/i).first()).toBeVisible();
});
