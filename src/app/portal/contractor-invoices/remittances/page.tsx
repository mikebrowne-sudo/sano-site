// Contractor payment history (Phase 4).
//
// The historical half of the contractor pay workspace: what we've paid, to whom,
// when, which jobs were included, and whether the bank confirms it. The
// "current" half — what we owe — lives at /portal/contractor-invoices/pay-run.
//
// Built on the existing route rather than a new one, so there's a single place
// to find a past payment.
//
// PAID vs BANK CONFIRMED are different facts and are shown as such:
//   paid_at           = staff recorded the payment
//   payment_confirmed = fully matched to outgoing bank money by reconcile-out
// payment_confirmed only flips true at FULL coverage, so a partially-matched
// remittance is surfaced separately as "Partly confirmed" rather than being
// lumped in with untouched ones.
//
// This screen is READ-ONLY with respect to payment truth: it never writes
// paid_at, payment_confirmed or allocations. /portal/finance/reconcile-out
// remains the only place bank matching happens.
//
// Historical payees come from the FROZEN remittance rows (payee_label +
// snapshotted item contractor_name), never from current grouping rules, so
// history can't be rewritten by a later change to how couples are grouped.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Search, Wallet, Landmark, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { listRemittanceBatches, type PaymentState } from '@/lib/contractor-remittance-data'
import { SendRemittanceButton } from '@/components/SendRemittanceButton'
import { formatCurrency, formatDate } from '@/lib/format'
import { PaymentStateChip, daysSince, STALE_AFTER_DAYS } from './_components/PaymentStateChip'

export const dynamic = 'force-dynamic'

type SP = { q?: string; state?: string; from?: string; to?: string }

const STATE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All payments' },
  { value: 'paid', label: 'Paid — awaiting bank' },
  { value: 'partial', label: 'Partly confirmed' },
  { value: 'confirmed', label: 'Bank confirmed' },
  { value: 'open', label: 'Open (not yet paid)' },
]

