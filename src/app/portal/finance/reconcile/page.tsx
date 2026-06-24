import Link from 'next/link'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { reconcile, type CreditStatus, type DebitStatus } from '@/lib/bank-reconcile'
import { getReconcileData } from './_data'
import { Uploader } from './_components/Uploader'
import { ClearToggle } from './_components/ClearToggle'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CREDIT_LABEL: Record<CreditStatus, string> = {
  reconciled: 'Reconciled', unpaid_match: 'Not marked paid', amount_match: 'Likely match', financing: 'Owner / transfer', unmatched: 'No match',
}
const CREDIT_TONE: Record<CreditStatus, string> = {
  reconciled: 'bg-emerald-50 text-emerald-700', unpaid_match: 'bg-amber-50 text-amber-700', amount_match: 'bg-amber-50 text-amber-700', financing: 'bg-sage-100 text-sage-600', unmatched: 'bg-red-50 text-red-700',
}
const DEBIT_LABEL: Record<DebitStatus, string> = { recorded: 'Recorded', not_recorded: 'Not recorded' }
const DEBIT_TONE: Record<DebitStatus, string> = { recorded: 'bg-emerald-50 text-emerald-700', not_recorded: 'bg-amber-50 text-amber-700' }

export default async function ReconcilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { transactions, meta, invoices, expenses } = await getReconcileData()
  const result = reconcile({ transactions, invoices, expenses })
  const s = result.summary
  const hasData = transactions.length > 0

  return (
    <div className="max-w-6xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Finance</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">Bank reconciliation</h1>
      <p className="text-sm text-sage-500 mb-8">Import an ASB CSV export to match bank credits against your invoices and debits against your expenses. Re-importing is safe — duplicates are skipped.</p>

      <Uploader />

      {!hasData ? (
        <p className="text-sage-500 text-sm mt-8">No bank transactions imported yet. Upload an ASB export above to get started.</p>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Money in" value={fmt(s.totalIn)} tone="in" sub={`${s.creditCount} credits`} />
            <Stat label="Money out" value={fmt(s.totalOut)} tone="out" sub={`${s.debitCount} debits`} />
            <Stat label="Invoices to mark paid" value={String(s.invoicesToMarkPaid)} tone={s.invoicesToMarkPaid ? 'warn' : 'ok'} />
            <Stat label="Debits to record" value={String(s.debitsToRecord)} tone={s.debitsToRecord ? 'warn' : 'ok'} />
          </div>

          <Panel icon={ArrowDownLeft} title={`Money in — credits (${result.credits.length})`}>
            <Table head={['Date', 'From', 'Reference', 'Status', 'Amount', 'Action', '']}>
              {result.credits.map((c, i) => {
                const m = meta.get(c.txn.uniqueId)
                return (
                  <tr key={`${c.txn.uniqueId}-${i}`} className={clsx('border-b border-gray-50', m?.cleared && 'opacity-45')}>
                    <Td className="whitespace-nowrap">{fmtDate(c.txn.date)}</Td>
                    <Td className="max-w-[260px] truncate" title={c.txn.payee}>{c.txn.payee}</Td>
                    <Td className="max-w-[220px] truncate text-sage-500" title={c.invoice?.invoiceNumber ?? c.txn.memo}>{c.invoice?.invoiceNumber ?? c.txn.memo}</Td>
                    <Td><Badge tone={CREDIT_TONE[c.status]}>{CREDIT_LABEL[c.status]}</Badge></Td>
                    <Td className="text-right font-medium">{fmt(c.txn.amount)}</Td>
                    <Td className="text-right">
                      {(c.status === 'unpaid_match' || c.status === 'amount_match') && c.invoice && (
                        <Link href={`/portal/invoices/${c.invoice.id}`} className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap">Mark paid →</Link>
                      )}
                    </Td>
                    <Td className="text-right">{m && <ClearToggle id={m.id} cleared={m.cleared} />}</Td>
                  </tr>
                )
              })}
            </Table>
          </Panel>

          <Panel icon={ArrowUpRight} title={`Money out — debits (${result.debits.length})`}>
            <Table head={['Date', 'Detail', 'Status', 'Amount', 'Action', '']}>
              {result.debits.map((d, i) => {
                const m = meta.get(d.txn.uniqueId)
                return (
                  <tr key={`${d.txn.uniqueId}-${i}`} className={clsx('border-b border-gray-50', m?.cleared && 'opacity-45')}>
                    <Td className="whitespace-nowrap">{fmtDate(d.txn.date)}</Td>
                    <Td className="max-w-[420px] truncate" title={d.txn.memo || d.txn.payee}>{d.txn.memo || d.txn.payee}</Td>
                    <Td><Badge tone={DEBIT_TONE[d.status]}>{DEBIT_LABEL[d.status]}</Badge></Td>
                    <Td className="text-right font-medium">{fmt(Math.abs(d.txn.amount))}</Td>
                    <Td className="text-right">
                      {d.status === 'not_recorded' && (
                        <Link
                          href={`/portal/expenses/new?amount=${Math.abs(d.txn.amount)}&date=${d.txn.date}&ref=${encodeURIComponent(d.txn.memo || d.txn.payee)}`}
                          className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap"
                        >Add expense →</Link>
                      )}
                    </Td>
                    <Td className="text-right">{m && <ClearToggle id={m.id} cleared={m.cleared} />}</Td>
                  </tr>
                )
              })}
            </Table>
          </Panel>

          <p className="text-xs text-sage-400">
            Matches are recomputed live against your current invoices and expenses, so they stay correct as records change.
            Credits tie to invoices by the INV-number in the memo, or by a unique amount; debits tie to expenses by amount and
            date. Always eyeball a suggested match before acting. Tick “Clear” once you’ve handled a line.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'in' | 'out' | 'ok' | 'warn' }) {
  return (
    <div className={clsx('rounded-xl border p-4', tone === 'in' ? 'bg-emerald-50 border-emerald-100' : tone === 'warn' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className={clsx('text-xl font-bold mt-1 tabular-nums', tone === 'in' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-sage-800')}>{value}</p>
      {sub && <p className="text-xs text-sage-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Panel({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-800 mb-4"><Icon size={18} className="text-sage-400" />{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-sage-600">
          {head.map((h, i) => <th key={i} className={clsx('px-3 py-2 font-semibold', h === 'Amount' && 'text-right')}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Td({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <td className={clsx('px-3 py-2 text-sage-700', className)} title={title}>{children}</td>
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', tone)}>{children}</span>
}
