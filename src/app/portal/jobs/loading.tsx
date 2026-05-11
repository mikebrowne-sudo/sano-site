// Skeleton shown while the jobs list RSC fetches data. Same shape as
// the quotes / invoices skeletons — keeps cross-page navigation feel
// consistent.

export default function JobsListLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-24 bg-gray-100 rounded" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 bg-gray-100 rounded-md" />
        ))}
      </div>

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
