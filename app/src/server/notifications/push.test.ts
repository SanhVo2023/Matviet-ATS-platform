import { describe, expect, it, vi } from "vitest";

// push.ts pulls the repository (→ D1) for send fan-out; the pure VAPID
// helpers under test don't touch it.
vi.mock("./repository", () => ({
  deletePushSubscription: vi.fn(),
  listPushSubscriptionsForUsers: vi.fn(async () => []),
}));

import { b64urlToBytes, bytesToB64url, buildVapidAuthHeader, importVapidKey } from "./push";

describe("base64url helpers", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(b64urlToBytes(bytesToB64url(bytes))).toEqual(bytes);
  });

  it("emits URL-safe output without padding", () => {
    const s = bytesToB64url(new Uint8Array([251, 255, 254, 63]));
    expect(s).not.toMatch(/[+/=]/);
  });
});

describe("VAPID JWT", () => {
  it("builds a verifiable ES256 vapid header from a generated keypair", async () => {
    // Generate a P-256 pair the same way real keys are provisioned
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const jwkPriv = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const publicKey = bytesToB64url(rawPub);
    const privateKey = jwkPriv.d!;

    const config = { publicKey, privateKey, subject: "mailto:hr@matviet.com.vn" };
    const key = await importVapidKey(publicKey, privateKey);
    const header = await buildVapidAuthHeader("https://fcm.googleapis.com", config, key);

    expect(header).toMatch(/^vapid t=.+, k=.+$/);
    const jwt = header.slice("vapid t=".length, header.indexOf(", k="));
    const [h, c, sig] = jwt.split(".");
    expect(h && c && sig).toBeTruthy();

    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(c!)));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("mailto:hr@matviet.com.vn");
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);

    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      b64urlToBytes(sig!) as BufferSource,
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });

  it("rejects a malformed public key", async () => {
    await expect(importVapidKey("AAAA", "AAAA")).rejects.toThrow(/uncompressed/);
  });
});
