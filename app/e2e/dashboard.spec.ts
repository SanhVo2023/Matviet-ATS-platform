import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("dashboard renders its sections without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  const realErrors = errors.filter(
    // Next dev-overlay noise and failed prefetches are not app errors
    (e) => !/hydration|preload|prefetch|Download the React DevTools/i.test(e),
  );
  expect(realErrors, `console errors:\n${realErrors.join("\n")}`).toHaveLength(0);
});
