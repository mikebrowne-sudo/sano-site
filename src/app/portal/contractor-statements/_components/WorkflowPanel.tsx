'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, PlayCircle, CheckCircle2, Mail, Eye } from 'lucide-react'
import {
  previewIssueAll, issueAllReadyStatements,
  previewProcessPayments, processReadyPayments,
  markRemittancesPaid, sendRemittanceAdvice,
  type BulkResult,
} from '../_actions-bulk'

interface Period { period_start: string; period_end: string }
interface RemRow { remittance_id: string; remittance_number: string | null; contractor_name: string | null; total: number }

function fmt(n: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n) }
function today() { return new Date().toISOString().slice(0, 10) }

function Summary({ r }: { r: BulkResult }) {
  if (r.error) return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-2">{r.error}</p>
  return (
    <div className="text-sm bg-sage-50 rounded-lg px-4 py-2 mt-2">
      <p className="text-sage-800 font-medium">{r.processed} processed · {r.skipped} skipped · {r.needs_attention} needs attention</p>
      {r.items.filter((i) => !i.ok || i.reason).length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-sage-600">
          {r.items.filter((i) => !i.ok || i.reason).map((i) => (
            <li key={i.id}>{i.label}: {i.ok ? '' : '⚠ '}{i.reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function WorkflowPanel({
  period,
  readyToIssue,
  readyToPay,
  unpaidRemittances,
  paidUnsentRemittances,
}: {
  period: Period
  readyToIssue: number
  readyToPay: number
  unpaidRemittances: RemRow[]
  paidUnsentRemittances: RemRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [payDate, setPayDate] = useState(today())
  const [issuePreview, setIssuePreview] = useState<string | null>(null)
  const [payPreview, setPayPreview] = useState<string | null>(null)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [selPaid, setSelPaid] = useState<Set<string>>(new Set())
  const [selSend, setSelSend] = useState<Set<string>>(new Set())

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const n = new Set(set)
    if (n.has(id)) n.delete(id); else n.add(id)
    setter(n)
  }
  function exec(fn: () => Promise<BulkResult>) {
    setResult(null)
    startTransition(async () => { const r = await fn(); setResult(r); router.refresh() })
  }

  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6 space-y-5">
      <h2 className="text-lg font-semibold text-sage-800">Bulk actions</h2>

      {/* Issue all */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => startTransition(async () => { const p = await previewIssueAll(period); setIssuePreview(p.error ? p.error : `${p.count} statement(s) · ${fmt(p.total ?? 0)}${p.empty ? ` · ${p.empty} empty skipped` : ''}${p.gst_review_lines ? ` · ${p.gst_review_lines} GST-review` : ''}`) })} disabled={isPending || readyToIssue === 0} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"><Eye size={14} /> Preview issue</button>
        <button onClick={() => exec(() => issueAllReadyStatements(period))} disabled={isPending || readyToIssue === 0} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"><Send size={14} /> Issue all ready ({readyToIssue})</button>
        {issuePreview && <span className="text-sm text-sage-600">{issuePreview}</span>}
      </div>

      {/* Process payments */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-sage-600">Payment date <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="ml-1 rounded-lg border border-sage-200 px-3 py-1.5 text-sm" /></label>
        <button onClick={() => startTransition(async () => { const p = await previewProcessPayments(period); setPayPreview(p.error ? p.error : `${p.ready_count} ready · ${fmt(p.ready_total ?? 0)}${p.needs_attention ? ` · ${p.needs_attention} needs attention` : ''}${p.gst_review_lines ? ` · ${p.gst_review_lines} GST-review` : ''}${p.carried_lines ? ` · ${p.carried_lines} carried` : ''}`) })} disabled={isPending || readyToPay === 0} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"><Eye size={14} /> Preview payments</button>
        <button onClick={() => exec(() => processReadyPayments(period, payDate))} disabled={isPending || readyToPay === 0} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"><PlayCircle size={14} /> Process ready payments ({readyToPay})</button>
        {payPreview && <span className="text-sm text-sage-600">{payPreview}</span>}
      </div>

      {/* Mark paid */}
      {unpaidRemittances.length > 0 && (
        <div className="border-t border-sage-100 pt-4">
          <p className="text-sm font-semibold text-sage-800 mb-2">Remittances created — mark paid once the bank payment is made</p>
          <div className="space-y-1 mb-2">
            {unpaidRemittances.map((r) => (
              <label key={r.remittance_id} className="flex items-center gap-2 text-sm text-sage-700">
                <input type="checkbox" checked={selPaid.has(r.remittance_id)} onChange={() => toggle(selPaid, r.remittance_id, setSelPaid)} />
                {r.remittance_number} · {r.contractor_name ?? '—'} · {fmt(r.total)}
              </label>
            ))}
          </div>
          <button onClick={() => exec(() => markRemittancesPaid(Array.from(selPaid), payDate))} disabled={isPending || selPaid.size === 0} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"><CheckCircle2 size={14} /> Mark selected paid ({selPaid.size})</button>
        </div>
      )}

      {/* Send advice */}
      {paidUnsentRemittances.length > 0 && (
        <div className="border-t border-sage-100 pt-4">
          <p className="text-sm font-semibold text-sage-800 mb-2">Paid — send remittance advice</p>
          <div className="space-y-1 mb-2">
            {paidUnsentRemittances.map((r) => (
              <label key={r.remittance_id} className="flex items-center gap-2 text-sm text-sage-700">
                <input type="checkbox" checked={selSend.has(r.remittance_id)} onChange={() => toggle(selSend, r.remittance_id, setSelSend)} />
                {r.remittance_number} · {r.contractor_name ?? '—'} · {fmt(r.total)}
              </label>
            ))}
          </div>
          <button onClick={() => exec(() => sendRemittanceAdvice(Array.from(selSend)))} disabled={isPending || selSend.size === 0} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"><Mail size={14} /> Send selected advice ({selSend.size})</button>
        </div>
      )}

      {result && <Summary r={result} />}
    </div>
  )
}
