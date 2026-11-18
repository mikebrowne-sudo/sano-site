// Money-out auto-reconcile runner: load → propose (pure engine) → apply.
// Remittance matches go through the shared reconcile-out write path; every
// other match is recorded as a bank_debit_links row (and, for IRD payments /
// repeat bills, a new expense) and the bank line is cleared. Server-only
// helper — the calling server action checks isAdminUser.

import type { SupabaseClient } from '@supabase/supabase-js'
import { proposeDebitReconcile, payeeKeyOut, type OutKnownBill, type OutProposal } from '@/lib/auto-reconcile-out'
import { round2 } from '@/lib/payment-allocation'
import { SANO_ACCOUNT_NUMBER } from '@/lib/sano-bank-details'
import { applyRemittanceAllocation } from '../reconcile-out/_apply-remit'
import { canTransitionPayment, markPaidPatch } from '@/lib/payroll/pay-run-lifecycle'
import { ensureLiabilityLineForRun } from '@/lib/payroll/ird-liability-ledger'
import { getServiceSupabase } from '@/lib/supabase-service'

export interface AutoReconcileOutSummary {
  matched: number
  matchedAmount: number
  /** Expenses created for IRD payments / repeat bills. */
  createdExpenses: number
  needsReview: number
  /** Set when the bank_debit_links migration hasn't been run yet. */
  setupNeeded: string | null
  failures: string[]
}

type Rec = Record<string, unknown>
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? ((v[0] ?? null) as T | null) : ((v ?? null) as T | null))
const isMissingTable = (e: { code?: string } | null | undefined) => e?.code === '42P01' || e?.code === 'PGRST205'

