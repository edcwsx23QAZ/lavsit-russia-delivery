'use client';

import { useEffect } from 'react';

export default function ClientDevUtils() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Добавляем timestamp к URL для предотвращения кэширования
      const timestamp = Date.now();
      document.documentElement.setAttribute('data-timestamp', timestamp.toString());
      
      console.log('🔧 DEV: Timestamp добавлен к HTML:', timestamp);
      
      // Добавляем meta-теги для отключения кэширования
      const metaNoCache = document.createElement('meta');
      metaNoCache.httpEquiv = 'Cache-Control';
      metaNoCache.content = 'no-cache, no-store, must-revalidate';
      document.head.appendChild(metaNoCache);
      
      const metaPragma = document.createElement('meta');
      metaPragma.httpEquiv = 'Pragma';
      metaPragma.content = 'no-cache';
      document.head.appendChild(metaPragma);
      
      const metaExpires = document.createElement('meta');
      metaExpires.httpEquiv = 'Expires';
      metaExpires.content = '0';
      document.head.appendChild(metaExpires);
      
      console.log('🔧 DEV: Meta-теги против кэширования добавлены');
    }
  }, []);

  return null;
}