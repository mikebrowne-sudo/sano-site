import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser, isFinanceUser } from '@/lib/is-admin'
import { matchOutgoing, type OutMatchStatus } from '@/lib/remittance-reconcile'
import { getReconcileOutData } from './_data'
import { RemitMatchPanel, type MatchRemittance } from './_components/RemitMatchPanel'
import { ReverseRemitAllocation } from './_components/ReverseRemitAllocation'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABEL: Record<OutMatchStatus, string> = {
  reconciled: 'Reconciled', reference_match: 'Likely match', amount_date_match: 'Likely match', unmatched: 'No match',
}
const STATUS_TONE: Record<OutMatchStatus, string> = {
  reconciled: 'bg-emerald-50 text-emerald-700', reference_match: 'bg-amber-50 text-amber-700', amount_date_match: 'bg-amber-50 text-amber-700', unmatched: 'bg-red-50 text-red-700',
}

export default async function ReconcileOutPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()
  const canEdit = isAdminUser(user) // accountants read-only

  const { debits, meta, remittances } = await getReconcileOutData()
  const rows = matchOutgoing({ debits, remittances })
  const hasData = debits.length > 0

  // Full remittance list for the searchable match picker.
  const matchList: MatchRemittance[] = remittances.map((r) => ({
    id: r.id, number: r.remittanceNumber, payee: r.payeeLabel ?? '', reference: r.reference ?? '',
    paymentDate: r.paymentDate, total: r.total, allocated: r.allocatedTotal ?? 0, paidAt: r.paidAt, confirmed: r.paymentConfirmed,
  }))

  const isDone = (r: (typeof rows)[number]) => r.status === 'reconciled' || !!meta.get(r.debit.id)?.cleared
  const worklist = rows.filter((r) => !isDone(r))
  const done = rows.filter(isDone)

  const totalOut = debits.reduce((s, d) => s + Math.abs(d.amount), 0)
  const toReconcile = worklist.length
  const paidUnconfirmed = remittances.filter((r) => r.paidAt && !r.paymentConfirmed).length

  const renderRow = (r: (typeof rows)[number], i: number) => {
    const m = meta.get(r.debit.id)
    return (
      <tr key={`${r.debit.id}-${i}`} className={clsx('border-b border-gray-50 align-top', m?.cleared && 'opacity-45')}>
        <Td className="whitespace-nowrap">{fmtDate(r.debit.date)}</Td>
        <Td className="max-w-[380px] truncate" title={r.debit.memo || r.debit.payee}>{r.debit.memo || r.debit.payee}</Td>
        <Td><Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge></Td>
        <Td className="text-right font-medium whitespace-nowrap">{fmt(Math.abs(r.debit.amount))}</Td>
        <Td className="text-right">
          {canEdit && r.status !== 'reconciled' && (
            <RemitMatchPanel
              bankTxnId={r.debit.id}
              debitAmount={r.debit.amount}
              remaining={r.remaining}
              suggestedId={r.remittance?.id ?? null}
              remittances={matchList}
              triggerLabel={r.remittance ? `Match ${r.remittance.remittanceNumber} →` : 'Match →'}
            />
          )}
          {m && m.allocations.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {m.allocations.map((a) => (
                <div key={a.id} className="flex items-center justify-end gap-2 text-xs text-sage-500">
                  <span className="tabular-nums">{a.remittanceNumber} · {fmt(a.amount)}</span>
                  {canEdit && <ReverseRemitAllocation allocationId={a.id} remittanceNumber={a.remittanceNumber} amount={a.amount} />}
                </div>
              ))}
            </div>
          )}
        </Td>
      </tr>
    )
  }

  const HEAD = ['Date', 'Detail', 'Status', 'Amount', 'Action']

  return (
    <div className="max-w-6xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Finance</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">Outgoing reconciliation</h1>
      <p className="text-sm text-sage-500 mb-6">
        Match outgoing bank debits to the contractor remittances they paid. A remittance is only confirmed paid once it&apos;s matched to
        real bank money — creating or marking a remittance paid on its own doesn&apos;t prove the payment left the account. Import bank
        data on the <Link href="/portal/finance/reconcile" className="underline">Bank reconciliation</Link> page.
      </p>

      {!hasData ? (
        <p className="text-sage-500 text-sm mt-8">No outgoing bank transactions imported yet. Upload an ASB export on the Bank reconciliation page first.</p>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Money out" value={fmt(totalOut)} sub={`${debits.length} debits`} tone="out" />
            <Stat label="To reconcile" value={String(toReconcile)} tone={toReconcile ? 'warn' : 'ok'} />
            <Stat label="Paid, unconfirmed" value={String(paidUnconfirmed)} tone={paidUnconfirmed ? 'warn' : 'ok'} sub="remittances not yet bank-matched" />
          </div>

          <Panel icon={ArrowUpRight} title={`Outgoing payments — ${worklist.length} to reconcile`}>
            {worklist.length === 0 ? (
              <AllClear label="Every outgoing payment is matched to a remittance. Nothing to action." />
            ) : (
              <Table head={HEAD}>{worklist.map(renderRow)}</Table>
            )}
            {done.length > 0 && (
              <DoneSection count={done.length}>
                <Table head={HEAD}>{done.map(renderRow)}</Table>
              </DoneSection>
            )}
          </Panel>

          <p className="text-xs text-sage-400">
            Debits are matched to remittances by the reference stem in the memo (e.g. &ldquo;PAYROLL MARINA 220726&rdquo; → the Marina
            remittance), or by a unique amount near the payment date. Confirm a match to record a durable link and mark the remittance
            <span className="font-medium"> confirmed paid</span>. A debit files into <span className="font-medium">Done</span> once fully
            allocated. Reverse a match with the undo control if you mis-tied it.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'out' | 'ok' | 'warn' }) {
  return (
    <div className={clsx('rounded-xl border p-4', tone === 'warn' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className={clsx('text-xl font-bold mt-1 tabular-nums', tone === 'warn' ? 'text-amber-700' : 'text-sage-800')}>{value}</p>
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

function AllClear({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
      <CheckCircle2 size={16} className="shrink-0" /> {label}
    </div>
  )
}

function DoneSection({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <details className="mt-4 border-t border-gray-100 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-sage-500 hover:text-sage-700 select-none">Done · {count} reconciled or cleared</summary>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  )
}
