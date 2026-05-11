// Skeleton for the quote detail RSC. Mirrors the page composition:
// back link, workflow bar, title + badges + action buttons, then the
// stack of detail sections that fill the main column.

export default function QuoteDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded mb-4" />

      <div className="h-12 bg-gray-100 rounded-xl mb-6" />

      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-9 w-44 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-gray-100 rounded-lg" />
          <div className="h-10 w-24 bg-gray-100 rounded-lg" />
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-24 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
