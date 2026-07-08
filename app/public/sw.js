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
 *
 * Navigation resilience (2026-07-08): the same resets also kill the HTML
 * document request itself → Chrome's hard ERR_CONNECTION_CLOSED screen.
 * Navigations now get retry-once + a precached branded /offline.html that
 * keeps retrying and reloads itself the moment the connection recovers.
 */
const STATIC_CACHE = "mv-static-v1";
const SHELL_CACHE = "mv-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // cache: "reload" bypasses the HTTP cache so a redeploy always
      // refreshes the stored copy along with the new SW version.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Drop old cache generations if the names ever get bumped
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (n) =>
              (n.startsWith("mv-static-") && n !== STATIC_CACHE) ||
              (n.startsWith("mv-shell-") && n !== SHELL_CACHE),
          )
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  ),
);

/** One retry after a short pause — enough to ride out a TCP reset. */
async function fetchWithRetry(request, delayMs) {
  try {
    return await fetch(request);
  } catch {
    await new Promise((r) => setTimeout(r, delayMs));
    return fetch(request);
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return; // default browser handling
  }

  // Top-level page loads: network (with retry), else the offline page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetchWithRetry(event.request, 800);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          if (cached) return cached;
          // Brand-new SW whose install precache failed — minimal inline fallback.
          return new Response(
            '<!doctype html><html lang="vi"><meta charset="utf-8">' +
              "<title>Mất kết nối</title>" +
              '<body style="font-family:system-ui;background:#0b1430;color:#f3f5fa;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center">' +
              "<div><h1>Mất kết nối tới máy chủ</h1><p>Trang sẽ tự tải lại khi có mạng…</p>" +
              "<script>setInterval(function(){fetch(location.href,{cache:'no-store'}).then(function(){location.reload()}).catch(function(){})},4000)</" +
              "script></div>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Strictly immutable, content-hashed assets only — never HTML/API.
  if (!url.pathname.startsWith("/_next/static/")) {
    return; // default browser handling
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetchWithRetry(event.request, 500);
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
