// Skeleton shown while the /portal (dashboard) RSC fetches its data.
// Mirrors the Phase 1.6 dashboard composition (header, optional alert
// strip, 4-card KPI row, single ops strip, three activity panels).

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-44 bg-gray-100 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-100 rounded-lg" />
          <div className="h-9 w-20 bg-gray-100 rounded-lg" />
          <div className="h-9 w-16 bg-gray-100 rounded-lg" />
          <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* KPI row — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-28"
          />
        ))}
      </div>

      {/* Operations strip */}
      <div className="space-y-3">
        <div className="h-3 w-32 bg-gray-100 rounded" />
        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white h-20" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <div className="h-3 w-28 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="h-12 border-b border-gray-100" />
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-12" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
