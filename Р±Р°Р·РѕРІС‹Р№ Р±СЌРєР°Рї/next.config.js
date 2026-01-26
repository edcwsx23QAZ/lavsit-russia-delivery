/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  
  // EMERGENCY: DISABLE STRICT MODE 
  reactStrictMode: false,
  
  // EMERGENCY: DISABLE SSR GLOBALLY IN DEV
  ...(process.env.NODE_ENV !== 'production' && {
    experimental: {
      runtime: 'nodejs',
      serverActionsBodySizeLimit: '2mb',
    }
  }),
  
  // EMERGENCY: CUSTOM WEBPACK CONFIG
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (dev) {
      // Disable caching in development
      config.cache = false;
      
      // Add aggressive error handling
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Disable chunk splitting in dev
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        runtimeChunk: false,
      };
      
      // Add error handler plugin
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.FORCE_NO_CACHE': JSON.stringify('true'),
        })
      );
    }
    
    return config;
  },
  
  // Добавляем заголовки для предотвращения кэширования
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined)
              ? 'no-cache, no-store, must-revalidate, proxy-revalidate, s-maxage=0'
              : 'public, max-age=3600',
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
  },
};

module.exports = nextConfig;
