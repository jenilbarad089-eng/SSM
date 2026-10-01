/**
 * SocietyHub - Progressive Web App (PWA) Service Worker
 * Enables Standalone App Installation & Offline Assets Caching
 */

const CACHE_NAME = 'societyhub-v3.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/presentation.html',
  '/admin.html',
  '/resident.html',
  '/guard.html',
  '/committee.html',
  '/waiting-approval.html',
  '/docs.html',
  '/changelog.html',
  '/privacy.html',
  '/terms.html',
  '/cookies.html',
  '/css/style.css',
  '/js/theme.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/firebase-auth.js',
  '/js/notifications.js',
  '/js/admin.js',
  '/js/resident.js',
  '/js/guard.js',
  '/js/committee.js',
  '/manifest.json'
];

// Install Event - Cache Core App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell & Assets');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('[Service Worker] Cache failed for:', url, err.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale While Revalidate Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
