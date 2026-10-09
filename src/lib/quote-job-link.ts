// Keep a quote's status in step with the job made from it when that job is
// archived or restored.
//
// Converting a quote to a job sets the quote to 'converted', which hides its
// actions and blocks converting it again. If the job is then archived (or
// marked as test), the quote was left 'converted' with no live job — stuck:
// no job chip, no way to re-convert. Now:
//   • archiving the quote's only live job → quote back to 'accepted'
//   • restoring it → quote back to 'converted'
// A quote that still has another live job or invoice is left alone.

import type { SupabaseClient } from '@supabase/supabase-js'

async function audit(supabase: SupabaseClient, quoteId: string, from: string, to: string, jobId: string) {
  await supabase.from('audit_log').insert({
    actor_id: null,
    actor_role: 'system',
    action: 'quote.status-changed',
    entity_table: 'quotes',
    entity_id: quoteId,
    before: { status: from },
    after: { status: to, source: to === 'accepted' ? 'job_archived' : 'job_restored', job_id: jobId },
  })
}

export async function releaseQuotesForArchivedJobs(supabase: SupabaseClient, jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return
  const { data: jobs } = await supabase.from('jobs').select('id, quote_id').in('id', jobIds).not('quote_id', 'is', null)
  for (const j of (jobs ?? []) as Array<{ id: string; quote_id: string }>) {
    const [{ count: liveJobs }, { count: liveInvoices }] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('quote_id', j.quote_id).is('deleted_at', null),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('quote_id', j.quote_id).is('deleted_at', null),
    ])
    if ((liveJobs ?? 0) > 0 || (liveInvoices ?? 0) > 0) continue
    const { data: changed } = await supabase
      .from('quotes').update({ status: 'accepted' }).eq('id', j.quote_id).eq('status', 'converted').select('id')
    if ((changed ?? []).length > 0) await audit(supabase, j.quote_id, 'converted', 'accepted', j.id)
  }
}

export async function reclaimQuotesForRestoredJobs(supabase: SupabaseClient, jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return
  const { data: jobs } = await supabase.from('jobs').select('id, quote_id, deleted_at').in('id', jobIds).not('quote_id', 'is', null)
  for (const j of (jobs ?? []) as Array<{ id: string; quote_id: string; deleted_at: string | null }>) {
    if (j.deleted_at) continue
    const { data: changed } = await supabase
      .from('quotes').update({ status: 'converted' }).eq('id', j.quote_id).eq('status', 'accepted').select('id')
    if ((changed ?? []).length > 0) await audit(supabase, j.quote_id, 'accepted', 'converted', j.id)
  }
}
