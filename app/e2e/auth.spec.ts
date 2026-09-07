import { test, expect } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD, loginAsAdmin } from "./helpers";

// Login-flow specs need a FRESH browser context (no admin storage state) —
// and each real sign-in spends rate-limit budget, so keep these few.
test.describe("login flows (fresh context)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login with valid credentials lands on the dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/($|\?)/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("wrong password shows the Vietnamese error, not a redirect loop", async ({ page }) => {
    await page.goto("/dang-nhap");
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Mật khẩu", { exact: false }).first().fill("sai-mat-khau-123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    // Vietnamese copy for bad credentials OR the lockout/rate-limit branch.
    // (Target the text, not role=alert — Next's route announcer is also an alert.)
    await expect(page.getByText(/không đúng|tạm khóa|quá nhiều/i)).toBeVisible();
    await expect(page).toHaveURL(/dang-nhap/);
  });

  test("protected route without a session redirects to login with next param", async ({ page }) => {
    await page.goto("/ung-vien?stage=offer");
    await expect(page).toHaveURL(/dang-nhap\?next=/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toContain("/ung-vien");
    expect(next).toContain("stage=offer");
  });
});

// Uses the shared admin storage state (project default).
test("signed-in user visiting /dang-nhap is redirected home (no loop)", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.waitForURL((url) => !url.pathname.startsWith("/dang-nhap"), { timeout: 20_000 });
});
