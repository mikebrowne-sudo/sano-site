// Skeleton shown while the applicants list RSC fetches data. Neutral
// list shape (header + filter + table) consistent with the quotes /
// jobs / invoices skeletons so cross-page navigation feels instant.

export default function ApplicantsListLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-40 bg-gray-100 rounded" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-10 w-full max-w-sm bg-gray-100 rounded-lg mb-6" />

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
