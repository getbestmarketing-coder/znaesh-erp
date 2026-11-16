import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'ЗНАЄШ ERP',
  description: 'Система керування агенцією ЗНАЄШ: помісячні послуги, проекти, замовники, команда й оплати на ФОП.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

/* Тема ставиться до першого малювання, щоб не блимало */
const themeScript = `try{var p=JSON.parse(localStorage.getItem('znaesh-erp-prefs')||'{}');document.documentElement.dataset.theme=p.theme||'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <noscript><p style={{ padding: 24 }}>ЗНАЄШ ERP працює з увімкненим JavaScript.</p></noscript>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
