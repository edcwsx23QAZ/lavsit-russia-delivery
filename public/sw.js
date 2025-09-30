const CACHE_NAME = 'transport-diagnostic-v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache configuration
const CACHE_CONFIG = {
  // Static assets - cache for long time
  static: {
    pattern: /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
    duration: 24 * 60 * 60 * 1000, // 24 hours
  },
  // API responses - cache for short time
  api: {
    pattern: /^\/api\//,
    duration: 5 * 60 * 1000, // 5 minutes
  },
  // Pages - cache for medium time
  pages: {
    pattern: /^\/[^.]*$/,
    duration: 30 * 60 * 1000, // 30 minutes
  }
};

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opened cache');
      // Cache essential files during install
      return cache.addAll([
        '/',
        '/diagnostic',
        '/manifest.json'
      ]).catch(error => {
        console.warn('[SW] Failed to cache some files during install:', error);
      });
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Determine caching strategy based on request type
  const cacheStrategy = getCacheStrategy(url.pathname);
  
  if (!cacheStrategy) {
    return; // Don't cache this request
  }

  event.respondWith(
    handleRequest(request, cacheStrategy)
  );
});

// Determine appropriate cache strategy
function getCacheStrategy(pathname) {
  if (CACHE_CONFIG.static.pattern.test(pathname)) {
    return { ...CACHE_CONFIG.static, name: 'static' };
  }
  
  if (CACHE_CONFIG.api.pattern.test(pathname)) {
    return { ...CACHE_CONFIG.api, name: 'api' };
  }
  
  if (CACHE_CONFIG.pages.pattern.test(pathname)) {
    return { ...CACHE_CONFIG.pages, name: 'pages' };
  }
  
  return null;
}

// Handle request with appropriate caching strategy
async function handleRequest(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Check if cached response is still valid
  if (cachedResponse) {
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate);
      if (age < strategy.duration) {
        console.log(`[SW] Serving from cache (${strategy.name}):`, request.url);
        return cachedResponse;
      } else {
        console.log(`[SW] Cache expired (${strategy.name}):`, request.url);
        // Remove expired cache entry
        cache.delete(request);
      }
    }
  }

  try {
    console.log(`[SW] Fetching from network (${strategy.name}):`, request.url);
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      // Clone response and add cache timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      // Cache the response
      cache.put(request, cachedResponse);
      console.log(`[SW] Cached response (${strategy.name}):`, request.url);
    }
    
    return response;
  } catch (error) {
    console.error(`[SW] Network request failed (${strategy.name}):`, request.url, error);
    
    // Return cached response if network fails, even if expired
    if (cachedResponse) {
      console.log(`[SW] Serving stale cache due to network error (${strategy.name}):`, request.url);
      return cachedResponse;
    }
    
    // Return a basic offline response for pages
    if (strategy.name === 'pages') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Офлайн</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: white; }
            .offline { max-width: 400px; margin: 0 auto; }
            h1 { color: #f39c12; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>Подключение отсутствует</h1>
            <p>Страница недоступна в автономном режиме.</p>
            <p>Проверьте подключение к интернету и попробуйте снова.</p>
            <button onclick="window.location.reload()">Попробовать снова</button>
          </div>
        </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 503,
          statusText: 'Service Unavailable'
        }
      );
    }
    
    throw error;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then((info) => {
        event.ports[0].postMessage({ success: true, data: info });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
  }
});

// Clear all caches
async function clearCache() {
  console.log('[SW] Clearing all caches');
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
  console.log('[SW] All caches cleared');
}

// Get cache information
async function getCacheInfo() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const info = {
    totalEntries: keys.length,
    entries: []
  };
  
  for (const request of keys) {
    const response = await cache.match(request);
    const cachedDate = response?.headers.get('sw-cached-date');
    
    info.entries.push({
      url: request.url,
      method: request.method,
      cachedDate: cachedDate ? new Date(parseInt(cachedDate)).toISOString() : null,
      size: response?.headers.get('content-length') || 'unknown'
    });
  }
  
  return info;
}