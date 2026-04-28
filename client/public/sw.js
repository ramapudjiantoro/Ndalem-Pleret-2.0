// ─── Ndalem Pleret — Service Worker ──────────────────────────────────────────
// Handles Web Push Notifications so admin gets alerted even when the page is closed.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── Push event: show notification ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title   = data.title  || "Ndalem Pleret";
  const options = {
    body:              data.body || "",
    icon:              "/logo.jpg",
    badge:             "/logo.jpg",
    tag:               data.tag  || "np-notif",
    requireInteraction: data.requireInteraction === true,
    data:              { url: data.url || "/admin" },
    vibrate:           [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus/open admin page ──────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Jika tab admin sudah terbuka, fokus ke tab itu
        for (const client of clientList) {
          if (client.url.includes("/admin") && "focus" in client) {
            return client.focus();
          }
        }
        // Kalau belum, buka tab baru
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
