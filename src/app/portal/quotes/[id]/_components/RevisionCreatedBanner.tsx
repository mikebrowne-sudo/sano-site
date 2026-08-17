// Post-fork confirmation banner.
//
// Rendered on the NEW draft immediately after a save on a quote the client
// had already seen or acted on (sent / viewed / accepted / declined). That
// save clones the row into a fresh draft and redirects here — silently,
// before this banner existed. The destination page looks identical to any
// other draft, so operators reported that their changes "didn't save" or
// that there was "no way to send the new quote", when in fact a new version
// had been created and the send controls were sitting in the action bar.
//
// Driven by ?revised_from=N&revised_status=S on the redirect. Purely
// informational — it reads URL params, never writes.

import Link from 'next/link'
import { GitBranch, ArrowDown } from 'lucide-react'

export interface RevisionCreatedBannerProps {
  /** Version number of the row that was edited (the source). */
  fromVersion: number
  /** Status that source row was in when it was edited. */
  fromStatus: string
  /** Version number of the new draft the operator is now looking at. */
  newVersion: number
  /** Detail page of the source version, for "view what the client has". */
  fromVersionId: string | null
  /** Commercial quotes send a proposal; residential send a quote. */
  isCommercial: boolean
}

export function RevisionCreatedBanner({
  fromVersion,
  fromStatus,
  newVersion,
  fromVersionId,
  isCommercial,
}: RevisionCreatedBannerProps) {
  const wasAccepted = fromStatus === 'accepted'
  const noun = isCommercial ? 'proposal' : 'quote'

  return (
    <div className="bg-sage-50 border-2 border-sage-500 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-start gap-3">
        <GitBranch size={18} className="text-sage-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-sage-900 font-semibold">
            Version {newVersion} created — your changes are saved.
          </p>

          {wasAccepted ? (
            <p className="text-xs text-sage-800 mt-1 leading-relaxed">
              v{fromVersion} stays on file as the version the client accepted, at
              its original price and scope. Your changes are now a separate draft
              (v{newVersion}) that the client hasn&apos;t seen or agreed to yet.
              Send it for re-acceptance before creating a job or invoice from it.
            </p>
          ) : (
            <p className="text-xs text-sage-800 mt-1 leading-relaxed">
              v{fromVersion} is preserved read-only as the version the client
              received. Your changes are a new draft (v{newVersion}) — the client
              still has the old {noun} until you send this one.
            </p>
          )}

          <p className="text-xs text-sage-700 mt-2 flex items-center gap-1.5 font-medium">
            <ArrowDown size={12} className="shrink-0" />
            Preview, download and send are in the bar at the bottom of this page.
          </p>

          {fromVersionId && (
            <Link
              href={`/portal/quotes/${fromVersionId}`}
              className="inline-block text-xs text-sage-600 underline hover:text-sage-800 mt-2"
            >
              View v{fromVersion} — what the client currently has
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
