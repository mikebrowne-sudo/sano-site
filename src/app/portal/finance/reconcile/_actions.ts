'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { parseAsbCsv } from '@/lib/asb-import'
import { saveBankBalanceFromImport } from '@/lib/bank-balance'
import {
  validateAllocation,
  isFullyAllocated,
  round2,
  type AllocationContext,
  type ProposedAllocation,
} from '@/lib/payment-allocation'

export interface ImportResponse {
  ok: boolean
  error?: string
  newCount?: number
  dupCount?: number
  account?: string | null
  fromDate?: string | null
  toDate?: string | null
  skipped?: number
  /** ASB ledger balance captured from this CSV, and whether it updated the stored figure. */
  bankBalance?: number | null
  bankBalanceDate?: string | null
  bankBalanceUpdated?: boolean
}

/**
 * Parse an ASB CSV and persist its transactions. Idempotent: rows whose ASB
 * Unique Id already exist are ignored, so re-uploading an overlapping export
 * never duplicates. Zero-value lines (e.g. the opening CREDIT 0) are dropped.
 */
export async function importTransactions(csvText: string): Promise<ImportResponse> {
  // Everything is wrapped so an unexpected error returns a readable message
  // rather than throwing out of the Server Action (which surfaces to the
  // browser as a blank "client-side exception").
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }
    if (!csvText || csvText.trim().length === 0) return { ok: false, error: 'The file was empty.' }

    const parsed = parseAsbCsv(csvText)
    const rows = parsed.transactions
      .filter((t) => t.amount !== 0 && t.uniqueId)
      .map((t) => ({
        unique_id: t.uniqueId,
        account: parsed.account,
        txn_date: t.date || null,
        tran_type: t.type || null,
        payee: t.payee || null,
        memo: t.memo || null,
        amount: t.amount,
        direction: t.direction,
        imported_by: user?.id ?? null,
      }))

    if (rows.length === 0) {
      return { ok: false, error: 'No transactions found — is this an ASB CSV export?' }
    }

    // Which unique_ids already exist (so we can report new vs duplicate).
    const ids = rows.map((r) => r.unique_id)
    const { data: existing, error: selErr } = await supabase
      .from('bank_transactions')
      .select('unique_id')
      .in('unique_id', ids)
    if (selErr) return { ok: false, error: selErr.message }
    const existingSet = new Set((existing ?? []).map((e) => e.unique_id as string))
    const fresh = rows.filter((r) => !existingSet.has(r.unique_id))

    if (fresh.length > 0) {
      const { error } = await supabase.from('bank_transactions').insert(fresh)
      if (error) return { ok: false, error: error.message }
    }

    // Capture ASB's stated ledger balance for the dashboard. Monotonic: an
    // older statement never overwrites a newer balance. Non-fatal if it can't
    // save — the transactions are already in.
    let bankBalance: number | null = null
    let bankBalanceDate: string | null = null
    let bankBalanceUpdated = false
    if (parsed.ledgerBalance != null && parsed.ledgerBalanceDate) {
      const res = await saveBankBalanceFromImport(
        supabase,
        { amount: parsed.ledgerBalance, asAt: parsed.ledgerBalanceDate },
        user?.id ?? null,
      )
      bankBalance = res.effective.amount
      bankBalanceDate = res.effective.asAt
      bankBalanceUpdated = res.updated
      if (res.updated) revalidatePath('/portal')
    }

    revalidatePath('/portal/finance/reconcile')
    return {
      ok: true,
      newCount: fresh.length,
      dupCount: rows.length - fresh.length,
      account: parsed.account,
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      skipped: parsed.skipped,
      bankBalance,
      bankBalanceDate,
      bankBalanceUpdated,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error importing the file.' }
  }
}

/**
 * Match a bank credit to one or more invoices: mark any not-yet-paid selected
 * invoices as paid (with the bank line's date), then clear the bank line.
 * Already-paid invoices in the selection are left untouched — selecting them
 * just confirms the bundle. Admin-gated; the operator confirms the selection.
 */
export async function matchCreditToInvoices(
  lineId: string,
  invoiceIds: string[],
  paidDate: string | null,
): Promise<{ ok: boolean; error?: string; markedPaid?: number }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }
    if (!invoiceIds.length) return { ok: false, error: 'Select at least one invoice.' }

    const date = paidDate || new Date().toISOString().slice(0, 10)

    // Mark the unpaid ones paid. (.neq skips any already-paid so we never
    // overwrite an existing paid date.)
    const { data: updated, error: invErr } = await supabase
      .from('invoices')
      .update({ status: 'paid', date_paid: date })
      .in('id', invoiceIds)
      .neq('status', 'paid')
      .select('id')
    if (invErr) return { ok: false, error: invErr.message }

    const { error: clrErr } = await supabase
      .from('bank_transactions')
      .update({ cleared: true, cleared_at: new Date().toISOString(), cleared_by: user?.id ?? null })
      .eq('id', lineId)
    if (clrErr) return { ok: false, error: clrErr.message }

    revalidatePath('/portal/finance/reconcile')
    return { ok: true, markedPaid: updated?.length ?? 0 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}

