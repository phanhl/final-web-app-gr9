/**
 * Web app manifest: lets phones "Add to Home Screen" and open FinTrack Pro like a native app.
 */
export default function manifest() {
    return {
        name: 'FinTrack Pro - Quản lý chi tiêu',
        short_name: 'FinTrack',
        description: 'Quản lý tài chính cá nhân: ví, giao dịch, ngân sách, hóa đơn và mô phỏng tài chính',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#059669',
        lang: 'vi',
        icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
