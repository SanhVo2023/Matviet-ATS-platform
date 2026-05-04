/**
 * Netlify Scheduled Function — kicks the Next.js email drain route every 5 min.
 *
 * Mirrors the scoring-drain shim. See netlify/functions/scoring-drain.ts and
 * src/app/api/emails/drain/route.ts for rationale.
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
  const res = await fetch(`${base}/api/emails/drain`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  return { statusCode: res.status, body };
};
