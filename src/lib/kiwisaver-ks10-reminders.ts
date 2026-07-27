// KS10 → IRD reminder. When an employer-received KS10 opt-out is recorded
// (kiwisaver_ks10_received_date set), Sano must forward it to IRD by its next
// payday filing (IR348) — see the KS10 form. This surfaces any KS10 not yet
// marked submitted-to-IRD, so it can't slip past the cutoff. Clears once
// kiwisaver_optout_submitted_to_ird_date is set.

export interface PendingKs10 {
  id: string
  fullName: string
  ks10ReceivedDate: string | null
  ks10SignedDate: string | null
  daysOutstanding: number | null
}

/** Whole days between a received date and `today` (both 'YYYY-MM-DD'). */
export function ks10DaysOutstanding(receivedDate: string | null, today: string): number | null {
  if (!receivedDate) return null
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${receivedDate}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.floor(ms / 86_400_000))
}

/** Urgency for styling — amber while it's fresh, red once it's been sitting. */
export function ks10Urgency(daysOutstanding: number | null): 'due' | 'overdue' {
  return (daysOutstanding ?? 0) > 5 ? 'overdue' : 'due'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/**
 * Employees with a KS10 received but NOT yet submitted to IRD. Excludes the
 * IRD-managed route (which IRD processes directly — nothing for Sano to send).
 */
export async function loadPendingKs10Submissions(client: AnyClient, today: string): Promise<PendingKs10[]> {
  const { data } = await client
    .from('contractors')
    .select('id, full_name, kiwisaver_ks10_received_date, kiwisaver_ks10_signed_date')
    .eq('worker_type', 'employee')
    .not('kiwisaver_ks10_received_date', 'is', null)
    .is('kiwisaver_optout_submitted_to_ird_date', null)
  return ((data ?? []) as Array<{ id: string; full_name: string; kiwisaver_ks10_received_date: string | null; kiwisaver_ks10_signed_date: string | null }>)
    .map((r) => ({
      id: r.id,
      fullName: r.full_name,
      ks10ReceivedDate: r.kiwisaver_ks10_received_date,
      ks10SignedDate: r.kiwisaver_ks10_signed_date,
      daysOutstanding: ks10DaysOutstanding(r.kiwisaver_ks10_received_date, today),
    }))
    .sort((a, b) => (b.daysOutstanding ?? 0) - (a.daysOutstanding ?? 0))
}
