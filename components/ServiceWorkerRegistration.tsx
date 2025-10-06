'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Более надежная детекция production/development
      const isProduction = process.env.NODE_ENV === 'production' || 
                          (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && 
                           !window.location.hostname.includes('127.0.0.1') && 
                           !window.location.hostname.includes('.e2b.app'));
      
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
        // Принудительно отключаем SW в development/preview
        console.log('[SW] DEV: Принудительное отключение Service Worker');
        
        // Очищаем все кэши
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName).then(() => {
                console.log('[SW] DEV: Кэш удален:', cacheName);
              });
            });
          });
        }
        
        // Отключаем все зарегистрированные SW
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister().then(() => {
              console.log('[SW] DEV: Service Worker отключен:', registration);
            });
          });
        });
        
        // Перезагружаем страницу если есть активный SW
        navigator.serviceWorker.ready.then(() => {
          if (navigator.serviceWorker.controller) {
            console.log('[SW] DEV: Обнаружен активный SW, перезагрузка страницы...');
            window.location.reload();
          }
        }).catch(() => {
          // SW не готов, это нормально в dev режиме
        });
      }
    }
  }, []);

  return null; // This component renders nothing
}