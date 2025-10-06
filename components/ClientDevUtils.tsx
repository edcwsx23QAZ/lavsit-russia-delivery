'use client';

import { useEffect } from 'react';

export default function ClientDevUtils() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
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
  }, []);

  return null;
}