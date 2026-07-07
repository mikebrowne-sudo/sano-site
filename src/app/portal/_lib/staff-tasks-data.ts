// Loads the live counts behind the staff action-centre checklist.
// Cheap count queries + one pay-approval reconciliation (completed-job
// workers that don't yet have a non-void payable).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StaffTaskCounts } from '@/lib/staff-tasks'

export async function loadStaffTaskCounts(supabase: SupabaseClient): Promise<StaffTaskCounts> {
  const today = new Date().toISOString().slice(0, 10)

  const [remSend, remPay, draftInv, sentInv, unassigned, jwRes, ciRes] = await Promise.all([
    supabase.from('contractor_remittances').select('*', { count: 'exact', head: true }).is('sent_at', null),
    supabase.from('contractor_remittances').select('*', { count: 'exact', head: true }).is('paid_at', null),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_test', false).eq('status', 'draft'),
    supabase.from('invoices').select('id, due_date').is('deleted_at', null).eq('is_test', false).eq('status', 'sent'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_test', false).is('contractor_id', null).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('job_workers').select('job_id, contractor_id, jobs!inner ( status, deleted_at )'),
    supabase.from('contractor_invoices').select('job_id, contractor_id').neq('status', 'void'),
  ])

  // Pay approvals = a worker on a completed/invoiced (live) job who has no
  // active payable yet for that (job, contractor). Mirrors the pending-
  // approvals worklist's "not already approved" rule.
  const ciKeys = new Set(
    ((ciRes.data ?? []) as Array<{ job_id: string | null; contractor_id: string | null }>)
      .filter((c) => c.job_id && c.contractor_id)
      .map((c) => `${c.job_id}::${c.contractor_id}`),
  )
  const payApprovals = ((jwRes.data ?? []) as Array<{
    job_id: string
    contractor_id: string
    jobs: { status: string | null; deleted_at: string | null } | { status: string | null; deleted_at: string | null }[] | null
  }>).filter((w) => {
    const j = Array.isArray(w.jobs) ? w.jobs[0] : w.jobs
    if (!j || j.deleted_at) return false
    if (j.status !== 'completed' && j.status !== 'invoiced') return false
    return !ciKeys.has(`${w.job_id}::${w.contractor_id}`)
  }).length

  const invoicesOverdue = ((sentInv.data ?? []) as Array<{ due_date: string | null }>)
    .filter((i) => i.due_date && i.due_date < today).length

  return {
    payApprovals,
    remittancesToSend: remSend.count ?? 0,
    remittancesToPay: remPay.count ?? 0,
    invoicesToSend: draftInv.count ?? 0,
    invoicesOverdue,
    unassignedJobs: unassigned.count ?? 0,
  }
}
