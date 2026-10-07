// Bank balance — the truthful "money in the account" figure for the dashboard.
//
// There is no live bank feed (Akahu is deferred). The honest source is ASB's
// own stated balance: every ASB CSV export carries a "Ledger Balance : X as of
// YYYYMMDD" line in its preamble. When a statement is imported for
// reconciliation, we capture that balance here — so the dashboard shows the
// bank's real number, not a figure summed from transactions (which would only
// be net movement over whatever range happens to be imported).
//
// Stored as a single portal_settings row (key 'bank_balance'). Read is staff;
// write is admin (via the reconcile import action, RLS-gated). The stored
// balance only ever moves FORWARD in time — importing an older statement never
// overwrites a newer balance with a stale one.

import type { SupabaseClient } from '@supabase/supabase-js'

export const BANK_BALANCE_KEY = 'bank_balance'

export interface BankBalance {
  /** ASB's stated ledger balance (GST-inclusive, as-is). */
  amount: number
  /** ISO date the balance was stated as of (from the CSV "as of"). */
  asAt: string
}

interface StoredBankBalance {
  amount?: unknown
  as_at?: unknown
}

/** Read the latest captured bank balance, or null if none has been imported yet. */
export async function getBankBalance(supabase: SupabaseClient): Promise<BankBalance | null> {
  const { data } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', BANK_BALANCE_KEY)
    .maybeSingle()

  const v = (data?.value ?? null) as StoredBankBalance | null
  if (!v || typeof v.amount !== 'number' || typeof v.as_at !== 'string' || !v.as_at) return null
  return { amount: v.amount, asAt: v.as_at }
}

/**
 * Persist a bank balance captured from an imported ASB CSV — but only if it is
 * at least as recent as the stored one. Returns the balance now in effect
 * (which may be the pre-existing newer one) and whether this call updated it.
 *
 * Idempotent and monotonic: re-importing the same statement is a no-op;
 * importing an older statement never regresses the dashboard figure.
 */
export async function saveBankBalanceFromImport(
  supabase: SupabaseClient,
  balance: BankBalance,
  userId: string | null,
): Promise<{ updated: boolean; effective: BankBalance }> {
  const current = await getBankBalance(supabase)
  // Strictly OLDER statement: keep what we have — importing an April export
  // must never drag the dashboard back to April's balance.
  //
  // A SAME-DAY statement always wins. It used to be rejected (`<=`), which
  // silently discarded the correct figure: export a statement in the morning,
  // export again that afternoon after more transactions clear, and the second
  // import kept the stale morning balance while reporting success. That is
  // exactly when a balance moves, and the later export is by definition the
  // more complete one — ASB restates the ledger balance in every export.
  if (current && balance.asAt < current.asAt) {
    return { updated: false, effective: current }
  }

  const { error } = await supabase
    .from('portal_settings')
    .upsert(
      {
        key: BANK_BALANCE_KEY,
        value: { amount: balance.amount, as_at: balance.asAt },
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: 'key' },
    )
  // A write failure (e.g. RLS) must not break the import — the transactions
  // still saved. Fall back to reporting whatever is currently stored.
  if (error) return { updated: false, effective: current ?? balance }
  return { updated: true, effective: balance }
}
