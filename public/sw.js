// SN Invoice Service Worker
const CACHE_NAME = 'sn-invoice-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do NOT cache API requests, verification endpoints, sensitive invoice payloads, or auth calls
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/auth/') ||
    url.pathname.startsWith('/verify')
  ) {
    return;
  }

  // Network first for HTML documents with offline fallback
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') || caches.match('/') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Stale-while-revalidate for static assets with safe error rejection handling
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch((err) => {
        console.warn('SN Invoice ServiceWorker fetch fallback:', event.request.url, err);
        return new Response('', { status: 408, statusText: 'Network Timeout / Offline' });
      });
    })
  );
});

