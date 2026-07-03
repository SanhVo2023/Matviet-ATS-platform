/**
 * Mắt Việt HR service worker — Web Push receiver.
 *
 * Pushes arrive PAYLOAD-FREE (the server skips RFC 8291 encryption on
 * purpose). On push we fetch the latest notifications with this browser's
 * session cookie and show the newest unread one; if the session expired we
 * fall back to a generic message.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
