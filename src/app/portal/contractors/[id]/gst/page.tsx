import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getContractorGstHistory, refreshGstCacheIfStale, type FullGstHistory } from '@/lib/contractor-gst-history-data'
import { getServiceSupabase } from '@/lib/supabase-service'
import { VerifyRejectGst, RecordGst } from './_components/GstControls'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
const TONE: Record<string, string> = {
  submitted: 'bg-amber-50 text-amber-700', verified: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700', superseded: 'bg-gray-100 text-gray-500',
}

export default async function ContractorGstPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()
  const { data: contractor } = await supabase.from('contractors').select('id, full_name').eq('id', params.id).maybeSingle()
  if (!contractor) notFound()

  const { verifiedCurrent, pendingReplacement, history } = await getContractorGstHistory(params.id)
  const todayIso = new Date().toISOString().slice(0, 10)
  // GST-sensitive read: refresh the derived cache to the status applicable today
  // (this is how a future-effective registration "arrives" on its effective date)
  // and get that date-resolved record for display.
  const applicableToday = await refreshGstCacheIfStale(getServiceSupabase(), params.id, history)

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/portal/contractors/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Back to contractor</Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Contractor GST status</h1>
      <p className="text-sm text-sage-500 mb-6">{contractor.full_name} · effective-dated GST history. GST is recorded from evidence — never inferred from turnover — and applies from its verified effective date. Immutable: a change supersedes, never overwrites. No GST is calculated here.</p>

      {/* Applicable today */}
      <div className={clsx('rounded-2xl border p-5 mb-6', applicableToday?.gstRegistered ? 'border-emerald-100 bg-emerald-50/50' : 'border-sage-100 bg-sage-50/50')}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1">Applicable today ({fmtDate(todayIso)})</p>
        {applicableToday ? (
          <p className="text-sm text-sage-800">
            {applicableToday.gstRegistered ? <>Registered · {applicableToday.gstNumber ?? '—'} · from {fmtDate(applicableToday.effectiveDate)}{applicableToday.endDate ? ` to ${fmtDate(applicableToday.endDate)}` : ''}</> : <>Not registered · from {fmtDate(applicableToday.effectiveDate)}</>}
          </p>
        ) : (
          <p className="text-sm text-amber-700">Unresolved — no verified GST status covers today. GST is not applied, but this needs a verified declaration (absence of a record is not a confirmed &ldquo;not registered&rdquo;).</p>
        )}
        <p className="text-[11px] text-sage-400 mt-1">Payment calculations (a later PR) resolve the GST status by supply date, not the newest row.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-sage-800">Current verified status</h2>
          <RecordGst contractorId={params.id} />
        </div>
        {verifiedCurrent ? <GstDetail g={verifiedCurrent} /> : <p className="text-sm text-sage-400">No verified GST status. Record one, or the contractor can submit via their secure link.</p>}
      </div>

      {pendingReplacement && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-1">Pending replacement — awaiting review</h2>
          <p className="text-[11px] text-sage-400 mb-3">The current verified status stays valid until you verify this. Rejecting it leaves the verified status unchanged.</p>
          <GstDetail g={pendingReplacement} />
          <div className="mt-4 pt-4 border-t border-sage-50"><VerifyRejectGst gstId={pendingReplacement.id} /></div>
        </div>
      )}

      {history.filter((h) => h.id !== verifiedCurrent?.id && h.id !== pendingReplacement?.id).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-sage-800 mb-3">Prior GST statuses</h2>
          <ul className="divide-y divide-sage-50">
            {history.filter((h) => h.id !== verifiedCurrent?.id && h.id !== pendingReplacement?.id).map((h) => (
              <li key={h.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-sage-700"><span className="font-mono text-xs">{h.gstNumberRef}</span> · {h.gstRegistered ? `Registered ${h.gstNumber ?? ''}` : 'Not registered'}</span>
                  <Badge status={h.status} />
                </div>
                <p className="text-[11px] text-sage-400">{h.gstRegistered ? `Effective ${fmtDate(h.effectiveDate)}${h.endDate ? `–${fmtDate(h.endDate)}` : ''} · ` : ''}{h.source === 'contractor_submitted' ? 'contractor-submitted' : 'staff-recorded'}{h.supersededAt ? ` · superseded ${fmtDate(h.supersededAt)}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function GstDetail({ g }: { g: FullGstHistory }) {
  const rows: [string, string][] = [
    ['Record', g.gstNumberRef ?? '—'],
    ['Registered', g.gstRegistered ? 'Yes' : 'No'],
    ['GST number', g.gstNumber ?? '—'],
    ['Effective', g.effectiveDate ?? '—'],
    ['End date', g.endDate ?? '—'],
    ['Signed', g.signedName ? `${g.signedName} · ${g.signedAt ? new Date(g.signedAt).toLocaleDateString('en-NZ') : '—'}` : '—'],
    ['Source', g.source === 'contractor_submitted' ? 'Contractor-submitted' : 'Staff-recorded'],
    ['Verified', g.verifiedAt ? new Date(g.verifiedAt).toLocaleDateString('en-NZ') : '—'],
  ]
  return (
    <div>
      <div className="mb-3"><Badge status={g.status} /></div>
      <div className="rounded-xl border border-sage-100 overflow-hidden">
        <table className="w-full text-[13px]"><tbody>
          {rows.map(([k, v], i) => <tr key={i} className="border-b border-sage-50 last:border-0"><td className="py-2 px-4 text-sage-500 w-2/5 align-top">{k}</td><td className="py-2 px-4 font-medium text-sage-800">{v}</td></tr>)}
        </tbody></table>
      </div>
      {g.reviewNotes && <p className="text-[11px] text-sage-500 mt-2">Review notes: {g.reviewNotes}</p>}
    </div>
  )
}
function Badge({ status }: { status: string }) {
  return <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', TONE[status] ?? TONE.submitted)}>{status}</span>
}
