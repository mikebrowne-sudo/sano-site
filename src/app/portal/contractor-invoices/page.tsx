// Contractor Invoices — admin reconciliation screen.
//
// Read-heavy reconciliation view: filters/search + job address + invoice
// note visibility so staff can spot mislinked CIs (correct note, wrong
// job — or vice versa) by eye. Admin-only. Shows contractor pay amounts
// only — never margin, client totals, quote totals, or base price.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { Receipt, Plus, Search, AlertTriangle, FileText } from 'lucide-react'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-gray-100 text-gray-700',
  approved: 'bg-blue-50 text-blue-700',
  paid:     'bg-emerald-50 text-emerald-700',
}

function fmt(d: number | null) {
  if (d == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface RawCI {
  id: string
  invoice_number: string | null
  amount: number | null
  date_submitted: string | null
  date_paid: string | null
  status: string | null
  notes: string | null
  contractor_id: string | null
  job_id: string | null
  contractors: { full_name: string | null; hourly_rate: number | null } | null
  jobs: { job_number: string | null; address: string | null; allowed_hours: number | null } | null
}

interface Row {
  id: string
  number: string
  contractorId: string | null
  contractor: string
  jobNumber: string | null
  jobAddress: string | null
  note: string | null
  amount: number | null
  expected: number | null
  variance: number | null
  submitted: string | null
  paid: string | null
  status: string
  needsReview: boolean
  reviewReason: string | null
}

type SP = {
  contractor?: string; status?: string; q?: string
  from?: string; to?: string; min?: string; max?: string; review?: string
}

export default async function ContractorInvoicesPage({ searchParams }: { searchParams?: SP }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const [{ data: invoices, error }, { data: contractorOpts }] = await Promise.all([
    supabase
      .from('contractor_invoices')
      .select('id, invoice_number, amount, date_submitted, date_paid, status, notes, contractor_id, job_id, contractors ( full_name, hourly_rate ), jobs ( job_number, address, allowed_hours )')
      .order('created_at', { ascending: false }),
    supabase.from('contractors').select('id, full_name').order('full_name'),
  ])

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Contractor Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  const allRows: Row[] = (invoices as unknown as RawCI[] ?? []).map((ci) => {
    const c = ci.contractors
    const j = ci.jobs
    const expected = c?.hourly_rate != null && j?.allowed_hours != null ? c.hourly_rate * j.allowed_hours : null
    const variance = expected != null && ci.amount != null ? ci.amount - expected : null
    const status = ci.status ?? 'pending'
    // Safe, unambiguous review flags only (no address parsing).
    let reviewReason: string | null = null
    if (status === 'paid' && !ci.date_paid) reviewReason = 'Paid with no payment date'
    else if (status === 'paid' && !ci.job_id) reviewReason = 'Paid with no linked job'
    return {
      id: ci.id,
      number: ci.invoice_number ?? '—',
      contractorId: ci.contractor_id,
      contractor: c?.full_name ?? '—',
      jobNumber: j?.job_number ?? null,
      jobAddress: j?.address ?? null,
      note: ci.notes?.trim() || null,
      amount: ci.amount,
      expected,
      variance,
      submitted: ci.date_submitted,
      paid: ci.date_paid,
      status,
      needsReview: reviewReason != null,
      reviewReason,
    }
  })

  // ── Filters (JS, small dataset) ──────────────────────────────────
  const f = searchParams ?? {}
  const q = (f.q ?? '').trim().toLowerCase()
  const minA = f.min ? Number(f.min) : null
  const maxA = f.max ? Number(f.max) : null
  const rows = allRows.filter((r) => {
    if (f.contractor && r.contractorId !== f.contractor) return false
    if (f.status && r.status !== f.status) return false
    if (f.review === '1' && !r.needsReview) return false
    if (f.from && (!r.submitted || r.submitted.slice(0, 10) < f.from)) return false
    if (f.to && (!r.submitted || r.submitted.slice(0, 10) > f.to)) return false
    if (minA != null && (r.amount ?? -Infinity) < minA) return false
    if (maxA != null && (r.amount ?? Infinity) > maxA) return false
    if (q) {
      const hay = [r.number, r.contractor, r.jobNumber, r.jobAddress, r.note]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const sum = (xs: Row[]) => Math.round(xs.reduce((s, r) => s + (r.amount ?? 0), 0) * 100) / 100
  const approvedUnpaid = rows.filter((r) => r.status === 'approved' || r.status === 'pending')
  const paid = rows.filter((r) => r.status === 'paid')
  const reviewCount = rows.filter((r) => r.needsReview).length

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Contractor Invoices</h1>
        <div className="flex items-center gap-2">
          <Link href="/portal/contractor-invoices/remittances/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
            <FileText size={16} /> New remittance
          </Link>
          <Link href="/portal/contractor-invoices/new" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
            <Plus size={16} /> New Invoice
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 tnum">
        <SummaryCard label="Showing" value={`${rows.length}`} sub={`of ${allRows.length}`} />
        <SummaryCard label="Approved / unpaid" value={fmt(sum(approvedUnpaid))} sub={`${approvedUnpaid.length} inv`} />
        <SummaryCard label="Paid" value={fmt(sum(paid))} sub={`${paid.length} inv`} />
        <SummaryCard label="Needs review" value={`${reviewCount}`} sub="flagged" accent={reviewCount > 0} />
      </div>

      {/* Filters — plain GET form, no client JS */}
      <form method="get" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[11px] font-medium text-sage-500">Search (job #, address, note, contractor)</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
              <input name="q" defaultValue={f.q ?? ''} placeholder="e.g. Arthur, JOB-0065…" className={clsx(input, 'w-full pl-8')} />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Contractor</span>
            <select name="contractor" defaultValue={f.contractor ?? ''} className={input}>
              <option value="">All</option>
              {(contractorOpts ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Status</span>
            <select name="status" defaultValue={f.status ?? ''} className={input}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved / unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Needs review</span>
            <select name="review" defaultValue={f.review ?? ''} className={input}>
              <option value="">All</option>
              <option value="1">Flagged only</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Submitted from</span>
            <input type="date" name="from" defaultValue={f.from ?? ''} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Submitted to</span>
            <input type="date" name="to" defaultValue={f.to ?? ''} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Amount min</span>
            <input type="number" step="0.01" name="min" defaultValue={f.min ?? ''} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Amount max</span>
            <input type="number" step="0.01" name="max" defaultValue={f.max ?? ''} className={input} />
          </label>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button type="submit" className="bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors">Apply filters</button>
          <Link href="/portal/contractor-invoices" className="text-sm text-sage-500 hover:text-sage-700">Clear</Link>
          <span className="ml-auto text-[11px] text-sage-400">Remittance: not available yet (CI-based remittance not built)</span>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Receipt size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm">No contractor invoices match these filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden tnum">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Invoice #</th>
                  <th className="px-5 py-3 font-semibold">Contractor</th>
                  <th className="px-5 py-3 font-semibold">Job / address / note</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={clsx('border-b border-gray-50 last:border-0 group', r.needsReview && 'bg-amber-50/40')}>
                    <td className="px-5 py-3 align-top">
                      <Link href={`/portal/contractor-invoices/${r.id}`} className="font-medium text-sage-800 hover:underline">{r.number}</Link>
                      {r.needsReview && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5" title={r.reviewReason ?? undefined}>
                          <AlertTriangle size={9} /> review
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top text-sage-700">{r.contractor}</td>
                    <td className="px-5 py-3 align-top">
                      <div className="font-medium text-sage-800">
                        {r.jobNumber ?? <span className="text-amber-700">No job linked</span>}
                        {r.jobAddress && <span className="text-sage-500 font-normal"> — {r.jobAddress}</span>}
                      </div>
                      {r.note && <div className="text-[11px] text-sage-400 italic mt-0.5">Note: {r.note}</div>}
                    </td>
                    <td className="px-5 py-3 align-top text-sage-600 whitespace-nowrap">{fmtDate(r.submitted)}</td>
                    <td className="px-5 py-3 align-top whitespace-nowrap">
                      {r.paid ? <span className="text-sage-700">{fmtDate(r.paid)}</span>
                        : r.status === 'paid' ? <span className="text-red-600 font-medium">missing</span>
                        : <span className="text-sage-300">—</span>}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[r.status] ?? STATUS_STYLES.pending)}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3 align-top text-right font-medium text-sage-800">{fmt(r.amount)}</td>
                    <td className="px-5 py-3 align-top text-right">
                      {r.variance != null
                        ? <span className={clsx('font-medium', r.variance > 0 ? 'text-red-600' : r.variance < 0 ? 'text-emerald-700' : 'text-sage-600')}>{r.variance > 0 ? '+' : ''}{fmt(r.variance)}</span>
                        : <span className="text-sage-300">—</span>}
                    </td>
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

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={clsx('rounded-xl border bg-white p-3', accent ? 'border-amber-200' : 'border-gray-100')}>
      <div className="text-[11px] text-sage-500 font-medium">{label}</div>
      <div className={clsx('text-lg font-bold mt-0.5', accent ? 'text-amber-700' : 'text-sage-800')}>{value}</div>
      {sub && <div className="text-[10px] text-sage-400">{sub}</div>}
    </div>
  )
}
