// EMERGENCY DEV KILL SWITCH - DO NOT CACHE ANYTHING
console.log('[SW] EMERGENCY: Self-destructing immediately');

// Immediately unregister self
self.registration.unregister().then(() => {
  console.log('[SW] EMERGENCY: Self-unregistered successfully');
});

// Kill all events
self.addEventListener('install', (event) => {
  console.log('[SW] EMERGENCY: Install blocked');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] EMERGENCY: Activate blocked, self-destructing');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // DO NOTHING - let all requests pass through
  console.log('[SW] EMERGENCY: Fetch event ignored');
});