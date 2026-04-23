// Phase 1.1 — skeleton shown while the /portal (dashboard) RSC fetches
// its data. Gets picked up automatically by Next.js App Router during
// any suspending render in this segment.
//
// Deliberately simple: 4 summary cards, a secondary mini-card row, and
// three activity panels matching the dashboard layout. No animations
// beyond a subtle pulse so the page doesn't feel flashy while loading.

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-9 w-44 bg-gray-100 rounded" />

      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
        <div className="h-10 w-24 bg-gray-100 rounded-lg" />
        <div className="h-10 w-24 bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100/80 p-5 h-24"
            style={{ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100/80 h-16" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100/80 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
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
  )
}
