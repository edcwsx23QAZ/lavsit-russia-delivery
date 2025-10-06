import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WebpackErrorBoundary } from '@/components/WebpackErrorBoundary';
import ClientDevUtils from '@/components/ClientDevUtils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Междугородняя доставка Лавсит',
  description: 'Система расчета стоимости доставки по всей России',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return (
    <html lang="en">
      <head>
        {isDev && (
          <>
            <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
            <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
            <meta httpEquiv="Pragma" content="no-cache" />
            <meta httpEquiv="Expires" content="0" />
          </>
        )}
      </head>
      <body className={inter.className} suppressHydrationWarning={isDev}>
        {isDev ? (
          <WebpackErrorBoundary>
            <ClientDevUtils />
            {children}
          </WebpackErrorBoundary>
        ) : (
          <>
            {children}
          </>
        )}
        {/* TODO: Remove iframe-navigation.js in production, should never be removed by AI */}
        <script src="/scripts/iframe-navigation.js"></script>
        {/* CRITICAL: Dev cache clearing script - only loads in development */}
        {isDev && (
          <>
            <script src="/clear-dev-cache.js"></script>
            <script dangerouslySetInnerHTML={{
              __html: `
                console.log('[EMERGENCY] Layout: Killing all service workers and caches...');
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                      console.log('[EMERGENCY] Layout: Unregistering SW:', registration.scope);
                      registration.unregister();
                    });
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => {
                      console.log('[EMERGENCY] Layout: Deleting cache:', name);
                      caches.delete(name);
                    });
                  });
                }
              `
            }} />
          </>
        )}
      </body>
    </html>
  );
}
