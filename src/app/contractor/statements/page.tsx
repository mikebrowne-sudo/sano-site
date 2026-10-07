// Historical payment statements — READ-ONLY (Phase 2, 2026-08-17).
//
// Statements are retired as an active workflow. Contractors are no longer asked
// to review, confirm, acknowledge or query anything before they get paid: pay
// now flows straight from approved work to a remittance, and the remittance
// advice arrives after payment as a record.
//
// This page is kept only so any statement a contractor was previously sent
// stays reachable. Production has 0 issued statements, so in practice every
// contractor sees the empty state. Nothing here asks the contractor to act.

import { getContractor } from '../_lib/get-contractor'
import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

export default async function ContractorStatementsPage() {
  const { supabase, contractor } = await getContractor()

  // RLS restricts to this contractor's issued+ statements; the explicit filters
  // make the intent clear and keep drafts out.
  const { data: rows } = await supabase
    .from('contractor_statements')
    .select('id, statement_number, period_start, period_end, status, total_payable')
    .eq('contractor_id', contractor.id)
    .in('status', ['issued', 'superseded', 'confirmed', 'paid'])
    .order('period_start', { ascending: false })
  const statements = rows ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-1">Past payment statements</h1>
      <p className="text-sm text-sage-500 mb-6">
        Older payment records, kept for your reference. Nothing here needs your
        attention — you don&rsquo;t need to review or confirm anything to be paid.
        These are not tax invoices.
      </p>

      {statements.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-8 text-center text-sage-500 text-sm">
          <p>You have no past payment statements.</p>
          <p className="mt-2 text-xs text-sage-400">
            Your pay and payment history live on the{' '}
            <Link href="/contractor/payroll" className="underline hover:text-sage-600">Pay</Link>{' '}
            page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {statements.map((s) => (
            <Link
              key={s.id}
              href={`/contractor/statements/${s.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-sage-100 shadow-sm p-4 hover:border-sage-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-sage-400" />
                  <span className="font-semibold text-sage-800">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</span>
                  {s.status === 'superseded' && <span className="text-[10px] uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">superseded</span>}
                  {s.status === 'paid' && <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">paid</span>}
                </div>
                <span className="text-xs text-sage-400">{s.statement_number}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sage-800 font-semibold">{fmtCurrency(Number(s.total_payable))}</span>
                <ArrowRight size={16} className="text-sage-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
