/**
 * Mắt Việt HR service worker — Web Push receiver + static-asset cache.
 *
 * Pushes arrive PAYLOAD-FREE (the server skips RFC 8291 encryption on
 * purpose). On push we fetch the latest notifications with this browser's
 * session cookie and show the newest unread one; if the session expired we
 * fall back to a generic message.
 *
 * Static cache (2026-07-07): Vietnamese ISP ↔ Cloudflare peering resets
 * intermittently drop /_next/static/* mid-session, leaving pages unstyled
 * ("app stopped working"). Those files are content-hashed and immutable, so
 * cache-first is always safe — once a chunk has loaded once on this device,
 * a network blip can never break the UI again.
 */
const STATIC_CACHE = "mv-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Drop old cache generations if the name ever gets bumped
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("mv-static-") && n !== STATIC_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Strictly immutable, content-hashed assets only — never HTML/API.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/_next/static/")
  ) {
    return; // default browser handling
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) void cache.put(event.request, res.clone());
      return res;
    })(),
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "Mắt Việt HR";
      let body = "Bạn có thông báo mới";
      let link = "/";
      try {
        const res = await fetch("/api/notifications?limit=5", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const newest = (data.items || []).find((n) => !n.read_at) || (data.items || [])[0];
          if (newest) {
            title = newest.title;
            body = newest.body || "";
            link = newest.link || "/";
          }
          if (data.unread > 1) {
            body = body
              ? `${body}\n+${data.unread - 1} thông báo khác`
              : `${data.unread} thông báo chưa đọc`;
          }
        }
      } catch {
        /* offline / expired session — keep the generic text */
      }
      await self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "matviet-hr", // collapse bursts into one OS notification
        data: { link },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(link);
            } catch {
              /* cross-origin or dead client — ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(link);
    })(),
  );
});
