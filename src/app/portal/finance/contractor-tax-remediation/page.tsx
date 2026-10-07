import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Info, AlertTriangle, HelpCircle } from 'lucide-react'
import clsx from 'clsx'
import { notFound } from 'next/navigation'
import { isFinanceUser } from '@/lib/is-admin'
import { loadRemediationReport } from './_lib/load-remediation'
import type { FindingSeverity } from '@/lib/contractor-tax-remediation'

export const dynamic = 'force-dynamic'

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
const CODE_LABEL: Record<string, string> = {
  schedular_payable_missing_snapshot: 'Schedular payable missing snapshot',
  gst_unresolved: 'GST unresolved',
  withholding_treatment_unresolved: 'Withholding treatment unresolved',
  schedular_paid_without_withholding: 'Schedular paid without withholding',
  declaration_missing: 'IR330C declaration missing',
  liability_line_missing: 'Withholding liability line missing',
  remittance_tax_details_missing: 'Remittance tax details missing',
}
const SEV_BADGE: Record<FindingSeverity, string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  unresolved: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default async function ContractorTaxRemediationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const report = await loadRemediationReport(supabase)
  const { findings, summary } = report

  return (
    <div className="max-w-6xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Finance</Link>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Contractor tax remediation</h1>
        <a
          href="/api/finance/contractor-tax-remediation-csv"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-700 hover:bg-sage-50"
        >
          Download CSV
        </a>
      </div>
      <p className="text-sm text-sage-500 mb-5 max-w-3xl">
        Read-only review of historical contractor records missing tax snapshots, GST treatment, withholding treatment,
        IR330C declarations, liability lines or remittance tax details. This report makes <strong>no changes</strong> — it
        flags records for manual review only. Nothing is corrected, created or paid automatically.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-sage-800 tabular-nums">{summary.total}</div>
          <div className="text-xs text-sage-500 mt-0.5">Total findings</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-red-700 tabular-nums flex items-center gap-1.5"><AlertTriangle size={18} /> {summary.errors}</div>
          <div className="text-xs text-sage-500 mt-0.5">Confirmed errors</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-700 tabular-nums flex items-center gap-1.5"><HelpCircle size={18} /> {summary.unresolved}</div>
          <div className="text-xs text-sage-500 mt-0.5">Unresolved (review)</div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-sage-100 bg-sage-50/60 px-4 py-3 text-xs text-sage-600 flex gap-2 max-w-3xl">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          <strong>Confirmed error</strong> = a definite inconsistency needing correction (e.g. a schedular payment with no
          withholding line). <strong>Unresolved</strong> = evidence is missing or not yet established (e.g. no verified
          IR330C yet) — it must be reviewed, not assumed wrong. The two are kept distinct on purpose.
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sage-400 shadow-sm">
          No remediation findings. Every historical contractor record has resolved tax treatment.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-sage-400 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Finding</th>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">Contractor</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">What&apos;s missing</th>
                  <th className="px-4 py-3 font-medium">Required action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize', SEV_BADGE[f.severity])}>{f.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-sage-700 whitespace-nowrap">{CODE_LABEL[f.code] ?? f.code}</td>
                    <td className="px-4 py-3 text-sage-600 whitespace-nowrap font-mono text-xs">{f.entityRef ?? f.entityId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sage-600 whitespace-nowrap">{f.contractorName ?? '—'}</td>
                    <td className="px-4 py-3 text-sage-700 text-right tabular-nums whitespace-nowrap">{fmt(f.amount)}</td>
                    <td className="px-4 py-3 text-sage-600 max-w-xs">{f.detail}</td>
                    <td className="px-4 py-3 text-sage-500 max-w-xs">{f.requiredAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
