'use client'

// Staff KiwiSaver management for an employee. Shows the current legal status +
// the full audit record, and (admins only) the gated transitions: KS2, info
// pack, the two opt-out routes (employer KS10 / IRD-managed), savings
// suspension, a non-operative intention note, and not-eligible. Every action is
// validated server-side and appends a worker_kiwisaver_events audit row — this
// component only collects input. Uses native <details> disclosures (no modals,
// per the portal UX).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { KS_EMPLOYEE_STANDARD_RATES } from '@/lib/payroll/kiwisaver'
import {
  recordKiwiSaverKs2,
  recordKiwiSaverInfoPack,
  recordEmployerOptOut,
  recordOptOutSubmittedToIrd,
  recordIrdOptOut,
  recordSavingsSuspension,
  endSavingsSuspension,
  recordOptOutIntention,
  recordKiwiSaverNotEligible,
} from '../../_actions-kiwisaver'

type Result = { ok?: true; error?: string; warning?: string }

export interface KiwiSaverPanelEvent {
  id: string
  event_type: string
  evidence_ref: string | null
  effective_date: string | null
  note: string | null
  performed_at: string
}

export interface KiwiSaverPanelProps {
  workerId: string
  isAdmin: boolean
  statusLabel: string
  status: string | null
  enrolled: boolean
  employeeRate: number | null
  employerRate: number | null
  ks2Completed: boolean
  ks2CompletedDate: string | null
  autoEnrolmentDate: string | null
  infoPackDeliveredDate: string | null
  ks10SignedDate: string | null
  ks10ReceivedDate: string | null
  optoutSubmittedToIrdDate: string | null
  irdApprovalReference: string | null
  irdApprovalDate: string | null
  payrollStopEffectiveDate: string | null
  suspensionRef: string | null
  suspensionFrom: string | null
  suspensionTo: string | null
  intentionNote: string | null
  intentionRecordedAt: string | null
  winText: string | null
  winOpen: boolean
  events: KiwiSaverPanelEvent[]
}

