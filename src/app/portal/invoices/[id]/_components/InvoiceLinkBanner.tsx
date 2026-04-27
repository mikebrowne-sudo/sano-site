'use client'

// Phase 5.5.10 — Banner shown on invoices that have no linked job.
// Lets the admin pick a job for the same client (or leave it manual).

import { useState, useTransition } from 'react'
import { Link2, X } from 'lucide-react'
import { linkInvoiceToJob } from '../../../clients/_actions-cleanup'

export function InvoiceLinkBanner({
  invoiceId,
  jobs,
}: {
  invoiceId: string
  jobs: { id: string; job_number: string; status: string; scheduled_date: string | null }[]
}) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [jobId, setJobId] = useState('')

  function doLink() {
    if (!jobId) return
    setErrorMessage('')
    startTransition(async () => {
      const r = await linkInvoiceToJob({ invoiceId, jobId })
      if ('error' in r) { setErrorMessage(r.error); return }
      setDone(true)
      setOpen(false)
    })
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 mb-4 text-sm">
        Invoice linked to job. Refresh to see the update.
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-start gap-2.5">
        <Link2 size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">Unlinked invoice</p>
          <p className="text-xs text-amber-800 mt-0.5">
            This invoice isn&apos;t linked to a job. Either pick a job for the same client, or leave it as a manual / cash-sale invoice.
          </p>
          {!open ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={jobs.length === 0}
                className="inline-flex items-center text-xs font-semibold bg-sage-500 text-white px-3 py-1.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
              >
                {jobs.length === 0 ? 'No jobs for this client' : 'Link to job…'}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="border border-sage-200 rounded-lg px-3 py-1.5 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 max-w-xs"
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_number} · {j.status}{j.scheduled_date ? ` · ${j.scheduled_date}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={doLink}
                disabled={pending || !jobId}
                className="inline-flex items-center text-xs font-semibold bg-sage-500 text-white px-3 py-1.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
              >
                {pending ? 'Linking…' : 'Link'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setJobId(''); setErrorMessage('') }}
                className="text-xs text-sage-600 hover:text-sage-800"
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {errorMessage && <p className="text-xs text-red-700 mt-2">{errorMessage}</p>}
        </div>
      </div>
    </div>
  )
}
