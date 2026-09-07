import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, readSeedInfo } from "./helpers";

/**
 * The three candidate-facing surfaces — the only pages real candidates ever
 * see, and the ones with zero manual QA. Smoke: render, branding, no
 * horizontal scroll (both projects run these; the mobile project is the
 * important one).
 */

test.describe("careers (/tuyen-dung)", () => {
  test("job board renders and the apply form is reachable", async ({ page }) => {
    await page.goto("/tuyen-dung");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);

    const firstJob = page.locator('a[href^="/tuyen-dung/"]').first();
    if ((await firstJob.count()) === 0) {
      test.skip(true, "no open jobs — demo seed skipped");
    }
    // Navigate directly (no click race) and wait for the page to settle — the
    // detail route may be compiling cold on first hit.
    const href = await firstJob.getAttribute("href");
    await page.goto(href!, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The apply form's essentials, targeted by stable ids (labels carry a
    // nested "*" marker span).
    await expect(page.locator("#apply-name")).toBeVisible();
    await expect(page.locator("#apply-cv")).toBeAttached();
    await expect(page.getByRole("button", { name: /nộp|ứng tuyển|gửi/i })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe("assessment (/test/[token])", () => {
  test("valid token page (or the invalid-token state) renders cleanly", async ({ page }) => {
    const seed = readSeedInfo();
    const testUrl = seed?.body?.publicTestUrl;
    if (testUrl) {
      await page.goto(new URL(testUrl).pathname);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    } else {
      await page.goto("/test/khong-hop-le");
      // Invalid/expired state still shows a branded, explained error card
      await expect(page.getByText(/không hợp lệ|hết hạn/i).first()).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });
});

test.describe("offer (/nhan-viec/[token])", () => {
  test("invalid-token state renders a explained error, not a crash", async ({ page }) => {
    await page.goto("/nhan-viec/khong-hop-le");
    await expect(page.getByText(/không hợp lệ|hết hạn|không tìm thấy/i).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
