import Link from 'next/link';
export default function NotFound() {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Trang không tồn tại hoặc đã bị di chuyển.</p>
      <Link href="/" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm">
        Về trang chủ
      </Link>
    </div>);
}