export async function runAutoReconcileOut(supabase: SupabaseClient, userId: string | null): Promise<AutoReconcileOutSummary> {
  const summary: AutoReconcileOutSummary = { matched: 0, matchedAmount: 0, createdExpenses: 0, needsReview: 0, setupNeeded: null, failures: [] }

  const [txnsQ, remitsQ, itemsQ, rAllocQ, runsQ, expQ, linksQ, stripeFeeQ] = await Promise.all([
    supabase.from('bank_transactions').select('id, txn_date, amount, payee, memo').eq('direction', 'out').eq('cleared', false),
    supabase.from('contractor_remittances').select('id, remittance_number, reference, payee_label, payment_date'),
    supabase.from('contractor_remittance_items').select('remittance_id, amount'),
    supabase.from('remittance_payment_allocations').select('bank_transaction_id, remittance_id, amount_allocated').is('reversed_at', null),
    // Payout = net pay + mileage reimbursement (paid in the same transfer).
    // Draft/approved runs too: the bank line is the proof of payment
    // (automatic payments) — they match only when the bank names the employee.
    supabase.from('pay_runs').select('id, pay_date, status, payment_reference, pay_run_lines ( net_pay, mileage_reimbursement, contractors ( full_name ) )').eq('kind', 'employee').in('status', ['draft', 'approved', 'paid']),
    supabase.from('expenses').select('id, expense_date, amount, category, vendor, payment_reference, gst_inclusive'),
    supabase
      .from('bank_debit_links')
      .select('expense_id, pay_run_id, kind, bank_transactions ( payee ), expenses ( amount, category, vendor, gst_inclusive )')
      .is('reversed_at', null),
    // Stripe fees recorded against a Stripe payout (money in) — already
    // reconciled there; never match them to a debit. Errors (column not added
    // yet) just mean there are none.
    supabase.from('bank_transactions').select('fee_expense_id').not('fee_expense_id', 'is', null),
  ])
  const loadErr = [txnsQ, remitsQ, itemsQ, rAllocQ, runsQ, expQ].find((q) => q.error)?.error
  if (loadErr) throw new Error(`Money-out auto-reconcile load failed: ${loadErr.message}`)
  const linksReady = !linksQ.error
  if (linksQ.error && !isMissingTable(linksQ.error)) throw new Error(`Money-out auto-reconcile load failed: ${linksQ.error.message}`)
  if (!linksReady) summary.setupNeeded = 'Run docs/db/2026-10-07-bank-debit-links.sql to also auto-match expenses, pay runs, IRD payments and transfers.'

  const remitTotal = new Map<string, number>()
  for (const it of (itemsQ.data ?? []) as Rec[]) {
    const id = it.remittance_id as string
    remitTotal.set(id, round2((remitTotal.get(id) ?? 0) + Number(it.amount ?? 0)))
  }
  const allocByRemit = new Map<string, number>()
  const allocByTxn = new Map<string, number>()
  for (const a of (rAllocQ.data ?? []) as Rec[]) {
    const amt = Number(a.amount_allocated ?? 0)
    allocByRemit.set(a.remittance_id as string, (allocByRemit.get(a.remittance_id as string) ?? 0) + amt)
    allocByTxn.set(a.bank_transaction_id as string, (allocByTxn.get(a.bank_transaction_id as string) ?? 0) + amt)
  }

  const links = (linksReady ? linksQ.data ?? [] : []) as Rec[]
  const linkedExpense = new Set(links.map((l) => l.expense_id as string | null).filter(Boolean) as string[])
  for (const r of (stripeFeeQ.error ? [] : stripeFeeQ.data ?? []) as Rec[]) linkedExpense.add(r.fee_expense_id as string)
  const linkedPayRun = new Set(links.map((l) => l.pay_run_id as string | null).filter(Boolean) as string[])
  const knownBills: OutKnownBill[] = []
  for (const l of links) {
    const exp = one<{ amount: number; category: string | null; vendor: string | null; gst_inclusive: boolean | null }>(l.expenses)
    const payee = one<{ payee: string | null }>(l.bank_transactions)?.payee
    if (!exp?.category || !payee || exp.category === 'ird_payment') continue
    knownBills.push({ payeeKey: payeeKeyOut(payee), amount: Number(exp.amount), category: exp.category, vendor: exp.vendor, gstInclusive: exp.gst_inclusive !== false })
  }

  const debits = ((txnsQ.data ?? []) as Rec[])
    .filter((t) => Number(t.amount ?? 0) < 0 && t.txn_date)
    .map((t) => ({
      id: t.id as string,
      date: t.txn_date as string,
      amount: round2(Math.abs(Number(t.amount))),
      payee: (t.payee as string | null) ?? '',
      memo: (t.memo as string | null) ?? '',
      allocated: round2(allocByTxn.get(t.id as string) ?? 0),
    }))

  const { proposals, review } = proposeDebitReconcile({
    debits,
    remittances: ((remitsQ.data ?? []) as Rec[]).map((r) => ({
      id: r.id as string,
      number: (r.remittance_number as string | null) ?? '',
      reference: (r.reference as string | null) ?? null,
      payeeLabel: (r.payee_label as string | null) ?? null,
      paymentDate: (r.payment_date as string | null) ?? null,
      total: remitTotal.get(r.id as string) ?? 0,
      allocated: round2(allocByRemit.get(r.id as string) ?? 0),
    })),
    payRuns: linksReady
      ? ((runsQ.data ?? []) as Rec[]).map((p) => ({
          id: p.id as string,
          payDate: (p.pay_date as string | null) ?? null,
          net: round2(((p.pay_run_lines ?? []) as Array<{ net_pay: number | null; mileage_reimbursement: number | null }>)
            .reduce((s, l) => s + Number(l.net_pay ?? 0) + Number(l.mileage_reimbursement ?? 0), 0)),
          reference: (p.payment_reference as string | null) ?? null,
          linked: linkedPayRun.has(p.id as string),
          status: p.status as 'draft' | 'approved' | 'paid',
          // First names only: "Browne" is also the owner's surname.
          employeeNames: ((p.pay_run_lines ?? []) as Rec[])
            .map((l) => (one<{ full_name: string | null }>(l.contractors)?.full_name ?? '').trim().split(/\s+/)[0])
            .filter((n) => n.length >= 3),
        }))
      : [],
    expenses: linksReady
      ? ((expQ.data ?? []) as Rec[]).map((e) => ({
          id: e.id as string,
          date: (e.expense_date as string | null) ?? null,
          amount: Number(e.amount ?? 0),
          category: (e.category as string | null) ?? null,
          vendor: (e.vendor as string | null) ?? null,
          reference: (e.payment_reference as string | null) ?? null,
          gstInclusive: (e.gst_inclusive as boolean | null) ?? null,
          linked: linkedExpense.has(e.id as string),
        }))
      : [],
    ownAccount: SANO_ACCOUNT_NUMBER,
    knownBills,
  })

  const debitById = new Map(debits.map((d) => [d.id, d]))
  for (const p of proposals) {
    if (p.kind !== 'remittance' && !linksReady) continue
    const res = p.kind === 'remittance'
      ? await applyRemittanceAllocation(supabase, { bankTxnId: p.debitId, allocations: p.allocations, method: p.method, matchReason: p.reason, userId })
      : await applyDebitLink(supabase, p, debitById.get(p.debitId), userId)
    const d = debitById.get(p.debitId)
    if (!res.ok) {
      summary.failures.push(`${d?.date ?? ''} $${d?.amount ?? ''}: ${res.error}`)
      continue
    }
    summary.matched += 1
    summary.matchedAmount = round2(summary.matchedAmount + (d?.amount ?? 0))
    if (p.kind === 'created_expense') summary.createdExpenses += 1
  }
  summary.needsReview = review.length + (linksReady ? 0 : proposals.filter((p) => p.kind !== 'remittance').length)
  return summary
}

