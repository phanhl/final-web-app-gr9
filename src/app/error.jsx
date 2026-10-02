'use client';
import { useEffect, useState } from 'react';
/**
 * Route-level error boundary: shown instead of a blank screen when a view crashes while rendering.
 * Financial data is stored on the server, so retrying is safe.
 */
export default function Error({ error, reset }) {
    const [isEn, setIsEn] = useState(false);
    useEffect(() => {
        console.error('FinTrack render error:', error);
        try {
            setIsEn(localStorage.getItem('fintrack_language') === 'en');
        }
        catch (e) {
            // ignore
        }
    }, [error]);
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        {isEn ? 'Something went wrong' : 'Đã xảy ra lỗi'}
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
        {isEn
            ? 'This screen could not be displayed. Your data is safe on the server - please try again.'
            : 'Không thể hiển thị màn hình này. Dữ liệu của bạn vẫn an toàn trên máy chủ - vui lòng thử lại.'}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm">
          {isEn ? 'Try again' : 'Thử lại'}
        </button>
        <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium rounded-xl transition-colors">
          {isEn ? 'Reload page' : 'Tải lại trang'}
        </button>
      </div>
      {error?.digest && (<p className="mt-6 text-xs text-slate-400 font-mono">ID: {error.digest}</p>)}
    </div>);
}
