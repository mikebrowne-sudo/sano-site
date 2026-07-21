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
      <h1 className="text-2xl font-bold text-sage-800 mb-1">Payment statements</h1>
      <p className="text-sm text-sage-500 mb-6">Your Sano payment statements. These are not tax invoices.</p>

      {statements.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-8 text-center text-sage-500 text-sm">
          You have no payment statements yet.
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
