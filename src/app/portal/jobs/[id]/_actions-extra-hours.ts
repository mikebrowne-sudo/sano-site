'use server'

// Allowed-hours pay model (2026-06) — extra-hours sign-off.
//
// In the allowed-hours model a job's labour cost / margin / contractor
// pay are driven by `hours_allocated × rate` (the agreed "allowed"
// hours). The ONLY thing that changes that is EXTRA hours: when a job
// genuinely runs over, staff record the extra hours + a reason, and an
// admin must sign them off before they count toward margin or pay.
//
// State machine on job_workers.extra_hours_status:
//   none      — default; no extra hours recorded.
//   pending   — staff recorded extra hours; awaiting admin sign-off.
//   approved  — admin signed off; counts toward margin + pay.
//   rejected  — admin declined; does NOT count.
//
// Recording is staff-level (any authenticated portal user). Approving
// and rejecting are admin-only (isAdminEmail). Editing recorded hours
// after an approval resets the row to `pending` — a changed figure
// must be re-signed-off.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'

function revalidate(jobId: string) {
  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/finance')
  revalidatePath('/portal/payroll')
  revalidatePath('/portal/payroll/contractor-pending')
}

/**
 * Staff records (or updates) extra hours on a worker row.
 *
 * hours > 0  → status becomes `pending` (awaiting admin sign-off),
 *              even if it was previously approved (a changed figure
 *              must be re-approved).
 * hours = 0  → clears the exception: status `none`, reason/approval
 *              wiped.
 */
export async function recordExtraHours(
  jobId: string,
  contractorId: string,
  hours: number,
  reason: string,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!jobId || !contractorId) return { error: 'Job and contractor are required.' }
  if (!Number.isFinite(hours) || hours < 0) {
    return { error: 'Extra hours must be zero or more.' }
  }

  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('extra_hours, extra_hours_status, pay_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) return { error: 'Worker is not assigned to this job.' }
  if (worker.pay_status === 'included_in_pay_run' || worker.pay_status === 'paid') {
    return { error: 'This worker is already in a pay run — extra hours can no longer be changed.' }
  }

  const clearing = hours === 0
  const updates = clearing
    ? {
        extra_hours: 0,
        extra_hours_reason: null,
        extra_hours_status: 'none',
        extra_hours_approved_at: null,
        extra_hours_approved_by: null,
      }
    : {
        extra_hours: hours,
        extra_hours_reason: reason?.trim() || null,
        extra_hours_status: 'pending',
        // Re-recording invalidates any prior sign-off.
        extra_hours_approved_at: null,
        extra_hours_approved_by: null,
      }

  const { error: updErr } = await supabase
    .from('job_workers')
    .update(updates)
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (updErr) return { error: `Failed to record extra hours: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: clearing ? 'job_worker.extra_hours_cleared' : 'job_worker.extra_hours_recorded',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { extra_hours: worker.extra_hours ?? 0, extra_hours_status: worker.extra_hours_status ?? 'none' },
    after: { extra_hours: clearing ? 0 : hours, extra_hours_status: clearing ? 'none' : 'pending' },
  })

  revalidate(jobId)
  return { ok: true }
}

/** Admin signs off recorded extra hours so they count toward margin + pay. */
export async function approveExtraHours(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('extra_hours, extra_hours_status, pay_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) return { error: 'Worker is not assigned to this job.' }
  if (worker.extra_hours_status !== 'pending') {
    return { error: 'There are no pending extra hours to approve for this worker.' }
  }
  if ((worker.extra_hours ?? 0) <= 0) {
    return { error: 'No extra hours have been recorded.' }
  }
  if (worker.pay_status === 'included_in_pay_run' || worker.pay_status === 'paid') {
    return { error: 'This worker is already in a pay run.' }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('job_workers')
    .update({
      extra_hours_status: 'approved',
      extra_hours_approved_at: now,
      extra_hours_approved_by: user.id,
    })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (updErr) return { error: `Failed to approve extra hours: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.extra_hours_approved',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { extra_hours_status: 'pending' },
    after: { extra_hours_status: 'approved', extra_hours: worker.extra_hours ?? 0, approved_by: user.id },
  })

  revalidate(jobId)
  return { ok: true }
}

/** Admin declines recorded extra hours. They will not count toward pay. */
export async function rejectExtraHours(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('extra_hours, extra_hours_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) return { error: 'Worker is not assigned to this job.' }
  if (worker.extra_hours_status !== 'pending') {
    return { error: 'There are no pending extra hours to decline for this worker.' }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('job_workers')
    .update({
      extra_hours_status: 'rejected',
      extra_hours_approved_at: now,
      extra_hours_approved_by: user.id,
    })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (updErr) return { error: `Failed to decline extra hours: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.extra_hours_rejected',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { extra_hours_status: 'pending' },
    after: { extra_hours_status: 'rejected', extra_hours: worker.extra_hours ?? 0 },
  })

  revalidate(jobId)
  return { ok: true }
}
