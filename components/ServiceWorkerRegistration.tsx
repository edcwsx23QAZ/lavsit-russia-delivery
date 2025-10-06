'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // NUCLEAR APPROACH: Агрессивное детектирование dev режима
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.NODE_ENV === undefined ||
                           typeof window !== 'undefined' && (
                             window.location.hostname.includes('localhost') || 
                             window.location.hostname.includes('127.0.0.1') || 
                             window.location.hostname.includes('.e2b.app') ||
                             window.location.hostname.includes('ideavo') ||
                             window.location.port !== ''
                           );
      
      const isProduction = !isDevelopment;
      
      if (isProduction) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Service Worker registered successfully:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[SW] New version available');
                    // Could show a notification to user about update
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('[SW] Service Worker registration failed:', error);
          });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[SW] Message from service worker:', event.data);
        });
      } else {
        // DEVELOPMENT MODE: NUCLEAR SW DESTRUCTION
        console.log('[SW] DEV: NUCLEAR SERVICE WORKER DESTRUCTION INITIATED');
        
        // Step 1: Brute force cache clearing
        if ('caches' in window) {
          const clearAllCaches = async () => {
            try {
              const cacheNames = await caches.keys();
              console.log('[SW] DEV: Found caches to delete:', cacheNames);
              
              const deletePromises = cacheNames.map(async (cacheName) => {
                const deleted = await caches.delete(cacheName);
                console.log(`[SW] DEV: Cache ${cacheName} deleted:`, deleted);
                return deleted;
              });
              
              await Promise.all(deletePromises);
              console.log('[SW] DEV: All caches cleared');
            } catch (error) {
              console.error('[SW] DEV: Error clearing caches:', error);
            }
          };
          
          clearAllCaches();
          
          // Repeat cache clearing every 2 seconds for 10 seconds
          const clearIntervalId = setInterval(clearAllCaches, 2000);
          setTimeout(() => clearInterval(clearIntervalId), 10000);
        }
        
        // Step 2: Unregister ALL existing SWs aggressively
        const unregisterAll = async () => {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log('[SW] DEV: Found SW registrations:', registrations.length);
            
            const unregisterPromises = registrations.map(async (registration) => {
              const unregistered = await registration.unregister();
              console.log('[SW] DEV: SW unregistered:', unregistered, registration.scope);
              return unregistered;
            });
            
            await Promise.all(unregisterPromises);
            console.log('[SW] DEV: All SWs unregistered');
          } catch (error) {
            console.error('[SW] DEV: Error unregistering SWs:', error);
          }
        };
        
        unregisterAll();
        
        // Repeat unregistration every 3 seconds for 15 seconds
        const unregisterIntervalId = setInterval(unregisterAll, 3000);
        setTimeout(() => clearInterval(unregisterIntervalId), 15000);
        
        // Step 3: Check for active SW and force reload if found
        const checkActiveSW = () => {
          if (navigator.serviceWorker.controller) {
            console.log('[SW] DEV: Active SW detected, force reloading in 3 seconds...');
            setTimeout(() => {
              console.log('[SW] DEV: Force reloading page to clear SW state');
              window.location.reload();
            }, 3000);
          }
        };
        
        // Check immediately and periodically
        setTimeout(checkActiveSW, 5000);
        const checkIntervalId = setInterval(checkActiveSW, 5000);
        setTimeout(() => clearInterval(checkIntervalId), 30000);
      }
    }
  }, []);

  return null; // This component renders nothing
}