const EVENT_LABEL: Record<string, string> = {
  ks2_completed: 'KS2 completed',
  existing_member_recorded: 'Existing member recorded',
  auto_enrolled: 'Auto-enrolled / info pack',
  optout_ks10: 'Opt-out (KS10)',
  optout_ird_confirmed: 'Opt-out (IRD approved)',
  savings_suspension_start: 'Savings suspension started',
  savings_suspension_end: 'Savings suspension ended',
  intention_noted: 'Intention noted (non-operative)',
  not_eligible_recorded: 'Not eligible',
  status_changed: 'Status change',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function KiwiSaverPanel(props: KiwiSaverPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'error' | 'warning' | 'ok'; text: string } | null>(null)
  const [f, setF] = useState<Record<string, string>>({ ks2Rate: String(props.employeeRate ?? KS_EMPLOYEE_STANDARD_RATES[0]) })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }))

  function run(fn: () => Promise<Result>) {
    setMsg(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) { setMsg({ kind: 'error', text: res.error }); return }
      if (res.warning) setMsg({ kind: 'warning', text: res.warning })
      else setMsg({ kind: 'ok', text: 'Saved.' })
      router.refresh()
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const lbl = 'text-[11px] font-medium text-sage-500'
  const summary = 'cursor-pointer text-sm font-medium text-sage-700 py-2 select-none'
  const btn = 'inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50'
  const isOptedOut = props.status === 'opted_out'
  const isSuspended = props.status === 'savings_suspension'

  return (
    <div>
      {/* Current status + audit summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><span className="text-sage-500">Status</span><p className="text-sage-800 font-medium">{props.statusLabel}</p></div>
        <div><span className="text-sage-500">Deductions</span><p className={props.enrolled ? 'text-emerald-700 font-medium' : 'text-sage-800 font-medium'}>{props.enrolled ? 'Active (enrolled)' : 'Not deducting'}</p></div>
        {props.enrolled && <>
          <div><span className="text-sage-500">Employee rate</span><p className="text-sage-800 font-medium">{props.employeeRate ?? '—'}%</p></div>
          <div><span className="text-sage-500">Employer rate</span><p className="text-sage-800 font-medium">{props.employerRate ?? '—'}%</p></div>
        </>}
        <div><span className="text-sage-500">KS2 completed</span><p className="text-sage-800 font-medium">{props.ks2Completed ? `Yes · ${fmt(props.ks2CompletedDate)}` : 'No'}</p></div>
        <div><span className="text-sage-500">Info pack (KS3 + KS10)</span><p className="text-sage-800 font-medium">{props.infoPackDeliveredDate ? `Delivered · ${fmt(props.infoPackDeliveredDate)}` : 'Not recorded'}</p></div>
        {props.autoEnrolmentDate && <div><span className="text-sage-500">Auto-enrolment date</span><p className="text-sage-800 font-medium">{fmt(props.autoEnrolmentDate)}</p></div>}
        {(props.ks10SignedDate || props.ks10ReceivedDate) && <div><span className="text-sage-500">KS10</span><p className="text-sage-800 font-medium">signed {fmt(props.ks10SignedDate)} · received {fmt(props.ks10ReceivedDate)}</p></div>}
        {props.optoutSubmittedToIrdDate && <div><span className="text-sage-500">Submitted to IRD</span><p className="text-sage-800 font-medium">{fmt(props.optoutSubmittedToIrdDate)}</p></div>}
        {(props.irdApprovalReference || props.irdApprovalDate) && <div><span className="text-sage-500">IRD approval</span><p className="text-sage-800 font-medium">{props.irdApprovalReference ?? '—'} · {fmt(props.irdApprovalDate)}</p></div>}
        {props.payrollStopEffectiveDate && <div><span className="text-sage-500">Deductions stop</span><p className="text-sage-800 font-medium">{fmt(props.payrollStopEffectiveDate)}</p></div>}
        {isSuspended && <div className="sm:col-span-2"><span className="text-sage-500">Savings suspension</span><p className="text-sage-800 font-medium">{props.suspensionRef ?? '—'} · {fmt(props.suspensionFrom)}{props.suspensionTo ? ` → ${fmt(props.suspensionTo)}` : ''}</p></div>}
      </div>

      {props.winText && (
        <p className={`mt-3 text-xs rounded-lg px-3 py-2 ${props.winOpen ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-sage-50 text-sage-600 border border-sage-100'}`}>{props.winText}</p>
      )}

      {/* KS10 received but not yet forwarded to IRD — the standing reminder. */}
      {props.ks10ReceivedDate && !props.optoutSubmittedToIrdDate && (
        <p className="mt-3 text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200">
          <span className="font-semibold">KS10 not yet sent to IRD.</span> Forward it by your next payday filing (IR348), then record it below with “Record KS10 opt-out submitted to IRD.”
        </p>
      )}

      {/* Non-operative intention note — never affects deductions. */}
      {props.intentionNote && (
        <p className="mt-3 text-xs rounded-lg px-3 py-2 bg-sage-50 text-sage-600 border border-sage-100">
          <span className="font-semibold">Intention noted ({fmt(props.intentionRecordedAt)}) — non-operative:</span> {props.intentionNote}
          <span className="block mt-0.5 text-sage-400">Deductions and employer contributions continue until a valid opt-out or suspension is recorded.</span>
        </p>
      )}

      {!props.isAdmin && <p className="mt-3 text-xs text-sage-400">Admins can record KiwiSaver changes.</p>}

      {props.isAdmin && (
        <div className="mt-5 rounded-xl border border-sage-100 bg-sage-50/40 divide-y divide-sage-100">
          <div className="px-4 pt-3 pb-1"><p className="text-[11px] font-semibold text-sage-500 uppercase tracking-wide">Record a change</p></div>

          {/* KS2 */}
          <details className="px-4">
            <summary className={summary}>Record KS2 (deduction form + rate)</summary>
            <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
              <label className="flex flex-col gap-1"><span className={lbl}>Contribution rate</span>
                <select value={f.ks2Rate} onChange={set('ks2Rate')} className={input}>
                  {KS_EMPLOYEE_STANDARD_RATES.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                </select></label>
              <label className="flex flex-col gap-1"><span className={lbl}>Completed date</span>
                <input type="date" value={f.ks2Date ?? ''} onChange={set('ks2Date')} className={input} /></label>
              <label className="flex flex-col gap-1 col-span-2"><span className={lbl}>Evidence reference (optional)</span>
                <input value={f.ks2Ref ?? ''} onChange={set('ks2Ref')} className={input} placeholder="e.g. KS2 form on file" /></label>
              <div className="col-span-2"><button disabled={isPending} className={btn}
                onClick={() => run(() => recordKiwiSaverKs2({ workerId: props.workerId, rate: Number(f.ks2Rate), completedDate: f.ks2Date || null, evidenceRef: f.ks2Ref || null }))}>Save KS2</button></div>
            </div>
          </details>

          {/* Info pack */}
          <details className="px-4">
            <summary className={summary}>Record info-pack delivery (KS3 + KS10)</summary>
            <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
              <label className="flex flex-col gap-1"><span className={lbl}>Delivered date</span>
                <input type="date" value={f.packDate ?? ''} onChange={set('packDate')} className={input} /></label>
              <div className="col-span-2"><button disabled={isPending} className={btn}
                onClick={() => run(() => recordKiwiSaverInfoPack({ workerId: props.workerId, deliveredDate: f.packDate || null }))}>Save</button></div>
            </div>
          </details>

          {/* Employer KS10 opt-out */}
          <details className="px-4">
            <summary className={summary}>Opt-out — employer-received KS10 (day 14–56)</summary>
            <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
              <p className="col-span-2 text-[11px] text-sage-500">Only for an auto-enrolled employee. The KS10 must be received within the day-14–56 window.</p>
              <label className="flex flex-col gap-1"><span className={lbl}>Employee signed date</span>
                <input type="date" value={f.ks10Signed ?? ''} onChange={set('ks10Signed')} className={input} /></label>
              <label className="flex flex-col gap-1"><span className={lbl}>Received by Sano</span>
                <input type="date" value={f.ks10Received ?? ''} onChange={set('ks10Received')} className={input} /></label>
              <label className="flex flex-col gap-1"><span className={lbl}>Deductions stop from (optional)</span>
                <input type="date" value={f.ks10Effective ?? ''} onChange={set('ks10Effective')} className={input} /></label>
              <div className="col-span-2"><button disabled={isPending} className={btn}
                onClick={() => run(() => recordEmployerOptOut({ workerId: props.workerId, ks10SignedDate: f.ks10Signed || '', ks10ReceivedDate: f.ks10Received || '', payrollStopEffectiveDate: f.ks10Effective || null }))}>Record KS10 opt-out</button></div>
            </div>
          </details>

          {/* Submitted to IRD */}
          {isOptedOut && (
            <details className="px-4">
              <summary className={summary}>Record KS10 opt-out submitted to IRD</summary>
              <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
                <label className="flex flex-col gap-1"><span className={lbl}>Submitted date</span>
                  <input type="date" value={f.irdSubmit ?? ''} onChange={set('irdSubmit')} className={input} /></label>
                <div className="col-span-2"><button disabled={isPending} className={btn}
                  onClick={() => run(() => recordOptOutSubmittedToIrd({ workerId: props.workerId, date: f.irdSubmit || null }))}>Save</button></div>
              </div>
            </details>
          )}

          {/* IRD-managed opt-out */}
          <details className="px-4">
            <summary className={summary}>Opt-out — IRD-managed (myIR / late)</summary>
            <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
              <p className="col-span-2 text-[11px] text-sage-500">Deductions continue until IRD approval is received — a pending application is not enough.</p>
              <label className="flex flex-col gap-1 col-span-2"><span className={lbl}>IRD approval reference</span>
                <input value={f.irdRef ?? ''} onChange={set('irdRef')} className={input} /></label>
              <label className="flex flex-col gap-1"><span className={lbl}>Approval date</span>
                <input type="date" value={f.irdDate ?? ''} onChange={set('irdDate')} className={input} /></label>
              <label className="flex flex-col gap-1"><span className={lbl}>Instructed effective date</span>
                <input type="date" value={f.irdEffective ?? ''} onChange={set('irdEffective')} className={input} /></label>
              <div className="col-span-2"><button disabled={isPending} className={btn}
                onClick={() => run(() => recordIrdOptOut({ workerId: props.workerId, irdApprovalReference: f.irdRef || '', irdApprovalDate: f.irdDate || '', instructedEffectiveDate: f.irdEffective || '' }))}>Record IRD opt-out</button></div>
            </div>
          </details>

          {/* Savings suspension */}
          <details className="px-4">
            <summary className={summary}>{isSuspended ? 'End savings suspension' : 'Savings suspension'}</summary>
            <div className="pb-4 grid grid-cols-2 gap-3 max-w-md">
              {isSuspended ? (
                <>
                  <label className="flex flex-col gap-1"><span className={lbl}>End date</span>
                    <input type="date" value={f.suspEnd ?? ''} onChange={set('suspEnd')} className={input} /></label>
                  <div className="col-span-2"><button disabled={isPending} className={btn}
                    onClick={() => run(() => endSavingsSuspension({ workerId: props.workerId, endDate: f.suspEnd || null }))}>End suspension (resume deductions)</button></div>
                </>
              ) : (
                <>
                  <p className="col-span-2 text-[11px] text-sage-500">Requires evidence of an approved savings-suspension notice before deductions stop.</p>
                  <label className="flex flex-col gap-1 col-span-2"><span className={lbl}>Notice reference</span>
                    <input value={f.suspRef ?? ''} onChange={set('suspRef')} className={input} /></label>
                  <label className="flex flex-col gap-1"><span className={lbl}>Effective from</span>
                    <input type="date" value={f.suspFrom ?? ''} onChange={set('suspFrom')} className={input} /></label>
                  <label className="flex flex-col gap-1"><span className={lbl}>Until (optional)</span>
                    <input type="date" value={f.suspTo ?? ''} onChange={set('suspTo')} className={input} /></label>
                  <div className="col-span-2"><button disabled={isPending} className={btn}
                    onClick={() => run(() => recordSavingsSuspension({ workerId: props.workerId, noticeRef: f.suspRef || '', from: f.suspFrom || '', to: f.suspTo || null }))}>Record suspension</button></div>
                </>
              )}
            </div>
          </details>

          {/* Intention note */}
          <details className="px-4">
            <summary className={summary}>Note an intention to opt out (non-operative)</summary>
            <div className="pb-4 grid grid-cols-1 gap-3 max-w-md">
              <p className="text-[11px] text-sage-500">This is a note only — it does not change status, stop deductions, or change employer contributions.</p>
              <textarea rows={2} value={f.intent ?? ''} onChange={set('intent')} className={input} placeholder="e.g. Employee has said they intend to opt out; awaiting KS10." />
              <div><button disabled={isPending} className={btn}
                onClick={() => run(() => recordOptOutIntention({ workerId: props.workerId, note: f.intent || '' }))}>Save note</button></div>
            </div>
          </details>

          {/* Not eligible */}
          <details className="px-4">
            <summary className={summary}>Record not eligible for automatic enrolment</summary>
            <div className="pb-4 grid grid-cols-1 gap-3 max-w-md">
              <label className="flex flex-col gap-1"><span className={lbl}>Reason</span>
                <input value={f.notEligible ?? ''} onChange={set('notEligible')} className={input} placeholder="e.g. under 18 / over 65 / not a NZ resident" /></label>
              <div><button disabled={isPending} className={btn}
                onClick={() => run(() => recordKiwiSaverNotEligible({ workerId: props.workerId, reason: f.notEligible || '' }))}>Save</button></div>
            </div>
          </details>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${msg.kind === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : msg.kind === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{msg.text}</p>
      )}
      {isPending && <p className="mt-2 text-xs text-sage-400 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving…</p>}

      {/* Audit trail */}
      {props.events.length > 0 && (
        <details className="mt-5">
          <summary className={summary}>Audit trail ({props.events.length})</summary>
          <div className="mt-2 space-y-2">
            {props.events.map((e) => (
              <div key={e.id} className="text-xs bg-white rounded-lg border border-sage-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sage-800">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                  <span className="text-sage-400">{fmt(e.performed_at)}</span>
                </div>
                {e.note && <p className="text-sage-600 mt-0.5">{e.note}</p>}
                {(e.evidence_ref || e.effective_date) && (
                  <p className="text-sage-400 mt-0.5">{e.evidence_ref ? `Ref ${e.evidence_ref}` : ''}{e.evidence_ref && e.effective_date ? ' · ' : ''}{e.effective_date ? `Effective ${fmt(e.effective_date)}` : ''}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
