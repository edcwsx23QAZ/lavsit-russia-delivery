/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  
  // Отключаем кэширование для разработки
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    },
    // Более агрессивный hot reload
    optimisticClientCache: false,
  },
  
  // Отключаем кэш статических файлов
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : undefined,
  
  // Принудительная перезагрузка при изменениях
  reactStrictMode: true,
  
  // Быстрая перезагрузка включена по умолчанию в Next.js 14
  
  // Отключаем кэш сборки в dev режиме
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  }
};

module.exports = nextConfig;
