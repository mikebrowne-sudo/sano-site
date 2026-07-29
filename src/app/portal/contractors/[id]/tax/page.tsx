import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getContractorDeclarations, applicableDeclarationRecord, type FullDeclaration } from '@/lib/contractor-tax-declaration-data'
import { getContractorSetupBundle } from '@/lib/contractor-setup-data'
import { resolveContractorTaxGate, type ScheduleTaxTreatment } from '@/lib/contractor-tax-gate'
import { formatRatePct } from '@/lib/contractor-tax-declaration'
import { VerifyReject, RecordDeclaration, ScheduleTaxClassifier } from './_components/TaxDeclarationControls'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-amber-50 text-amber-700', verified: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700', superseded: 'bg-gray-100 text-gray-500',
}

export default async function ContractorTaxPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: contractor } = await supabase.from('contractors').select('id, full_name, ird_number, legal_name, business_structure').eq('id', params.id).maybeSingle()
  if (!contractor) notFound()

  const { history } = await getContractorDeclarations(params.id)
  const { schedules } = await getContractorSetupBundle(params.id)
  const todayIso = new Date().toISOString().slice(0, 10)
  const gate = resolveContractorTaxGate(
    schedules.map((s) => ({ id: s.id, name: s.name, taxTreatment: (s.taxTreatment ?? null) as ScheduleTaxTreatment })),
    applicableDeclarationRecord(history, todayIso), // date-based (future-effective/expired handled)
    todayIso,
  )
  // A verified declaration and a pending replacement may coexist.
  const pendingReplacement = history.find((d) => d.status === 'submitted') ?? null
  const verifiedCurrent = history.find((d) => d.status === 'verified' && !d.supersededAt) ?? null

  // Mismatch flags between the latest declaration and the contractor profile
  // (prefer the pending replacement's declared identity, else the verified one).
  const latestDeclared = pendingReplacement ?? verifiedCurrent
  const mismatches: string[] = []
  if (latestDeclared?.contractingIrdNumber && contractor.ird_number && latestDeclared.contractingIrdNumber !== contractor.ird_number) {
    mismatches.push('Declared IRD number differs from the contractor profile.')
  }
  if (latestDeclared?.contractingLegalName && contractor.legal_name && latestDeclared.contractingLegalName !== contractor.legal_name) {
    mismatches.push('Declared legal name differs from the contractor profile.')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/portal/contractors/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Back to contractor</Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Contractor tax declaration</h1>
      <p className="text-sm text-sage-500 mb-6">{contractor.full_name} · IR330C / tailored-rate / exemption. Declarations are immutable — a correction supersedes, never overwrites. Verification is separate from signing the agreement.</p>

      {/* Payment blocker summary (per schedule, not universal) */}
      <div className={clsx('rounded-2xl border p-5 mb-6', gate.allClear ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50')}>
        <h2 className={clsx('flex items-center gap-2 font-semibold mb-2', gate.allClear ? 'text-emerald-800' : 'text-amber-800')}>
          {gate.allClear ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          {gate.allClear ? 'Tax gate satisfied for all schedules' : `Tax gate blocking ${gate.blocked.length} schedule${gate.blocked.length === 1 ? '' : 's'}`}
        </h2>
        <ul className="space-y-1 text-sm">
          {gate.schedules.map((s) => (
            <li key={s.scheduleId} className="flex items-start justify-between gap-3">
              <span className={s.ok ? 'text-sage-700' : 'text-amber-800'}>
                <span className="font-medium">{s.name}</span> — {s.reason}
              </span>
              <span className="shrink-0"><ScheduleTaxClassifier contractorId={params.id} scheduleId={s.scheduleId} current={s.treatment} /></span>
            </li>
          ))}
          {gate.schedules.length === 0 && <li className="text-sage-400">No service schedules to classify yet.</li>}
        </ul>
        <p className="text-[11px] text-sage-400 mt-2">A verified IR330C does not make every schedule schedular — classify each schedule independently. PR 4 gates payment-readiness only; no tax is calculated or deducted yet.</p>
      </div>

      {mismatches.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 mb-6 text-sm text-amber-800">
          <p className="font-medium mb-1">Mismatches with the contractor profile:</p>
          <ul className="list-disc list-inside text-xs">{mismatches.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      {/* Current verified declaration */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-sage-800">Current verified declaration</h2>
          <RecordDeclaration contractorId={params.id} />
        </div>
        {verifiedCurrent ? (
          <DeclarationDetail d={verifiedCurrent} />
        ) : (
          <p className="text-sm text-sage-400">No verified declaration. Record one, or the contractor can submit via their secure link.</p>
        )}
      </div>

      {/* Pending replacement — coexists with the verified one; verifying it
          atomically supersedes the current verified declaration. */}
      {pendingReplacement && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-sage-800 mb-1">Pending replacement — awaiting review</h2>
          <p className="text-[11px] text-sage-400 mb-3">The current verified declaration stays valid until you verify this replacement. Rejecting it leaves the verified declaration unchanged.</p>
          <DeclarationDetail d={pendingReplacement} />
          <div className="mt-4 pt-4 border-t border-sage-50"><VerifyReject declarationId={pendingReplacement.id} /></div>
        </div>
      )}

      {/* History */}
      {history.filter((d) => d.id !== verifiedCurrent?.id && d.id !== pendingReplacement?.id).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-sage-800 mb-3">Prior declarations</h2>
          <ul className="divide-y divide-sage-50">
            {history.filter((d) => d.id !== verifiedCurrent?.id && d.id !== pendingReplacement?.id).map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-sage-700"><span className="font-mono text-xs">{d.declarationNumber}</span> · {d.declarationType.replace(/_/g, ' ')} · {formatRatePct(d.withholdingRate)}</span>
                  <Badge status={d.status} />
                </div>
                <p className="text-[11px] text-sage-400">Effective {fmtDate(d.effectiveDate)} · {d.source === 'contractor_submitted' ? 'contractor-submitted' : 'staff-recorded'}{d.supersededAt ? ` · superseded ${fmtDate(d.supersededAt)}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DeclarationDetail({ d }: { d: FullDeclaration }) {
  const rows: [string, string][] = [
    ['Declaration', d.declarationNumber ?? '—'],
    ['Type', d.declarationType.replace(/_/g, ' ')],
    ['Rate', formatRatePct(d.withholdingRate)],
    ['Activity', d.ir330cActivityNumber ? `${d.ir330cActivityNumber}${d.ir330cActivityDescription ? ` — ${d.ir330cActivityDescription}` : ''}` : '—'],
    ['Effective', d.effectiveDate ?? '—'],
    ['Expiry', d.expiryDate ?? '—'],
    ['Tailored-rate cert', d.tailoredRateCertificateRef ?? '—'],
    ['Exemption cert', d.exemptionCertificateRef ?? '—'],
    ['Contracting IRD', d.contractingIrdNumber ?? '—'],
    ['Signed', d.signedName ? `${d.signedName} · ${d.signedAt ? new Date(d.signedAt).toLocaleDateString('en-NZ') : '—'}` : '—'],
    ['Source', d.source === 'contractor_submitted' ? 'Contractor-submitted' : 'Staff-recorded'],
    ['Verified', d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString('en-NZ') : '—'],
  ]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><Badge status={d.status} /></div>
      <div className="rounded-xl border border-sage-100 overflow-hidden">
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={i} className="border-b border-sage-50 last:border-0"><td className="py-2 px-4 text-sage-500 w-2/5 align-top">{k}</td><td className="py-2 px-4 font-medium text-sage-800">{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {d.reviewNotes && <p className="text-[11px] text-sage-500 mt-2">Review notes: {d.reviewNotes}</p>}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  return <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_TONE[status] ?? STATUS_TONE.submitted)}>{status}</span>
}
