// Skeleton for the client detail RSC. Slimmer than quote/job/invoice
// skeletons — the page is a profile card + access panel + a couple of
// optional cleanup panels.

export default function ClientDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded mb-4" />

      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-56 bg-gray-100 rounded" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      <div className="max-w-3xl space-y-4">
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
