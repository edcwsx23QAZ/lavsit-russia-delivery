import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
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
  return (
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <ClientDevUtils />
        {children}
        {/* TODO: Remove iframe-navigation.js in production, should never be removed by AI */}
        <script src="/scripts/iframe-navigation.js"></script>
        {/* CRITICAL: Dev cache clearing script - only loads in development */}
        {process.env.NODE_ENV !== 'production' && (
          <script src="/clear-dev-cache.js"></script>
        )}
      </body>
    </html>
  );
}
