// Phase 6 — banner shown on every quote detail/edit page when the row
// being viewed is not the current latest of its chain. Encourages the
// operator to either jump to the latest version or restore from this one.

import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'

export function NotLatestBanner({
  currentVersion,
  latestVersionId,
  latestVersionNumber,
}: {
  currentVersion: number
  latestVersionId: string
  latestVersionNumber: number
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
      <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-amber-900 font-semibold">
          You&apos;re viewing v{currentVersion}. The current version is v{latestVersionNumber}.
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          Older versions are read-only — they preserve exactly what was sent.
          To make changes, restore from this version or open the latest.
        </p>
      </div>
      <Link
        href={`/portal/quotes/${latestVersionId}`}
        className="inline-flex items-center gap-1.5 bg-amber-600 text-white font-medium px-3 py-1.5 rounded-md text-xs hover:bg-amber-700 transition-colors shrink-0"
      >
        Open v{latestVersionNumber}
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}

export function ArchivedBanner({ deletedAt }: { deletedAt: string }) {
  const when = new Date(deletedAt).toLocaleString('en-NZ')
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
      <Clock size={18} className="text-red-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-900 font-semibold">This quote is archived.</p>
        <p className="text-xs text-red-800 mt-0.5">
          Archived on {when}. Restore it from the Archived Records page (Settings → Archived Records).
        </p>
      </div>
    </div>
  )
}
