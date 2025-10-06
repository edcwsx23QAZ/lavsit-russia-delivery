/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  
  // Принудительная перезагрузка при изменениях
  reactStrictMode: true,
  
  // Добавляем заголовки для предотвращения кэширования
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined)
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=3600',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
