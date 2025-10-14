'use client';

import { useEffect } from 'react';

export default function ClientDevUtils() {
  useEffect(() => {
    // Более надежная детекция dev режима
    const isDev = process.env.NODE_ENV === 'development' ||
                  (typeof window !== 'undefined' &&
                   (window.location.hostname.includes('localhost') ||
                    window.location.hostname.includes('127.0.0.1') ||
                    window.location.hostname.includes('.e2b.app')));

    if (isDev) {
      try {
        // Добавляем timestamp к URL для предотвращения кэширования
        const timestamp = Date.now();
        document.documentElement.setAttribute('data-timestamp', timestamp.toString());

        console.log('🔧 DEV: Timestamp добавлен к HTML:', timestamp);
        console.log('🔧 DEV: ClientDevUtils инициализирован');
      } catch (error) {
        console.warn('🔧 DEV: Ошибка в ClientDevUtils:', error);
      }
    }

    // Web Vitals monitoring - TODO: Implement with correct web-vitals API
    // Currently commented out due to API compatibility issues
    /*
    if (typeof window !== 'undefined') {
      // TODO: Install web-vitals package and implement correct API usage
      console.log('📊 Web Vitals monitoring placeholder');
    }
    */
  }, []);

  return null;
}