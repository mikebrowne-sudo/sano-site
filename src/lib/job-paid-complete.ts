// When an invoice is marked paid, the linked job is paid work — so it
// should automatically be "complete": stamp a completion date (if it
// doesn't already have one) and set the job's payment_status to paid.
//
// Idempotent: an existing completed_at / started_at is preserved. Status
// is left untouched (a paid job is already invoiced, the terminal
// lifecycle state). Called from both the Stripe webhook and the manual
// "Mark paid" action.

import type { SupabaseClient } from '@supabase/supabase-js'

export async function stampJobCompleteOnPaidInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { data: inv } = await supabase
    .from('invoices')
    .select('job_id')
    .eq('id', invoiceId)
    .maybeSingle()

  const jobId = (inv?.job_id as string | null | undefined) ?? null
  if (!jobId) return

  const { data: job } = await supabase
    .from('jobs')
    .select('id, completed_at, started_at, scheduled_date, created_at')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return

  const fallback = (job.scheduled_date as string | null) ?? (job.created_at as string)
  const completedAt = (job.completed_at as string | null) ?? fallback
  const startedAt = (job.started_at as string | null) ?? completedAt

  await supabase
    .from('jobs')
    .update({
      completed_at: completedAt,
      started_at: startedAt,
      payment_status: 'paid',
    })
    .eq('id', jobId)
}
