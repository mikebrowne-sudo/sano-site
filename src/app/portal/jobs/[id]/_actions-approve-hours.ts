'use server'

// Phase E — approve job-worker hours for contractor pay.
//
// Flow:
//   1. Admin opens a completed / invoiced job.
//   2. Clicks Approve Hours on a worker row.
//   3. This action validates state, snapshots the contractor's
//      current hourly_rate, and writes the approval to job_workers:
//        pay_rate       = contractors.hourly_rate at approval
//        pay_type       = contractors.pay_type (default 'hourly')
//        approved_hours = admin-supplied (defaults to actual)
//        approved_at    = now
//        approved_by    = admin uid
//        pay_status     = 'approved'
//   4. Audit-logs `job_worker.hours_approved`.
//
// Guardrails:
//   • admin-only (via isAdminUser)
//   • job must be completed or invoiced (not draft / in_progress)
//   • worker row must exist for (job_id, contractor_id)
//   • cannot re-approve once in a pay run or paid
//   • require_review_before_invoicing from job_settings is checked
//     as "require_review_before_pay" by convention: when on, job
//     must be reviewed before pay can be approved
//   • archived jobs (deleted_at) are blocked

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'
import { loadJobSettings } from '@/lib/job-settings'

export interface ApproveJobWorkerHoursInput {
  jobId: string
  contractorId: string
  approvedHours: number
  note?: string | null
}

export async function approveJobWorkerHours(input: ApproveJobWorkerHoursInput) {
  const supabase = createClient()
  const { jobId, contractorId, approvedHours, note } = input

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  if (!jobId || !contractorId) return { error: 'Job and contractor are required.' }
  if (!Number.isFinite(approvedHours) || approvedHours < 0) {
    return { error: 'Approved hours must be zero or more.' }
  }

  // Job guardrails — must exist, not archived, must be completed
  // or invoiced, optionally require a review gate.
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, status, deleted_at, reviewed_at')
    .eq('id', jobId)
    .single()
  if (jobErr || !job) return { error: 'Job not found.' }
  if (job.deleted_at) return { error: 'Cannot approve pay for an archived job.' }
  if (job.status !== 'completed' && job.status !== 'invoiced') {
    return { error: 'Hours can only be approved on completed jobs.' }
  }

  const settings = await loadJobSettings(supabase)
  if (settings.require_review_before_invoicing && !job.reviewed_at) {
    return {
      error: 'This job must be reviewed before pay can be approved. Mark the job as reviewed first.',
    }
  }

  // Worker row must exist + not already beyond "approved".
  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('job_id, contractor_id, pay_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) {
    return { error: 'Worker is not assigned to this job.' }
  }
  if (worker.pay_status === 'included_in_pay_run') {
    return { error: 'Worker is already included in a pay run — unable to re-approve.' }
  }
  if (worker.pay_status === 'paid') {
    return { error: 'Worker has already been paid for this job.' }
  }

  // Snapshot the contractor's current rate. This value is stored
  // on the job_workers row and never overwritten — future contractor
  // rate changes don't alter historical pay.
  const { data: contractor } = await supabase
    .from('contractors')
    .select('hourly_rate')
    .eq('id', contractorId)
    .single()
  const hourlyRate = contractor?.hourly_rate ?? null
  if (hourlyRate == null || !Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
    return { error: 'Contractor has no hourly rate on file. Set it on the contractor profile first.' }
  }

  const now = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('job_workers')
    .update({
      pay_rate: hourlyRate,
      pay_type: 'hourly',
      approved_hours: approvedHours,
      approved_at: now,
      approved_by: user.id,
      pay_status: 'approved',
    })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (updErr) {
    return { error: `Failed to approve hours: ${updErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.hours_approved',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { pay_status: worker.pay_status ?? 'pending' },
    after: {
      pay_status: 'approved',
      pay_rate: hourlyRate,
      approved_hours: approvedHours,
      approved_by: user.id,
      note: note ?? null,
    },
  })

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/payroll/contractor-pending')
  revalidatePath('/portal/payroll')
  return { ok: true }
}
