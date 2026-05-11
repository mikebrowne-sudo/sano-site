// Skeleton for the new-quote RSC. Same form shape as the edit
// skeleton so the cold-start feel is consistent across the two routes
// the operator hits most.

export default function NewQuoteLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded mb-4" />
      <div className="h-9 w-48 bg-gray-100 rounded mb-6" />
      <div className="max-w-3xl space-y-4">
        <div className="h-96 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
