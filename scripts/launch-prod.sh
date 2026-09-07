#!/usr/bin/env bash
#
# Mắt Việt HR — production cutover (ONE atomic window).
#
# Runs the stage-collapse migration and the deploy back-to-back. They MUST go
# together: the new 8-stage code and the old 16-stage prod data are mutually
# incompatible, so migrating without deploying (or vice-versa) breaks the live
# site. This script backs up first, applies migrations, then deploys — and
# aborts the moment any step fails.
#
# WHERE TO RUN: anywhere `wrangler` is logged in to the matviet Cloudflare
# account — including THIS Windows box. The only catch is the build step:
# workerd crashes building the Worker bundle from a path containing diacritics
# ("Mắt Việt HR"). The fix (verified 2026-09-07) is a directory junction that
# gives the same files an ASCII path. One was already created at:
#     E:\NEW APP\HR imrovement\MatVietHR   ->  ...\Mắt Việt HR
# So on Windows, run this script from the junction in Git Bash:
#     cd "/e/NEW APP/HR imrovement/MatVietHR/app" && bash ../scripts/launch-prod.sh
# (Recreate the junction if missing:  cmd //c mklink /J "E:\NEW APP\HR imrovement\MatVietHR" "E:\NEW APP\HR imrovement\Mắt Việt HR")
# On Linux/macOS/CI there is no diacritics issue — run it from the repo directly.
#
# PREREQUISITES:
#   - `git push origin main` already done (so this deploys the reviewed code).
#   - wrangler authenticated: `npx wrangler whoami` shows the matviet account.
#   - Node deps installed in app/: `cd app && npm ci`.
#
# Usage:  bash scripts/launch-prod.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/app"

STAMP="$(date -u +%Y%m%d-%H%M%SZ)"
BACKUP="backup-prelaunch-${STAMP}.sql"

echo "==> Mắt Việt HR production cutover  (${STAMP})"
echo "    account: $(npx wrangler whoami 2>/dev/null | tail -1 || echo '??? run: npx wrangler login')"
echo

echo "==> [1/4] Backing up production D1 to ${BACKUP}"
npx wrangler d1 export matviet-hr --remote --output "${BACKUP}"
echo "    backup saved: app/${BACKUP}"
echo "    (recovery path if anything goes wrong: wrangler d1 time-travel restore matviet-hr --before-timestamp <ISO>)"
echo

echo "==> [2/4] Applying production migrations (0007 rate-limits/lockout/banned + 0008 stage collapse)"
npx wrangler d1 migrations apply matviet-hr --remote
echo

echo "==> [3/4] Building + deploying the Worker (new 8-stage code) — do NOT interrupt"
npm run deploy
echo

echo "==> [4/4] Post-deploy probes"
echo "    -- stage sanity (expect ONLY the 8 new stages, no legacy values):"
npx wrangler d1 execute matviet-hr --remote --command \
  "SELECT current_stage, COUNT(*) n FROM candidates GROUP BY current_stage ORDER BY n DESC;"
echo
echo "==> Deploy complete. Remaining MANUAL steps (in the app / dashboard):"
echo "    1. /cai-dat/he-thong → click \"Khóa tài khoản demo\" (locks the seeded demo accounts)."
echo "    2. Confirm prod has NO ALLOW_DEMO_SEED secret:  npx wrangler secret list"
echo "       (must show CRON_SECRET + BETTER_AUTH_SECRET; add SENTRY_DSN if you want error reporting)"
echo "    3. Invite the real accounts (chị Hương = hr, store managers = hiring_manager,"
echo "       BOD/Tập đoàn = bod/tap_doan) via the invite flow — welcome emails do the onboarding."
echo "    4. Watch the tail for 5 minutes:  npx wrangler tail matviet-hr"
echo
echo "    If step 4 shows errors referencing legacy stages, restore from the backup above and re-check the code."
