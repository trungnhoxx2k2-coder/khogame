import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Cờ Tướng Online', description: 'Chơi cờ tướng trực tuyến với bạn bè hoặc với máy.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a1228' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&family=Noto+Serif+TC:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
