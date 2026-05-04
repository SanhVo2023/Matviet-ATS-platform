import "server-only";
import { ConfidentialClientApplication, type Configuration } from "@azure/msal-node";

/**
 * MSAL app-only (client credentials) flow.
 *
 * Application permissions in Azure AD must be granted with admin consent:
 *   - Mail.Send       — outbound email via /users/{id}/sendMail
 *   - Mail.Read       — inbound poll (G6.5)
 *   - Calendars.ReadWrite + OnlineMeetings.ReadWrite — G7
 *
 * The mailbox `MS_MAILBOX_ADDRESS` must hold an active M365 license; application-scope
 * sendMail silently fails on unlicensed shared mailboxes.
 */

let cachedClient: ConfidentialClientApplication | null = null;
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
      "MS Graph not configured. Missing one of MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_MAILBOX_ADDRESS in .env.local.",
    );
  }
  return { tenantId, clientId, clientSecret, mailbox };
}

function getMsalClient(): ConfidentialClientApplication {
  if (cachedClient) return cachedClient;
  const { tenantId, clientId, clientSecret } = readEnv();
  const config: Configuration = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };
  cachedClient = new ConfidentialClientApplication(config);
  return cachedClient;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() + REFRESH_MARGIN_MS < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const result = await getMsalClient().acquireTokenByClientCredential({
    scopes: [SCOPE],
  });
  if (!result?.accessToken) {
    throw new Error("MSAL acquireTokenByClientCredential returned no access token");
  }
  cachedToken = {
    value: result.accessToken,
    expiresAt: result.expiresOn?.getTime() ?? Date.now() + 30 * 60 * 1000,
  };
  return result.accessToken;
}

export function getMailboxAddress(): string {
  return readEnv().mailbox;
}

export function clearTokenCacheForTests() {
  cachedToken = null;
}
