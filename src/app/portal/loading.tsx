// Phase 1.1 — skeleton shown while the /portal (dashboard) RSC fetches
// its data. Gets picked up automatically by Next.js App Router during
// any suspending render in this segment.
//
// Deliberately simple: 4 summary cards, a secondary mini-card row, and
// three activity panels matching the dashboard layout. No animations
// beyond a subtle pulse so the page doesn't feel flashy while loading.

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-40 bg-sage-100 rounded" />

      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-32 bg-sage-100 rounded-lg" />
        <div className="h-10 w-28 bg-sage-100 rounded-lg" />
        <div className="h-10 w-24 bg-sage-100 rounded-lg" />
        <div className="h-10 w-24 bg-sage-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-sage-100 p-4 h-20" />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-sage-50 rounded-lg h-16" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-sage-100 overflow-hidden">
            <div className="h-11 border-b border-sage-100 bg-sage-50/40" />
            <div className="divide-y divide-sage-50">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-11" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
