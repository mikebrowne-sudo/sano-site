// Skeleton for the quote edit RSC. Lighter than the detail skeleton
// because the page is a form — we just hint at the title and one tall
// card. The 1k-line edit form re-hydrates after the swap.

export default function QuoteEditLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded mb-4" />
      <div className="h-9 w-56 bg-gray-100 rounded mb-6" />
      <div className="max-w-3xl space-y-4">
        <div className="h-96 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
