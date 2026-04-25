'use client'

// Phase E.1 — new contractor pay run form (client wrapper).
//
// Calls the submitNewContractorPayRun server action via FormData.
// On success the action redirects (Next.js intercepts the response
// from the client action so we never see ok). On error we render
// the message inline.

import { useState, useTransition } from 'react'
import { submitNewContractorPayRun } from '../../_actions'

export function NewPayRunForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string
  defaultEnd: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitNewContractorPayRun(formData)
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-sage-100 rounded-xl p-6 md:p-8 max-w-xl space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period start</span>
          <input
            type="date"
            name="period_start"
            defaultValue={defaultStart}
            required
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period end</span>
          <input
            type="date"
            name="period_end"
            defaultValue={defaultEnd}
            required
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          placeholder="Internal note for this pay run."
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      <p className="text-xs text-sage-500">
        Eligible rows are job_workers with{' '}
        <code className="bg-sage-50 px-1 rounded">pay_status = &lsquo;approved&rsquo;</code> and{' '}
        <code className="bg-sage-50 px-1 rounded">approved_at</code> inside the selected window
        whose job hasn&rsquo;t been archived. Approving the run later sets approved_at on the run; marking it paid flips the linked workers to <code className="bg-sage-50 px-1 rounded">paid</code>.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-sage-100">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create pay run'}
        </button>
      </div>
    </form>
  )
}
