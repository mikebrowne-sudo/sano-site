// Phase E.1 — contractor pay run list (admin-only).
//
// Sister page to /portal/payroll which lists employee pay runs.
// Filters pay_runs.kind = 'contractor' so the two flows stay
// visually + functionally separate.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, DollarSign } from 'lucide-react'
import { isAdminEmail } from '@/lib/is-admin'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  approved:  'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export default async function ContractorPayRunsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  // Pay runs (kind=contractor). Joined to pay_run_items so we can
  // surface counts + totals without a follow-up query per row.
  const { data: runs } = await supabase
    .from('pay_runs')
    .select(`
      id, pay_period_start, pay_period_end, pay_date, status, notes, created_at,
      pay_run_items ( contractor_id, amount )
    `)
    .eq('kind', 'contractor')
    .order('pay_date', { ascending: false })

  type RunRow = {
    id: string
    pay_period_start: string | null
    pay_period_end: string | null
    pay_date: string | null
    status: string
    created_at: string
    pay_run_items: { contractor_id: string; amount: number | null }[] | null
  }
  const list = (runs ?? []) as RunRow[]

  return (
    <div>
      <Link
        href="/portal/payroll"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to payroll
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">Contractor pay runs</h1>
          <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
            Bundles of approved contractor hours. Pay runs flow draft &rarr;
            approved &rarr; paid; once paid, the linked job rows are
            locked.
          </p>
        </div>
        <Link
          href="/portal/payroll/contractor-runs/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} /> New contractor pay run
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <DollarSign size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No contractor pay runs yet.</p>
          <Link
            href="/portal/payroll/contractor-runs/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} /> Create first
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sage-600">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Contractors</th>
                <th className="px-5 py-3 font-semibold text-right">Items</th>
                <th className="px-5 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const items = r.pay_run_items ?? []
                const contractorCount = new Set(items.map((i) => i.contractor_id)).size
                const total = items.reduce((s, i) => s + (i.amount ?? 0), 0)
                const status = r.status ?? 'draft'
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">
                        {fmtDate(r.pay_period_start)} – {fmtDate(r.pay_period_end)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                        <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[status] ?? STATUS_STYLES.draft)}>{status}</span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-right text-sage-700">
                        {contractorCount}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-right text-sage-700">
                        {items.length}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-right font-semibold text-sage-800">
                        {fmtCurrency(total)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/portal/payroll/contractor-runs/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600 text-xs">
                        {fmtDate(r.created_at)}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
