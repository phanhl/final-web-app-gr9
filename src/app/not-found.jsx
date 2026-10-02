'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function NotFound() {
    // The 404 page is outside AppProvider, so language is read directly from localStorage
    const [lang, setLang] = useState('vi');
    useEffect(() => {
        try {
            if (localStorage.getItem('fintrack_language') === 'en')
                setLang('en');
        }
        catch (e) {
            // ignore
        }
    }, []);
    const isEn = lang === 'en';
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{isEn ? 'This page does not exist or has been moved.' : 'Trang không tồn tại hoặc đã bị di chuyển.'}</p>
      <Link href="/" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm">
        {isEn ? 'Back to home' : 'Về trang chủ'}
      </Link>
    </div>);
}