export interface AllocationInput {
  invoiceId: string
  amount: number
}

/**
 * Durably reconcile a bank credit to one or more invoices by recording payment
 * ALLOCATIONS (invoice_payment_allocations). Supports partial / split
 * allocations. This is the correct replacement for the old cleared-only flow:
 *   - creates a live allocation row per invoice (the durable bank↔invoice link)
 *   - re-validates against current live allocations (no double-allocation of
 *     the same money, no over-allocating an invoice or the payment)
 *   - marks any not-yet-paid target invoices as paid (already-paid invoices,
 *     e.g. INV-26022, STAY paid — only the allocation is recorded)
 *   - marks the bank line cleared once it is fully allocated
 *   - writes an audit_log row
 * Admin-gated. The DB also enforces amount>0 and one-live-allocation-per-pair.
 */
export async function reconcileBankTransaction(
  lineId: string,
  allocations: AllocationInput[],
  paidDate: string | null,
): Promise<{ ok: boolean; error?: string; allocated?: number; markedPaid?: number; cleared?: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }
    if (!allocations.length) return { ok: false, error: 'Select at least one invoice to allocate to.' }

    // Load the bank line.
    const { data: line, error: lineErr } = await supabase
      .from('bank_transactions')
      .select('id, amount, direction')
      .eq('id', lineId)
      .single()
    if (lineErr || !line) return { ok: false, error: `Bank transaction not found: ${lineErr?.message ?? 'missing'}` }
    if ((line.direction as string) !== 'in') {
      return { ok: false, error: 'Only incoming payments can be allocated to invoices.' }
    }
    const txnAmount = round2(Math.abs(Number(line.amount ?? 0)))

    const invoiceIds = allocations.map((a) => a.invoiceId)

    // Load the target invoices + all LIVE allocations that affect the balances
    // we're about to validate (this bank line, and the target invoices).
    const [{ data: invRows, error: invErr }, { data: liveTxnAllocs }, { data: liveInvAllocs }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, status, base_price, discount, invoice_items ( price )')
        .in('id', invoiceIds)
        .is('deleted_at', null),
      supabase
        .from('invoice_payment_allocations')
        .select('amount_allocated')
        .eq('bank_transaction_id', lineId)
        .is('reversed_at', null),
      supabase
        .from('invoice_payment_allocations')
        .select('invoice_id, amount_allocated')
        .in('invoice_id', invoiceIds)
        .is('reversed_at', null),
    ])
    if (invErr) return { ok: false, error: invErr.message }
    if (!invRows || invRows.length !== invoiceIds.length) {
      return { ok: false, error: 'One or more selected invoices could not be found.' }
    }

    const transactionAllocated = round2(
      ((liveTxnAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
    )
    const allocatedByInvoice = new Map<string, number>()
    for (const r of (liveInvAllocs ?? []) as Array<{ invoice_id: string; amount_allocated: number }>) {
      allocatedByInvoice.set(r.invoice_id, round2((allocatedByInvoice.get(r.invoice_id) ?? 0) + Number(r.amount_allocated ?? 0)))
    }

    const invoiceTotals = new Map<string, { total: number; status: string; number: string }>()
    const ctxInvoices: AllocationContext['invoices'] = {}
    for (const i of invRows as Array<Record<string, unknown>>) {
      const items = (i.invoice_items ?? []) as Array<{ price: number }>
      const addons = items.reduce((s, it) => s + (it.price ?? 0), 0)
      const total = round2(Number(i.base_price ?? 0) + addons - Number(i.discount ?? 0))
      const id = i.id as string
      invoiceTotals.set(id, { total, status: (i.status as string) ?? 'draft', number: (i.invoice_number as string) ?? '' })
      ctxInvoices[id] = { total, allocated: allocatedByInvoice.get(id) ?? 0 }
    }

    const proposed: ProposedAllocation[] = allocations.map((a) => ({ invoiceId: a.invoiceId, amount: round2(a.amount) }))
    const ctx: AllocationContext = { transactionAmount: txnAmount, transactionAllocated, invoices: ctxInvoices }
    const check = validateAllocation(ctx, proposed)
    if (!check.ok) return { ok: false, error: check.error }

    // Insert the allocation rows. The DB partial-unique index also guards
    // against a concurrent duplicate for the same (txn, invoice) pair.
    const nowIso = new Date().toISOString()
    const { error: insErr } = await supabase.from('invoice_payment_allocations').insert(
      proposed.map((p) => ({
        bank_transaction_id: lineId,
        invoice_id: p.invoiceId,
        amount_allocated: p.amount,
        method: 'manual',
        reconciled_at: nowIso,
        reconciled_by: user?.id ?? null,
      })),
    )
    if (insErr) {
      // 23505 = unique_violation on uq_ipa_live_pair.
      if ((insErr as { code?: string }).code === '23505') {
        return { ok: false, error: 'One of these invoices is already allocated to this payment. Reverse it first to re-allocate.' }
      }
      return { ok: false, error: insErr.message }
    }

    // Mark any not-yet-paid target invoices paid (already-paid stay as-is).
    const date = paidDate || new Date().toISOString().slice(0, 10)
    const unpaidIds = Array.from(invoiceTotals.entries()).filter(([, v]) => v.status !== 'paid').map(([id]) => id)
    let markedPaid = 0
    if (unpaidIds.length > 0) {
      const { data: upd, error: updErr } = await supabase
        .from('invoices')
        .update({ status: 'paid', date_paid: date })
        .in('id', unpaidIds)
        .neq('status', 'paid')
        .select('id')
      if (updErr) return { ok: false, error: `Allocations saved but marking invoices paid failed: ${updErr.message}` }
      markedPaid = upd?.length ?? 0
    }

    // Clear the bank line once fully allocated.
    const proposedSum = round2(proposed.reduce((s, p) => s + p.amount, 0))
    const fully = isFullyAllocated(txnAmount, round2(transactionAllocated + proposedSum))
    if (fully) {
      const { error: clrErr } = await supabase
        .from('bank_transactions')
        .update({ cleared: true, cleared_at: nowIso, cleared_by: user?.id ?? null })
        .eq('id', lineId)
      if (clrErr) return { ok: false, error: `Allocations saved but clearing the line failed: ${clrErr.message}` }
    }

    // Audit — one row summarising the reconciliation.
    try {
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null,
        actor_role: 'admin',
        action: 'bank.reconciled',
        entity_table: 'bank_transactions',
        entity_id: lineId,
        before: {},
        after: {
          allocations: proposed.map((p) => ({ invoice: invoiceTotals.get(p.invoiceId)?.number, amount: p.amount })),
          marked_paid: markedPaid,
          cleared: fully,
        },
      })
    } catch (err) {
      console.warn('[reconcile] audit insert failed:', err)
    }

    revalidatePath('/portal/finance/reconcile')
    return { ok: true, allocated: proposed.length, markedPaid, cleared: fully }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}

