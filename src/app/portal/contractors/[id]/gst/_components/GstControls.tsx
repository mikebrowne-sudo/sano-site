'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, FilePlus } from 'lucide-react'
import { setGstStatus, recordGstStatus } from '../_actions'

export function VerifyRejectGst({ gstId }: { gstId: string }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function act(status: 'verified' | 'rejected') {
    setErr(null)
    startTransition(async () => {
      const res = await setGstStatus(gstId, status, notes.trim() || null)
      if (res.error) { setErr(res.error); return }
      setRejecting(false); router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => act('verified')} disabled={isPending} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"><Check size={14} /> Verify</button>
      {!rejecting ? (
        <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg text-sm hover:bg-sage-50"><X size={14} /> Reject</button>
      ) : (
        <span className="inline-flex items-center gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason" className="rounded-lg border border-sage-200 px-2 py-1.5 text-sm w-48" />
          <button type="button" onClick={() => act('rejected')} disabled={isPending} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
          <button type="button" onClick={() => setRejecting(false)} className="text-xs text-sage-500">cancel</button>
        </span>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}

export function RecordGst({ contractorId }: { contractorId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [registered, setRegistered] = useState(true)
  const [number, setNumber] = useState('')
  const [effective, setEffective] = useState('')
  const [endDate, setEndDate] = useState('')
  const [verifyNow, setVerifyNow] = useState(true)
  const [signedName, setSignedName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm w-full'

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await recordGstStatus({
        contractorId, gstRegistered: registered,
        gstNumber: registered ? (number || null) : null,
        effectiveDate: registered ? (effective || null) : null,
        endDate: registered ? (endDate || null) : null,
        signedName: signedName || null, verifyNow,
      })
      if (res.error) { setErr(res.error); return }
      setOpen(false); router.refresh()
    })
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50"><FilePlus size={15} /> Record GST status</button>

  return (
    <div className="bg-white border border-sage-200 rounded-2xl shadow-lg p-5 space-y-3">
      <p className="font-semibold text-sage-800">Record GST status</p>
      <p className="text-[11px] text-sage-400">Records evidence-based GST status. Never inferred from turnover. This supersedes the current verified status.</p>
      <div className="flex gap-4 text-sm text-sage-700">
        <label className="flex items-center gap-2"><input type="radio" checked={registered} onChange={() => setRegistered(true)} /> GST registered</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!registered} onChange={() => setRegistered(false)} /> Not registered</label>
      </div>
      {registered && (
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">GST number</span><input className={input} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Effective date</span><input type="date" className={input} value={effective} onChange={(e) => setEffective(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">End date (optional)</span><input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>
      )}
      <label className="flex flex-col gap-1 max-w-xs"><span className="text-[11px] text-sage-500">Signed name</span><input className={input} value={signedName} onChange={(e) => setSignedName(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm text-sage-700"><input type="checkbox" checked={verifyNow} onChange={(e) => setVerifyNow(e.target.checked)} /> Verify now (evidence sighted)</label>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 px-3 py-2">Cancel</button>
        <button type="button" onClick={save} disabled={isPending} className="bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">{isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}
