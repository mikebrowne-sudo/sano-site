'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { submitContractorGst } from '../_gst-actions'
import { GST_DECLARATION_TEXT } from '@/lib/contractor-gst-history'
import type { ContractorSafeGst } from '@/lib/contractor-gst-history-data'

/** Contractor-facing GST declaration. Submits a PENDING status for Sano to
 *  review — never auto-verified. Safe fields only. */
export function GstDeclarationForm({ token, existing }: { token: string; existing: ContractorSafeGst | null }) {
  const router = useRouter()
  const [registered, setRegistered] = useState(existing?.gstRegistered ?? false)
  const [number, setNumber] = useState(existing?.gstNumber ?? '')
  const [effective, setEffective] = useState(existing?.effectiveDate ?? '')
  const [signedName, setSignedName] = useState('')
  const [ack, setAck] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm w-full'

  const statusNote = existing?.status === 'verified' ? 'Your GST status is verified. Submitting a new one replaces it and goes back to Sano for review.'
    : existing?.status === 'submitted' ? 'Your GST status is awaiting Sano review.'
    : existing?.needsResubmit ? 'Sano asked for a correction — please resubmit below.' : null

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await submitContractorGst({
        token, gstRegistered: registered,
        gstNumber: registered ? (number || undefined) : undefined,
        effectiveDate: registered ? (effective || undefined) : undefined,
        signedName, acknowledged: ack,
      })
      if (res.error) { setErr(res.error); return }
      setDone(true); router.refresh()
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-lg font-semibold text-sage-800 mb-1">Your GST status</h2>
      <p className="text-sm text-sage-500 mb-3">Tell us whether you&rsquo;re registered for GST. Sano reviews and verifies this — GST only applies from your verified effective date.</p>
      {statusNote && <p className="text-[13px] text-sage-600 mb-3 rounded-lg bg-sage-50 border border-sage-100 px-3 py-2">{statusNote}</p>}

      <div className="flex gap-4 text-sm text-sage-700 mb-3">
        <label className="flex items-center gap-2"><input type="radio" checked={registered} onChange={() => setRegistered(true)} /> Registered for GST</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!registered} onChange={() => setRegistered(false)} /> Not registered</label>
      </div>
      {registered && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">GST number</span><input className={input} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Effective date</span><input type="date" className={input} value={effective} onChange={(e) => setEffective(e.target.value)} /></label>
        </div>
      )}
      <label className="flex items-start gap-2 mt-4 text-[13px] text-sage-700"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 rounded border-sage-300" /><span>{GST_DECLARATION_TEXT}</span></label>
      <label className="flex flex-col gap-1 mt-3 max-w-xs"><span className="text-[11px] text-sage-500">Type your name to sign</span><input className={input} value={signedName} onChange={(e) => setSignedName(e.target.value)} /></label>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={isPending || done} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"><Check size={15} /> {done ? 'Submitted' : isPending ? 'Submitting…' : 'Submit for review'}</button>
        {done && <span className="text-xs text-emerald-700">Thanks — Sano will review and verify your GST status.</span>}
      </div>
    </section>
  )
}
