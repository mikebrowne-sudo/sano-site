// Skeleton shown while the quotes list RSC fetches data. Matches the
// page composition: title + New-quote button, lifecycle tabs, table
// with 10 placeholder rows. Avoids layout shift by keeping the same
// container widths as the live page.

export default function QuotesListLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-32 bg-gray-100 rounded" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      {/* Lifecycle tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 bg-gray-100 rounded-md" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-12 border-b border-gray-100 bg-gray-50/40" />
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14" />
          ))}
        </div>
      </div>
    </div>
  )
}
