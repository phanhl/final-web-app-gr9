import './globals.css';
import React from 'react';
export const metadata = {
    title: 'FinTrack Pro - Quản lý chi tiêu',
    description: 'Hệ thống quản lý tài chính cá nhân toàn diện, thông minh và hiện đại',
};
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
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
        }}/>
      </head>
      <body className="min-h-screen bg-app text-primary antialiased">
        {children}
      </body>
    </html>);
}
