/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Skip waiting and claim clients immediately
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------- Runtime caching ----------

// API calls - Network First (try network, fallback to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Local images - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// External images - Cache First
registerRoute(
  /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'external-images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

// Google Fonts - Cache First
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Static assets - Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'static-assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

// Auth and API routes - never intercept
registerRoute(
  ({ url }) => url.pathname.startsWith('/auth/'),
  new NetworkOnly()
);

// Navigation fallback - serve index.html for all app routes
registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: 'navigation-cache' }),
    { denylist: [/^\/api\//, /^\/auth\//] }
  )
);

// ---------- Push notifications ----------

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = { title: 'DezenFoods', body: 'You have a new notification' };
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload.body = event.data.text();
  }

  const { title, body, icon = '/icons/icon-192x192.png', badge = '/icons/icon-72x72.png', url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag ?? 'dezenfoods-notification',
      data: { url: url ?? '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window if it's already open at this URL
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
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
