/**
 * Shown while a route segment is loading (instead of an empty white page).
 */
export default function Loading() {
    return (<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950" role="status" aria-live="polite">
      <span className="inline-block w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"/>
      <span className="sr-only">Đang tải… / Loading…</span>
    </div>);
}
