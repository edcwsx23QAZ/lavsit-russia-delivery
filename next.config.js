/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  
  // Настройки для лучшего dev experience
  experimental: {
    // Отключаем клиентский кэш только в dev режиме
    optimisticClientCache: process.env.NODE_ENV === 'development' ? false : true,
  },
  
  // Принудительная перезагрузка при изменениях
  reactStrictMode: true,
  
  // Настройки webpack для dev режима (более мягкие)
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Используем memory cache вместо полного отключения
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
    }
    
    return config;
  },
  
  // Добавляем заголовки для dev режима
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ],
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
