export default function ProposalLoading() {
  return (
    <div className="min-h-screen bg-sage-50/60 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-block w-6 h-6 rounded-full border-2 border-sage-200 border-t-sage-500 animate-spin mb-4" />
        <p className="text-sage-600 text-sm">Loading your proposal…</p>
      </div>
    </div>
  )
}
