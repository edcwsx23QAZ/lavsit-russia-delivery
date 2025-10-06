'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // В production регистрируем SW, в development отключаем
      if (process.env.NODE_ENV === 'production') {
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
        // Отключаем SW в development
        console.log('[SW] DEV: Отключение Service Worker в режиме разработки');
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister().then(() => {
              console.log('[SW] DEV: Service Worker отключен:', registration);
            });
          });
        });
      }
    }
  }, []);

  return null; // This component renders nothing
}