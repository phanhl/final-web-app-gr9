import './globals.css';
import React from 'react';
export const metadata = {
  // Absolute base for Open Graph image URLs; set SITE_URL to the public address (e.g. the fixed ngrok domain)
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: 'FinTrack Pro - Quản lý chi tiêu',
  description: 'Hệ thống quản lý tài chính cá nhân toàn diện, thông minh và hiện đại',
  applicationName: 'FinTrack Pro',
  // Private app: never index (robots.txt also disallows everything)
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'FinTrack',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  // Link previews when the tunnel URL is shared over Zalo / Messenger
  openGraph: {
    type: 'website',
    siteName: 'FinTrack Pro',
    title: 'FinTrack Pro - Quản lý chi tiêu',
    description: 'Quản lý ví, giao dịch, ngân sách, hóa đơn và mô phỏng tài chính cá nhân',
    locale: 'vi_VN',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'FinTrack Pro' }],
  },
  twitter: {
    card: 'summary',
    title: 'FinTrack Pro - Quản lý chi tiêu',
    description: 'Quản lý ví, giao dịch, ngân sách, hóa đơn và mô phỏng tài chính cá nhân',
    images: ['/icon-512.png'],
  },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays enabled (WCAG 1.4.4); input font sizes prevent iOS auto-zoom instead
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};
export default function RootLayout({ children, }) {
  return (<html lang="vi" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{
        __html: `
              try {
                const theme = localStorage.getItem('fintrack_theme') || 'system';
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
      }} />
    </head>
    <body className="min-h-screen bg-app text-primary antialiased">
      {children}
    </body>
  </html>);
}
