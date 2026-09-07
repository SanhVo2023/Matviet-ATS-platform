import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("candidates list renders (table or empty state)", async ({ page }) => {
  await page.goto("/ung-vien");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Either seeded rows or the guided empty state — both are healthy renders
  const hasRows = (await page.locator("table tbody tr").count()) > 0;
  if (!hasRows) {
    await expect(page.getByText(/chưa có|tải lên/i).first()).toBeVisible();
  }
  await expectNoHorizontalScroll(page);
});
