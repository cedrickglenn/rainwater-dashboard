/**
 * Service Worker — RainWater Dashboard
 *
 * Handles Web Push notifications only.
 * No caching or offline strategy — app is always-online IoT dashboard.
 */

self.addEventListener('install', () => {
  // Activate immediately — don't wait for old SW to expire
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

/**
 * Push event — show system notification
 * Payload JSON shape: { title, body, icon, tag, url }
 */
self.addEventListener('push', (event) => {
  let data = { title: 'RainWater Dashboard', body: 'System alert', tag: 'rainwater' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: data.tag || 'rainwater',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click — focus existing window or open new one
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (new URL(client.url).pathname === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
