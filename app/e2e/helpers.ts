import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { E2E_EMAIL, E2E_PASSWORD } from "./global-setup";

export { E2E_EMAIL, E2E_PASSWORD };

export interface SeedInfo {
  status: number;
  body: {
    ok?: boolean;
    publicTestUrl?: string;
    users?: Array<{ email: string; password: string; role: string }>;
  };
}

/** Fixture info from global-setup's demo-seed call; null when unavailable. */
export function readSeedInfo(): SeedInfo | null {
  try {
    return JSON.parse(readFileSync(join(__dirname, ".seed.json"), "utf8")) as SeedInfo;
  } catch {
    return null;
  }
}

/** UI login as the deterministic e2e admin; lands on the dashboard. Generous
 * timeout: scrypt verify (~1-5s) plus a possible cold sign-in route compile. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/dang-nhap");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Mật khẩu", { exact: false }).first().fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
  // Generous: cold `next dev` compiles the sign-in route + candidate pages on
  // first hit (Windows first-compile can run 30-60s).
  await page.waitForURL((url) => !url.pathname.startsWith("/dang-nhap"), { timeout: 90_000 });
}

/** The page body must never scroll horizontally (audit: mobile tables). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}
