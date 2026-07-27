'use client'

// Per-line payslip control. Viewing/downloading is a plain link (read-only GET,
// never generates). Generation only happens via this explicit admin button, and
// only for a paid run that has no official payslip yet.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateOfficialPayslips } from '../../_actions'

export function PayslipCell({ lineId, runId, runStatus, hasOfficial, isAdmin }: {
  lineId: string; runId: string; runStatus: string; hasOfficial: boolean; isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  if (runStatus === 'approved') {
    return <a href={`/api/payslips/${lineId}/pdf?mode=preview`} target="_blank" rel="noopener noreferrer" className="text-sage-500 text-xs font-medium underline underline-offset-2 hover:no-underline">Preview</a>
  }
  if (runStatus === 'paid' && hasOfficial) {
    return <a href={`/api/payslips/${lineId}/pdf`} target="_blank" rel="noopener noreferrer" className="text-sage-700 text-xs font-medium underline underline-offset-2 hover:no-underline">View PDF</a>
  }
  if (runStatus === 'paid' && isAdmin) {
    return (
      <span>
        <button
          disabled={isPending}
          onClick={() => { setErr(null); startTransition(async () => { const r = await generateOfficialPayslips(runId); if (r.error) setErr(r.error); else router.refresh() }) }}
          className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-50 disabled:opacity-50"
        >{isPending ? 'Generating…' : 'Generate official payslip'}</button>
        {err && <span className="block text-[10px] text-red-600 mt-0.5">{err}</span>}
      </span>
    )
  }
  if (runStatus === 'paid') return <span className="text-sage-400 text-xs">Pending</span>
  return <span className="text-sage-300 text-xs">—</span>
}
