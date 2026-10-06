'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { parseAsbCsv } from '@/lib/asb-import'
import { saveBankBalanceFromImport } from '@/lib/bank-balance'
import { isFullyAllocated, round2 } from '@/lib/payment-allocation'
import { applyBankAllocation } from './_apply'
import { runAutoReconcile, type AutoReconcileSummary } from './_auto'

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
  /** Result of the automatic reconcile run straight after the import. */
  autoReconcile?: AutoReconcileSummary | null
  autoReconcileError?: string | null
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
    }

    // Revalidate the dashboard on EVERY import, not just when the balance moved
    // forward. An import always adds transactions, which shift the net position
    // and the reconciliation counts even when the ledger balance is unchanged —
    // and gating this on `res.updated` meant a re-import left a stale dashboard.
    // Reconcile whatever can be matched with certainty straight away, so only
    // the genuinely ambiguous payments are left for a human. Non-fatal: the
    // import itself has already succeeded.
    let autoReconcile: AutoReconcileSummary | null = null
    let autoReconcileError: string | null = null
    try {
      autoReconcile = await runAutoReconcile(supabase, user?.id ?? null)
    } catch (e) {
      autoReconcileError = e instanceof Error ? e.message : 'Auto-reconcile failed.'
    }

    revalidatePath('/portal')
    revalidatePath('/portal/finance/reconcile')
    revalidatePath('/portal/invoices')
    return {
      ok: true,
      autoReconcile,
      autoReconcileError,
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

    const res = await applyBankAllocation(supabase, {
      lineId,
      allocations,
      paidDate,
      method: 'manual',
      matchReason: null,
      userId: user?.id ?? null,
    })
    if (!res.ok) return res

    revalidatePath('/portal/finance/reconcile')
    return res
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}

/**
 * Run automatic reconciliation on demand: allocates every bank credit that
 * can be matched with certainty (reference, recurring / known payer, unique
 * bundle) and backfills the invoice link on lines cleared without one.
 * Ambiguous payments are left for the screen. Admin-gated.
 */
export async function autoReconcileBank(): Promise<{ ok: boolean; error?: string; summary?: AutoReconcileSummary }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }
    const summary = await runAutoReconcile(supabase, user?.id ?? null)
    revalidatePath('/portal/finance/reconcile')
    revalidatePath('/portal/invoices')
    revalidatePath('/portal')
    return { ok: true, summary }
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
