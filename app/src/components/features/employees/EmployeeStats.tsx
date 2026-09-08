import { t } from "@/lib/i18n";
import type { HeadcountStats } from "@/server/employees/repository";

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div
        className={
          accent ? "text-2xl font-bold text-accent-600" : "text-2xl font-bold text-brand-900"
        }
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/** HR analytics summary (HRM H3) — headcount snapshot + department breakdown. */
export function EmployeeStats({ stats }: { stats: HeadcountStats }) {
  if (stats.total === 0 && stats.departuresThisYear === 0) return null;
  const maxDept = Math.max(1, ...stats.byDepartment.map((d) => d.count));

  return (
    <section aria-label={t.hrStats.title} className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t.hrStats.total} value={stats.total} accent />
        <Stat label={t.hrStats.active} value={stats.active} />
        <Stat label={t.hrStats.probation} value={stats.probation} />
        <Stat label={t.hrStats.onLeave} value={stats.onLeave} />
        <Stat label={t.hrStats.hiresYtd} value={stats.hiresThisYear} />
        <Stat label={t.hrStats.departuresYtd} value={stats.departuresThisYear} />
      </div>
      {stats.byDepartment.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.hrStats.byDepartment}
          </h3>
          <ul className="space-y-1.5">
            {stats.byDepartment.map((d) => (
              <li key={d.name} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-slate-700">{d.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.round((d.count / maxDept) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-slate-600">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
