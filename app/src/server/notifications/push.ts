import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deletePushSubscription, listPushSubscriptionsForUsers } from "./repository";

/**
 * Web Push sender — VAPID (RFC 8292) over WebCrypto, Workers-compatible.
 *
 * We deliberately send PAYLOAD-FREE pushes: an empty POST needs only the
 * VAPID ES256 JWT, not RFC 8291 payload encryption (which would drag in an
 * ECDH+HKDF+AES-GCM implementation for no benefit at our scale). The service
 * worker (`public/sw.js`) reacts to the bare push by fetching
 * `/api/notifications` with its session cookie and rendering the newest
 * unread item — so the OS notification still shows real content.
 *
 * Keys: VAPID_PUBLIC_KEY (var, base64url uncompressed P-256 point) +
 * VAPID_PRIVATE_KEY (secret, base64url 32-byte `d`) + VAPID_SUBJECT.
 * Missing keys → push silently disabled (in-app bell still works).
 */

const encoder = new TextEncoder();

export function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToB64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

async function getVapidConfig(): Promise<VapidConfig | null> {
  let env: Record<string, unknown> = {};
  try {
    env = (await getCloudflareContext({ async: true })).env as unknown as Record<string, unknown>;
  } catch {
    // plain node (tests / next dev without bindings) — fall through to process.env
  }
  const publicKey = (env.VAPID_PUBLIC_KEY as string) || process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = (env.VAPID_PRIVATE_KEY as string) || process.env.VAPID_PRIVATE_KEY || "";
  const subject =
    (env.VAPID_SUBJECT as string) || process.env.VAPID_SUBJECT || "mailto:hr@matviet.com.vn";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/** Client needs the public key to call pushManager.subscribe(). */
export async function getVapidPublicKey(): Promise<string | null> {
  return (await getVapidConfig())?.publicKey ?? null;
}

/**
 * Import the VAPID keypair as a WebCrypto ECDSA P-256 signing key.
 * publicKey is the base64url uncompressed point (0x04 ‖ x ‖ y, 65 bytes).
 */
export async function importVapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const pub = b64urlToBytes(publicKey);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY is not an uncompressed P-256 point");
  }
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: privateKey,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

/**
 * `Authorization: vapid t=<jwt>, k=<publicKey>` for one push-service origin.
 * WebCrypto ECDSA already emits the raw r‖s signature JWS wants.
 */
export async function buildVapidAuthHeader(
  audienceOrigin: string,
  config: VapidConfig,
  key: CryptoKey,
): Promise<string> {
  const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(
    encoder.encode(
      JSON.stringify({
        aud: audienceOrigin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: config.subject,
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );
  return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${config.publicKey}`;
}

/**
 * Fire a payload-free push at every registered device of the given users.
 * Never throws — push is strictly best-effort on top of the in-app rows.
 * 404/410 responses mean the browser dropped the subscription → delete it.
 */
export async function sendPushToUsers(userIds: string[]): Promise<void> {
  try {
    const config = await getVapidConfig();
    if (!config || userIds.length === 0) return;
    const subs = await listPushSubscriptionsForUsers(userIds);
    if (subs.length === 0) return;

    const key = await importVapidKey(config.publicKey, config.privateKey);
    // One JWT per push-service origin (endpoints on the same service share it)
    const headerByOrigin = new Map<string, string>();

    for (const sub of subs) {
      try {
        const origin = new URL(sub.endpoint).origin;
        let authHeader = headerByOrigin.get(origin);
        if (!authHeader) {
          authHeader = await buildVapidAuthHeader(origin, config, key);
          headerByOrigin.set(origin, authHeader);
        }
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: { Authorization: authHeader, TTL: "3600", Urgency: "normal" },
        });
        if (res.status === 404 || res.status === 410) {
          await deletePushSubscription(sub.endpoint);
        } else if (!res.ok) {
          console.warn(`[push] ${origin} -> ${res.status} ${await res.text()}`);
        }
      } catch (err) {
        console.warn("[push] send failed for one endpoint:", err);
      }
    }
  } catch (err) {
    console.warn("[push] sendPushToUsers failed:", err);
  }
}
