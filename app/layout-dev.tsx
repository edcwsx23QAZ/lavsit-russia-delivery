import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WebpackErrorBoundary } from '@/components/WebpackErrorBoundary';
import ClientDevUtils from '@/components/ClientDevUtils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Междугородняя доставка Лавсит (DEV)',
  description: 'Система расчета стоимости доставки по всей России (Development Mode)',
};

export default function DevRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <WebpackErrorBoundary>
          <ClientDevUtils />
          {children}
        </WebpackErrorBoundary>
        {/* CRITICAL: Dev cache clearing script */}
        <script src="/clear-dev-cache.js"></script>
        {/* Emergency Service Worker killer */}
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('[EMERGENCY] Checking for service workers...');
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                  console.log('[EMERGENCY] Unregistering SW:', registration.scope);
                  registration.unregister();
                });
              });
            }
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => {
                  console.log('[EMERGENCY] Deleting cache:', name);
                  caches.delete(name);
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}