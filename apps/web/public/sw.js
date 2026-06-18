// Service worker for Web Push notifications.
// Payloads are generic (no message content) because chats are E2E-encrypted.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "A Space for Us", body: "New message", url: "/chat" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}

  event.waitUntil(
    (async () => {
      // If a chat tab is already focused, don't nag with a notification.
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = clients.some((c) => c.focused && c.url.includes("/chat"));
      if (focused) return;

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "couple-chat-message",
        renotify: true,
        data: { url: data.url || "/chat" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/chat";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        if (c.url.includes(target) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })()
  );
});
