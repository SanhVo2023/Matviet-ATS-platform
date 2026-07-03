/**
 * Route-group loading skeleton — shown during server-render of any dashboard
 * page. Mirrors the common page anatomy (header + card grid) so the swap to
 * real content doesn't jump.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-8 p-6 lg:p-8" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-slate-200" />
        <div className="h-4 w-80 rounded-md bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-slate-200 bg-white p-6">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-72 rounded-lg border border-slate-200 bg-white lg:col-span-7" />
        <div className="h-72 rounded-lg border border-slate-200 bg-white lg:col-span-5" />
      </div>
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
