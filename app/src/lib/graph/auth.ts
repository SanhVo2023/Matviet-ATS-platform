import "server-only";

/**
 * App-only (client credentials) token for Microsoft Graph — plain fetch, no MSAL.
 * MSAL Node was dropped in the Cloudflare pivot (ADR 0009): the flow is a single
 * POST to login.microsoftonline.com and Workers prefer zero Node-dependency code.
 *
 * Application permissions in Azure AD must be granted with admin consent:
 *   - Mail.Send       — outbound email via /users/{id}/sendMail
 *   - Mail.Read       — inbound poll (G6.5)
 *   - Calendars.ReadWrite + OnlineMeetings.ReadWrite — G7
 *
 * The mailbox `MS_MAILBOX_ADDRESS` must hold an active M365 license; application-scope
 * sendMail silently fails on unlicensed shared mailboxes.
 */

let cachedToken: { value: string; expiresAt: number } | null = null;

const SCOPE = "https://graph.microsoft.com/.default";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function readEnv() {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const mailbox = process.env.MS_MAILBOX_ADDRESS;
  if (!tenantId || !clientId || !clientSecret || !mailbox) {
    throw new Error(
      "MS Graph not configured. Missing one of MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_MAILBOX_ADDRESS.",
    );
  }
  return { tenantId, clientId, clientSecret, mailbox };
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() + REFRESH_MARGIN_MS < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const { tenantId, clientId, clientSecret } = readEnv();
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph token request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Graph token response contained no access_token");
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
  return json.access_token;
}

export function getMailboxAddress(): string {
  return readEnv().mailbox;
}

export function clearTokenCacheForTests() {
  cachedToken = null;
}
