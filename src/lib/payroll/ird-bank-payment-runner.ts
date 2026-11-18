// Server helper: record IRD payments seen on the bank feed against the PAYE
// ledger. Runs after every bank import / auto-reconcile and from the IRD page's
// sync button. Idempotent — each bank line is applied at most once
// (ird_liability_payments.bank_transaction_id). Pass the SERVICE-ROLE client:
// the ledger tables are SELECT-only under RLS.

import { IRD_FEE_RE, IRD_RE } from '@/lib/auto-reconcile-out'
import { allocateIrdBankPayment, type IrdLedgerLine } from './ird-bank-payment'

export interface IrdBankPaymentSummary {
  recorded: number
  recordedAmount: number
  /** Manual entries on the IRD page that this run tied to their bank line. */
  linkedManual: number
  setupNeeded: string | null
  failures: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any
type Rec = Record<string, unknown>

const MANUAL_MATCH_DAYS = 10
const cents = (n: number) => Math.round(n * 100)
const days = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000

export async function applyIrdBankPayments(client: AnyClient): Promise<IrdBankPaymentSummary> {
  const summary: IrdBankPaymentSummary = { recorded: 0, recordedAmount: 0, linkedManual: 0, setupNeeded: null, failures: [] }

  const [linesQ, payQ] = await Promise.all([
    client.from('ird_liability_lines').select('ird_liability_id, payday, total_payable'),
    client.from('ird_liability_payments').select('id, ird_liability_id, payment_date, amount, bank_transaction_id'),
  ])
  if (payQ.error) {
    if (payQ.error.code === '42703') { summary.setupNeeded = 'Run docs/db/2026-11-18-ird-payment-bank-link.sql to record IRD payments from the bank automatically.'; return summary }
    throw new Error(`IRD ledger load failed: ${payQ.error.message}`)
  }
  if (linesQ.error) throw new Error(`IRD ledger load failed: ${linesQ.error.message}`)

  const lines: IrdLedgerLine[] = ((linesQ.data ?? []) as Rec[]).map((l) => ({
    liabilityId: l.ird_liability_id as string, payday: l.payday as string, payable: Number(l.total_payable ?? 0),
  }))
  if (lines.length === 0) return summary
  const firstPayday = lines.reduce((m, l) => (l.payday < m ? l.payday : m), lines[0].payday)

  const payments = (payQ.data ?? []) as Rec[]
  const applied = new Set(payments.map((p) => p.bank_transaction_id as string | null).filter(Boolean) as string[])
  const paid: Record<string, number> = {}
  for (const p of payments) paid[p.ird_liability_id as string] = (paid[p.ird_liability_id as string] ?? 0) + Number(p.amount ?? 0)
  const manual = payments.filter((p) => !p.bank_transaction_id)

  const { data: txns, error: txErr } = await client
    .from('bank_transactions')
    .select('id, txn_date, amount, payee, memo')
    .eq('direction', 'out')
    .gte('txn_date', firstPayday)
  if (txErr) throw new Error(`IRD ledger load failed: ${txErr.message}`)

  let pending = ((txns ?? []) as Rec[])
    .filter((t) => Number(t.amount ?? 0) < 0 && !applied.has(t.id as string))
    .map((t) => ({ id: t.id as string, date: t.txn_date as string, amount: Math.abs(Number(t.amount)), text: `${t.payee ?? ''} ${t.memo ?? ''}`.trim() }))
    .filter((t) => IRD_RE.test(t.text) && !IRD_FEE_RE.test(t.text))
    .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount)

  // Several passes: a payment that can't land yet may fit once an earlier one has.
  for (let pass = 0; pass < 4 && pending.length; pass++) {
    const next: typeof pending = []
    for (const t of pending) {
      // 1. Already entered by hand on the IRD page? Tie it to this bank line.
      const m = manual
        .filter((p) => cents(Number(p.amount)) === cents(t.amount) && days(p.payment_date as string, t.date) <= MANUAL_MATCH_DAYS)
        .sort((a, b) => days(a.payment_date as string, t.date) - days(b.payment_date as string, t.date))[0]
      if (m) {
        const { error } = await client.from('ird_liability_payments').update({ bank_transaction_id: t.id }).eq('id', m.id)
        if (error) { summary.failures.push(`${t.date} $${t.amount.toFixed(2)}: ${error.message}`); continue }
        manual.splice(manual.indexOf(m), 1)
        summary.linkedManual += 1
        continue
      }
      // 2. Settles the oldest unpaid payday(s) exactly?
      const alloc = allocateIrdBankPayment({ lines, paidByLiability: paid, amount: t.amount, paymentDate: t.date })
      if (!alloc) { next.push(t); continue }
      const { error } = await client.from('ird_liability_payments').insert(alloc.map((a) => ({
        ird_liability_id: a.liabilityId,
        payment_date: t.date,
        amount: a.amount,
        ird_reference: t.text.slice(0, 200),
        notes: 'Recorded automatically from the bank feed.',
        bank_transaction_id: t.id,
      })))
      if (error) { summary.failures.push(`${t.date} $${t.amount.toFixed(2)}: ${error.message}`); continue }
      for (const a of alloc) paid[a.liabilityId] = (paid[a.liabilityId] ?? 0) + a.amount
      summary.recorded += 1
      summary.recordedAmount = Math.round((summary.recordedAmount + t.amount) * 100) / 100
    }
    if (next.length === pending.length) break
    pending = next
  }
  return summary
}