export default async function ContractorPaymentHistoryPage({ searchParams }: { searchParams?: SP }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const all = await listRemittanceBatches()
  const f = searchParams ?? {}
  const q = (f.q ?? '').trim().toLowerCase()

  // Filter in JS — the dataset is small (tens of remittances) and this keeps
  // job-number/address search (which spans the item rows) in one place.
  const rows = all.filter((b) => {
    if (f.state && b.state !== (f.state as PaymentState)) return false
    // Date range applies to the payment date, falling back to creation for
    // remittances that were never given one.
    const d = (b.paymentDate ?? b.createdAt ?? '').slice(0, 10)
    if (f.from && (!d || d < f.from)) return false
    if (f.to && (!d || d > f.to)) return false
    if (q) {
      const hay = [
        b.remittanceNumber, b.payeeLabel, b.reference,
        ...b.contractorNames, ...b.jobNumbers, ...b.jobAddresses,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const sum = (xs: typeof rows) => Math.round(xs.reduce((s, b) => s + b.total, 0) * 100) / 100
  const paidRows = rows.filter((b) => b.state === 'paid' || b.state === 'partial')
  const confirmedRows = rows.filter((b) => b.state === 'confirmed')

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const hasFilters = Boolean(q || f.state || f.from || f.to)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Current | History — the two halves of the contractor pay workspace. */}
      <nav className="flex items-center gap-1 mb-5 text-sm">
        <Link
          href="/portal/contractor-invoices/pay-run"
          className="px-3 py-1.5 rounded-lg text-sage-600 hover:bg-sage-50 hover:text-sage-800 transition-colors"
        >
          Current pay
        </Link>
        <span className="px-3 py-1.5 rounded-lg bg-sage-100 text-sage-800 font-semibold">Payment history</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Payment history</h1>
          <p className="text-sm text-sage-500 mt-0.5">
            What we&rsquo;ve paid contractors, and whether the bank confirms it.
          </p>
        </div>
        <Link href="/portal/contractor-invoices/remittances/new" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
          <Plus size={16} /> New remittance
        </Link>
      </div>

      {/* Summary — reflects the current filter so the numbers match the list. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-wide text-sage-400 mb-1">
            {hasFilters ? 'Matching payments' : 'All payments'}
          </div>
          <div className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(sum(rows))}</div>
          <div className="text-xs text-sage-500 mt-0.5">{rows.length} of {all.length} remittance{all.length === 1 ? '' : 's'}</div>
        </div>
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sage-400 mb-1">
            <Wallet size={12} /> Awaiting bank confirmation
          </div>
          <div className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(sum(paidRows))}</div>
          <div className="text-xs text-sage-500 mt-0.5">{paidRows.length} payment{paidRows.length === 1 ? '' : 's'}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-emerald-600 mb-1">
            <Landmark size={12} /> Bank confirmed
          </div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">{formatCurrency(sum(confirmedRows))}</div>
          <div className="text-xs text-emerald-700 mt-0.5">{confirmedRows.length} payment{confirmedRows.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* Filters — plain GET form, no client JS. */}
      <form method="get" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-sage-500">Search (contractor, job number, address, RA number, reference)</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
              <input name="q" defaultValue={f.q ?? ''} placeholder="e.g. Upasni, JOB-0063, Barrack, RA-0021…" className={clsx(input, 'w-full pl-8')} />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Payment state</span>
            <select name="state" defaultValue={f.state ?? ''} className={input}>
              {STATE_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-sage-500">Paid from</span>
              <input type="date" name="from" defaultValue={f.from ?? ''} className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-sage-500">Paid to</span>
              <input type="date" name="to" defaultValue={f.to ?? ''} className={input} />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button type="submit" className="bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors">Apply</button>
          {hasFilters && <Link href="/portal/contractor-invoices/remittances" className="text-sm text-sage-500 hover:text-sage-700 underline">Clear</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <FileText size={28} className="mx-auto text-sage-300" />
          <p className="text-sage-600 mt-3 text-sm">
            {all.length === 0 ? 'No payments yet.' : 'No payments match these filters.'}
          </p>
          {all.length === 0 && (
            <Link href="/portal/contractor-invoices/pay-run" className="inline-flex items-center gap-2 mt-4 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
              Go to contractor pay <ArrowRight size={15} />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden tnum">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-200 bg-sage-50/50">
                  <th className="py-3 px-4 font-semibold">Paid</th>
                  <th className="py-3 px-4 font-semibold">Payee</th>
                  <th className="py-3 px-4 font-semibold">Remittance</th>
                  <th className="py-3 px-4 font-semibold text-right">Jobs</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  // Frozen historical payee — never re-derived from current rules.
                  const payee = b.payeeLabel || b.contractorNames.join(' & ') || '—'
                  const age = b.state === 'paid' ? daysSince(b.paidAt) : null
                  const stale = age != null && age >= STALE_AFTER_DAYS
                  return (
                    <tr key={b.id} className="border-b border-sage-50 hover:bg-sage-50/40 align-top">
                      <td className="py-3 px-4 text-sage-700 whitespace-nowrap">{formatDate(b.paymentDate ?? b.createdAt)}</td>
                      <td className="py-3 px-4 text-sage-800 font-medium">{payee}</td>
                      <td className="py-3 px-4">
                        <Link href={`/portal/contractor-invoices/remittances/${b.id}`} className="font-medium text-sage-800 hover:underline">
                          {b.remittanceNumber}
                        </Link>
                        {b.jobNumbers.length > 0 && (
                          <div className="text-[11px] text-sage-400 mt-0.5 max-w-[220px] truncate" title={b.jobNumbers.join(', ')}>
                            {b.jobNumbers.slice(0, 3).join(', ')}{b.jobNumbers.length > 3 ? ` +${b.jobNumbers.length - 3}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-sage-600">{b.jobNumbers.length || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-sage-800">{formatCurrency(b.total)}</td>
                      <td className="py-3 px-4 text-sage-500 max-w-[160px] truncate" title={b.reference ?? ''}>{b.reference || '—'}</td>
                      <td className="py-3 px-4">
                        <PaymentStateChip state={b.state} allocatedTotal={b.allocatedTotal} total={b.total} />
                        {b.state === 'paid' && (
                          <div className={clsx('text-[10px] mt-1', stale ? 'text-amber-700' : 'text-sage-400')}>
                            {stale ? `Unreconciled ${age} days` : 'Awaiting bank confirmation'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          {!b.sentAt && <SendRemittanceButton id={b.id} sentAt={b.sentAt} variant="compact" />}
                          {(b.state === 'paid' || b.state === 'partial') && (
                            <Link href="/portal/finance/reconcile-out" className="text-sage-500 hover:text-sage-700 text-xs underline">
                              Reconcile
                            </Link>
                          )}
                          <Link href={`/portal/contractor-invoices/remittances/${b.id}`} className="text-sage-600 hover:text-sage-800 font-medium">
                            Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