/**
 * Reverse a single live allocation (soft — the row stays for audit). If the
 * bank line was cleared and reversing this drops it below fully-allocated, the
 * cleared flag is lifted so it re-appears for reconciliation. The invoice's
 * paid status is intentionally left as-is (reversing an allocation is a
 * bank-side correction, not an un-payment — flip the invoice separately if it
 * truly wasn't paid).
 */
export async function reverseAllocation(
  allocationId: string,
  reason: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }

    const { data: alloc, error: aErr } = await supabase
      .from('invoice_payment_allocations')
      .select('id, bank_transaction_id, invoice_id, amount_allocated, reversed_at')
      .eq('id', allocationId)
      .single()
    if (aErr || !alloc) return { ok: false, error: `Allocation not found: ${aErr?.message ?? 'missing'}` }
    if (alloc.reversed_at) return { ok: false, error: 'This allocation has already been reversed.' }

    const nowIso = new Date().toISOString()
    const { error: revErr } = await supabase
      .from('invoice_payment_allocations')
      .update({ reversed_at: nowIso, reversed_by: user?.id ?? null, reversal_reason: reason || null })
      .eq('id', allocationId)
      .is('reversed_at', null)
    if (revErr) return { ok: false, error: revErr.message }

    // Re-evaluate the bank line: if it's no longer fully allocated, un-clear it.
    const lineId = alloc.bank_transaction_id as string
    const { data: line } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', lineId)
      .single()
    const { data: remainingAllocs } = await supabase
      .from('invoice_payment_allocations')
      .select('amount_allocated')
      .eq('bank_transaction_id', lineId)
      .is('reversed_at', null)
    const txnAmount = round2(Math.abs(Number(line?.amount ?? 0)))
    const stillAllocated = round2(
      ((remainingAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
    )
    if (!isFullyAllocated(txnAmount, stillAllocated)) {
      await supabase
        .from('bank_transactions')
        .update({ cleared: false, cleared_at: null, cleared_by: null })
        .eq('id', lineId)
    }

    try {
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null,
        actor_role: 'admin',
        action: 'bank.allocation_reversed',
        entity_table: 'invoice_payment_allocations',
        entity_id: allocationId,
        before: { amount: Number(alloc.amount_allocated ?? 0), invoice_id: alloc.invoice_id, bank_transaction_id: lineId },
        after: { reversal_reason: reason || null },
      })
    } catch (err) {
      console.warn('[reconcile] reversal audit insert failed:', err)
    }

    revalidatePath('/portal/finance/reconcile')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}

/** Toggle the user-controlled "cleared" flag on a stored bank line. */
export async function setCleared(id: string, cleared: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }

  const { error } = await supabase
    .from('bank_transactions')
    .update({ cleared, cleared_at: cleared ? new Date().toISOString() : null, cleared_by: cleared ? user?.id ?? null : null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/portal/finance/reconcile')
  return { ok: true }
}
