/**
 * Netlify Scheduled Function — kicks the Next.js drain route every 5 min.
 *
 * Why a shim instead of registering /api/scoring/drain directly: Netlify's
 * `[functions."<name>"] schedule = ...` syntax targets stand-alone functions
 * under `netlify/functions/`, not App Router route handlers managed by
 * @netlify/plugin-nextjs. The cleanest pattern is to make the cron call our
 * own API route via internal HTTP — keeps the auth check + business logic in
 * one place (src/app/api/scoring/drain/route.ts) and lets us also hit the
 * route manually with curl + CRON_SECRET for ad-hoc draining.
 */

interface NetlifyHandlerResult {
  statusCode: number;
  body: string;
}

export const handler = async (): Promise<NetlifyHandlerResult> => {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { statusCode: 503, body: JSON.stringify({ error: "CRON_SECRET not configured" }) };
  }
  const res = await fetch(`${base}/api/scoring/drain`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  return { statusCode: res.status, body };
};
