'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { parseAsbCsv } from '@/lib/asb-import'

export interface ImportResponse {
  ok: boolean
  error?: string
  newCount?: number
  dupCount?: number
  account?: string | null
  fromDate?: string | null
  toDate?: string | null
  skipped?: number
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

    revalidatePath('/portal/finance/reconcile')
    return {
      ok: true,
      newCount: fresh.length,
      dupCount: rows.length - fresh.length,
      account: parsed.account,
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      skipped: parsed.skipped,
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
