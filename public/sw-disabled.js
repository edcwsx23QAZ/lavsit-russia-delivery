// DEVELOPMENT MODE - SERVICE WORKER DISABLED
// This Service Worker is completely disabled in development
// to prevent webpack module caching issues

console.log('[SW] DEVELOPMENT MODE - SERVICE WORKER DISABLED');

// Immediately unregister self and clear all caches
self.addEventListener('install', (event) => {
  console.log('[SW] DEV: Self-destructing on install');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] DEV: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] DEV: Skipping waiting and unregistering');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] DEV: Self-destructing on activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] DEV: Force deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Force unregister this service worker
      return self.registration.unregister();
    }).then(() => {
      console.log('[SW] DEV: Service Worker unregistered successfully');
      // Reload all clients to clear any cached state
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        console.log('[SW] DEV: Reloading client:', client.url);
        client.postMessage({ type: 'SW_DISABLED_RELOAD' });
      });
    })
  );
});

// Disable all fetch events
self.addEventListener('fetch', (event) => {
  console.log('[SW] DEV: Ignoring fetch request (SW disabled):', event.request.url);
  // Do nothing - let requests go to network
});

// Handle messages and respond with disabled status
self.addEventListener('message', (event) => {
  console.log('[SW] DEV: Message received, responding with disabled status');
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ 
      success: false, 
      error: 'Service Worker disabled in development mode' 
    });
  }
});