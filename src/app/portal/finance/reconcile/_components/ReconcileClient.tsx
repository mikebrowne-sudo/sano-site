'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Upload, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { reconcileUpload, type ReconcileResponse } from '../_actions'
import type { CreditStatus, DebitStatus } from '@/lib/bank-reconcile'
import clsx from 'clsx'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

const CREDIT_LABEL: Record<CreditStatus, string> = {
  reconciled: 'Reconciled',
  unpaid_match: 'Not marked paid',
  amount_match: 'Likely match',
  financing: 'Owner / transfer',
  unmatched: 'No match',
}
const CREDIT_TONE: Record<CreditStatus, string> = {
  reconciled: 'bg-emerald-50 text-emerald-700',
  unpaid_match: 'bg-amber-50 text-amber-700',
  amount_match: 'bg-amber-50 text-amber-700',
  financing: 'bg-sage-100 text-sage-600',
  unmatched: 'bg-red-50 text-red-700',
}
const DEBIT_LABEL: Record<DebitStatus, string> = { recorded: 'Recorded', not_recorded: 'Not recorded' }
const DEBIT_TONE: Record<DebitStatus, string> = {
  recorded: 'bg-emerald-50 text-emerald-700',
  not_recorded: 'bg-amber-50 text-amber-700',
}

export function ReconcileClient() {
  const [resp, setResp] = useState<ReconcileResponse | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      startTransition(async () => {
        const r = await reconcileUpload(text)
        if (!r.ok) { setError(r.error ?? 'Could not read the file.'); setResp(null); return }
        setResp(r)
      })
    }
    reader.onerror = () => setError('Could not read the file.')
    reader.readAsText(file)
  }

  const s = resp?.result?.summary

  return (
    <div>
      {/* Upload */}
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-sage-200 rounded-xl py-10 px-4 cursor-pointer hover:border-sage-300 hover:bg-sage-50/50 transition-colors text-center">
        <Upload size={22} className="text-sage-400" />
        <span className="text-sm font-medium text-sage-700">{fileName ?? 'Choose your ASB CSV export'}</span>
        <span className="text-xs text-sage-400">Account → Export → CSV. Nothing is saved — this is a read-only check.</span>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      </label>

      {isPending && <p className="text-sm text-sage-500 mt-4">Reading transactions…</p>}
      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 mt-4">{error}</p>}

      {resp?.ok && s && (
        <div className="mt-8 space-y-8">
          {/* Summary */}
          <div>
            <p className="text-sm text-sage-500 mb-3">
              {resp.account ? `${resp.account} · ` : ''}{resp.fromDate} – {resp.toDate}
              {resp.skipped ? ` · ${resp.skipped} line${resp.skipped !== 1 ? 's' : ''} skipped` : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Money in" value={fmt(s.totalIn)} tone="in" sub={`${s.creditCount} credits`} />
              <Stat label="Money out" value={fmt(s.totalOut)} tone="out" sub={`${s.debitCount} debits`} />
              <Stat label="Invoices to mark paid" value={String(s.invoicesToMarkPaid)} tone={s.invoicesToMarkPaid ? 'warn' : 'ok'} />
              <Stat label="Debits to record" value={String(s.debitsToRecord)} tone={s.debitsToRecord ? 'warn' : 'ok'} />
            </div>
          </div>

          {/* Credits */}
          <Panel icon={ArrowDownLeft} title={`Money in — credits (${resp.result!.credits.length})`}>
            <Table head={['Date', 'From', 'Reference', 'Status', 'Amount', '']}>
              {resp.result!.credits.map((c, i) => (
                <tr key={`${c.txn.uniqueId}-${i}`} className="border-b border-gray-50">
                  <Td>{c.txn.date}</Td>
                  <Td className="max-w-[200px] truncate" title={c.txn.payee}>{c.txn.payee}</Td>
                  <Td className="text-sage-500">{c.invoice?.invoiceNumber ?? c.txn.memo}</Td>
                  <Td><Badge tone={CREDIT_TONE[c.status]}>{CREDIT_LABEL[c.status]}</Badge></Td>
                  <Td className="text-right font-medium">{fmt(c.txn.amount)}</Td>
                  <Td className="text-right">
                    {(c.status === 'unpaid_match' || c.status === 'amount_match') && c.invoice && (
                      <Link href={`/portal/invoices/${c.invoice.id}`} className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap">Mark paid →</Link>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Panel>

          {/* Debits */}
          <Panel icon={ArrowUpRight} title={`Money out — debits (${resp.result!.debits.length})`}>
            <Table head={['Date', 'Detail', 'Status', 'Amount', '']}>
              {resp.result!.debits.map((d, i) => (
                <tr key={`${d.txn.uniqueId}-${i}`} className="border-b border-gray-50">
                  <Td>{d.txn.date}</Td>
                  <Td className="max-w-[260px] truncate" title={d.txn.memo || d.txn.payee}>{d.txn.memo || d.txn.payee}</Td>
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
                </tr>
              ))}
            </Table>
          </Panel>

          <p className="text-xs text-sage-400">
            Matching is automatic and best-effort: credits tie to invoices by the INV-number in the memo, or by a unique amount;
            debits tie to expenses by amount and date. Always eyeball a suggested match before acting. Owner contributions and
            internal transfers are flagged as “Owner / transfer”, not income.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'in' | 'out' | 'ok' | 'warn' }) {
  return (
    <div className={clsx(
      'rounded-xl border p-4',
      tone === 'in' ? 'bg-emerald-50 border-emerald-100' : tone === 'warn' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm',
    )}>
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
          {head.map((h, i) => <th key={i} className={clsx('px-3 py-2 font-semibold', (h === 'Amount') && 'text-right')}>{h}</th>)}
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