/** Record a non-remittance match: (create the expense,) link it, clear the line, audit. */
async function applyDebitLink(
  supabase: SupabaseClient,
  p: Exclude<OutProposal, { kind: 'remittance' }>,
  debit: { date: string; amount: number; payee: string; memo: string } | undefined,
  userId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!debit) return { ok: false, error: 'Bank line not found.' }
  if (p.kind === 'pay_run' && p.markPaid) {
    const r = await markPayRunPaidFromBank(supabase, p.payRunId, debit, userId)
    if (!r.ok) return r
  }
  let expenseId: string | null = p.kind === 'expense' ? p.expenseId : null

  if (p.kind === 'created_expense') {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        expense_date: debit.date,
        amount: p.amount,
        category: p.category,
        vendor: p.vendor,
        description: p.description,
        payment_reference: `${debit.payee} ${debit.memo}`.trim(),
        gst_inclusive: p.gstInclusive,
        notes: 'Recorded automatically from the bank line by auto-reconcile.',
        created_by: userId,
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: `Couldn't record the expense: ${error?.message ?? 'unknown'}` }
    expenseId = data.id as string
  }

  const { error: linkErr } = await supabase.from('bank_debit_links').insert({
    bank_transaction_id: p.debitId,
    kind: p.kind,
    expense_id: expenseId,
    pay_run_id: p.kind === 'pay_run' ? p.payRunId : null,
    amount: p.amount,
    method: 'auto',
    match_reason: p.reason,
    linked_by: userId,
  })
  if (linkErr) {
    // Roll back an expense we just created so a failed link never leaves an orphan.
    if (p.kind === 'created_expense' && expenseId) await supabase.from('expenses').delete().eq('id', expenseId)
    return { ok: false, error: (linkErr as { code?: string }).code === '23505' ? 'Already linked.' : linkErr.message }
  }

  const nowIso = new Date().toISOString()
  const { error: clrErr } = await supabase
    .from('bank_transactions')
    .update({ cleared: true, cleared_at: nowIso, cleared_by: userId })
    .eq('id', p.debitId)
  if (clrErr) return { ok: false, error: `Linked but clearing the line failed: ${clrErr.message}` }

  try {
    await supabase.from('audit_log').insert({
      actor_id: userId,
      actor_role: 'admin',
      action: 'bank.debit_auto_reconciled',
      entity_table: 'bank_transactions',
      entity_id: p.debitId,
      before: {},
      after: { kind: p.kind, expense_id: expenseId, pay_run_id: p.kind === 'pay_run' ? p.payRunId : null, amount: p.amount, match_reason: p.reason },
    })
  } catch (err) {
    console.warn('[auto-reconcile-out] audit insert failed:', err)
  }
  return { ok: true }
}

/**
 * The bank shows this pay run's money went out: approve it if still a draft
 * (which puts its PAYE on the IRD ledger), then mark it paid on the bank date.
 * Payday filing in myIR stays a separate, manual step.
 */
async function markPayRunPaidFromBank(
  supabase: SupabaseClient,
  payRunId: string,
  debit: { date: string; payee: string; memo: string },
  userId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { data: run } = await supabase.from('pay_runs').select('status').eq('id', payRunId).single()
  if (!run) return { ok: false, error: 'Pay run not found.' }
  const nowIso = new Date().toISOString()

  if (run.status === 'draft') {
    const t = canTransitionPayment('draft', 'approved')
    if (!t.ok) return { ok: false, error: t.reason }
    const { error } = await supabase.from('pay_runs')
      .update({ status: 'approved', approved_at: nowIso, approved_by: userId })
      .eq('id', payRunId).eq('status', 'draft')
    if (error) return { ok: false, error: `Couldn't approve the pay run: ${error.message}` }
  } else if (run.status !== 'approved') {
    return { ok: true } // already paid — just link
  }

  // Ledger the PAYE (service role — the ledger is SELECT-only under RLS).
  try {
    const res = await ensureLiabilityLineForRun(getServiceSupabase(), payRunId)
    if (res.skipped && res.skipped !== 'already_ledgered') console.error('[auto-reconcile-out] IRD liability not created:', res.skipped)
  } catch (e) {
    console.error('[auto-reconcile-out] IRD liability not created:', e instanceof Error ? e.message : e)
  }

  const reference = (debit.memo || debit.payee).trim()
  const method = /A\/P/i.test(`${debit.payee} ${debit.memo}`) ? 'automatic payment' : 'bank transfer'
  const { error } = await supabase.from('pay_runs')
    .update(markPaidPatch({ paymentDate: debit.date, paymentReference: reference, paymentMethod: method }, nowIso, userId))
    .eq('id', payRunId).eq('status', 'approved')
  if (error) return { ok: false, error: `Couldn't mark the pay run paid: ${error.message}` }

  try {
    await supabase.from('audit_log').insert({
      entity_table: 'pay_runs', entity_id: payRunId, action: 'pay_run_marked_paid',
      detail: `Marked paid from the bank feed: ${reference} on ${debit.date} (${method}). Payday filing + IRD payment remain separate.`,
      performed_by: userId,
    })
  } catch { /* audit shape varies */ }
  return { ok: true }
}
