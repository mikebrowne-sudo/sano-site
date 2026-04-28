'use client'

// Phase 5.5.16 — completion → invoice guidance card.
//
// Surfaces a prominent "Next step: Create invoice" banner when:
//   - The job is completed (or stored status='completed').
//   - There is no invoice linked yet (job.invoice_id is null).
//   - A job_price exists (otherwise the button can't proceed).
//
// One-click create. The action prefills everything from the job,
// matches the price + items, and redirects to the new invoice.
// This is the deliberate replacement for the upfront "Create Job +
// Invoice" combo: do them in sequence, prompted, with no surprise.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Receipt, Loader2 } from 'lucide-react'
import { createInvoiceFromJob } from '../_actions'

interface Props {
  jobId: string
  jobPrice: number | null
  invoiceId: string | null
  isCompleted: boolean
  isArchived: boolean
}

export function JobNextStepCard({
  jobId, jobPrice, invoiceId, isCompleted, isArchived,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  // Hide entirely when the job isn't ready for invoicing or is archived
  // or already invoiced.
  if (isArchived || !isCompleted || invoiceId) return null

  const canCreate = jobPrice != null && jobPrice > 0

  function handleCreate() {
    setErr('')
    startTransition(async () => {
      const r = await createInvoiceFromJob(jobId)
      if (r && 'error' in r && r.error) {
        setErr(r.error)
        return
      }
      // The action redirects on success; if for some reason it
      // returned without redirecting, refresh to pick up the new
      // invoice_id.
      router.refresh()
    })
  }

  return (
    <div
      role="region"
      aria-label="Next step guidance"
      className="border border-emerald-200 bg-emerald-50/60 rounded-xl px-5 py-4 mb-6 flex flex-col md:flex-row md:items-center gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-emerald-200 text-emerald-700 shrink-0">
          <Receipt size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-emerald-900">
            Next step: Create invoice
          </div>
          <div className="text-xs text-emerald-800/80 mt-0.5">
            Job is complete. Price, scope and client carry across — one click and
            it&rsquo;s sent to drafts.
          </div>
        </div>
      </div>
      <div className="flex flex-col items-stretch md:items-end gap-1">
        {canCreate ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {pending ? 'Creating…' : 'Create invoice'}
          </button>
        ) : (
          <span className="text-xs text-emerald-900/70">
            Set a job price to enable invoicing.
          </span>
        )}
        {err && <span className="text-xs text-red-700">{err}</span>}
      </div>
    </div>
  )
}
