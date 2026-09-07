import { test as setup } from "@playwright/test";
import { join } from "node:path";
import { loginAsAdmin } from "./helpers";

export const ADMIN_STATE = join(__dirname, ".auth", "admin.json");

/** One real sign-in per run; every authenticated spec reuses the cookie via
 * storageState — keeps the suite inside the 5-per-15min sign-in rate limit. */
setup("authenticate as e2e admin", async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: ADMIN_STATE });
});
