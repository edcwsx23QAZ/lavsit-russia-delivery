// CRITICAL DEV CACHE CLEARING SCRIPT
(function() {
  'use strict';
  
  console.log('[CACHE-CLEAR] Starting aggressive cache clearing...');
  
  // Clear all possible storage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
      console.log('[CACHE-CLEAR] localStorage cleared');
    }
  } catch (e) {
    console.warn('[CACHE-CLEAR] localStorage clear failed:', e);
  }
  
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      console.log('[CACHE-CLEAR] sessionStorage cleared');
    }
  } catch (e) {
    console.warn('[CACHE-CLEAR] sessionStorage clear failed:', e);
  }
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      console.log('[CACHE-CLEAR] Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[CACHE-CLEAR] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[CACHE-CLEAR] All caches cleared');
    }).catch(function(error) {
      console.warn('[CACHE-CLEAR] Cache clearing failed:', error);
    });
  }
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      console.log('[CACHE-CLEAR] Found service workers:', registrations.length);
      return Promise.all(
        registrations.map(function(registration) {
          console.log('[CACHE-CLEAR] Unregistering SW:', registration.scope);
          return registration.unregister();
        })
      );
    }).then(function() {
      console.log('[CACHE-CLEAR] All service workers unregistered');
    }).catch(function(error) {
      console.warn('[CACHE-CLEAR] SW unregistration failed:', error);
    });
  }
  
  console.log('[CACHE-CLEAR] Cache clearing completed');
})();