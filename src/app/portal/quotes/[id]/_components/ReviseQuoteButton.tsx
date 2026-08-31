'use client'

// "Revise & resend" — the discoverable entry point to revising an accepted
// quote.
//
// Editing an accepted quote already forks a new draft version on save, but
// nothing on the accepted page said so: the action bar offers View / Download
// / Copy link, and the Next Step panel only offers job/invoice conversion. An
// operator wanting to change an agreed quote and send it again had to guess
// that editing and saving was the route. This button makes that path explicit.
//
// It deliberately does NOT re-send the accepted document. It forks v(n+1) and
// drops the operator on the new draft, where the standard draft action bar
// supplies Preview / Download / Send. The accepted version stays untouched as
// the record of what the client agreed to.
//
// Same fork call and the same redirect params as the save path in
// EditQuoteForm, so both routes produce an identical destination and the
// RevisionCreatedBanner explains the result the same way.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createNewVersion } from '../../_actions-versioning'
import { FilePlus2, AlertTriangle } from 'lucide-react'

export function ReviseQuoteButton({
  quoteId,
  versionNumber,
  status,
  isCommercial,
}: {
  quoteId: string
  /** Version of the accepted row being revised — the fork source. */
  versionNumber: number
  /** Status of the source row, carried through so the banner can explain it. */
  status: string
  isCommercial: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const noun = isCommercial ? 'proposal' : 'quote'
  const nextVersion = versionNumber + 1

  function handleRevise() {
    setError(null)
    startTransition(async () => {
      const result = await createNewVersion(quoteId, {
        version_note: `Revised from accepted v${versionNumber}`,
      })

      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      // A fork MUST return the new draft's id. Without it we'd have no
      // destination and the source may already be demoted — fail loudly
      // rather than leave the operator on a stale page.
      if (!result.new_quote_id) {
        setError('Could not create a new version. Nothing was changed. Please reload and try again.')
        return
      }

      const params = new URLSearchParams({
        revised_from: String(versionNumber),
        revised_status: status,
      })
      router.refresh()
      router.push(`/portal/quotes/${result.new_quote_id}?${params.toString()}`)
    })
  }

  if (!confirming) {
    return (
      <div className="inline-flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 border border-sage-300 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <FilePlus2 size={16} />
          Revise &amp; resend
        </button>
        {error && <span className="text-xs text-red-600 max-w-xs">{error}</span>}
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col gap-2 bg-white border border-sage-200 rounded-lg p-3 shadow-sm max-w-sm">
      <p className="text-xs text-sage-700 leading-relaxed">
        This creates <strong>v{nextVersion}</strong> as a new draft to edit and send.
        The accepted v{versionNumber} stays on file unchanged, and the client
        keeps it until you send the new one.
      </p>
      {error && (
        <p className="text-xs text-red-600 flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRevise}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Creating…' : `Create v${nextVersion} draft`}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(null) }}
          disabled={isPending}
          className="text-xs text-sage-600 hover:text-sage-800 px-2 py-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-sage-500">
        The accepted {noun} is not re-sent.
      </p>
    </div>
  )
}
