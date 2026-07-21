'use server'

// Manage the contractors assigned to a job (2026-07).
//
// Adds per-worker Add / Remove directly on the job's Labour & Margin
// breakdown, as a safe alternative to the Edit-job worker checkboxes
// (which do a destructive full delete+reinsert of job_workers, wiping
// every worker's recorded hours + pay snapshots).
//
// Both actions are admin-only. Remove is guarded so a worker who is
// already committed to pay can never be silently dropped:
//   • pay_status included_in_pay_run / paid → blocked
//   • a contractor_invoice (payable) exists for the pair → blocked
//   • a pay_run_items row exists for the pair → blocked
// Add seeds hours_allocated from the job's allowed hours so the pay
// basis is populated, mirroring the Edit-job replace path.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'
import { pickSnapshotRate, toPositiveRate } from '@/lib/contractor-rate-snapshot'

function revalidate(jobId: string) {
  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/finance')
  revalidatePath('/portal/payroll')
}

/** Admin adds a contractor to the job. Idempotent-ish: a contractor
 *  already assigned returns a friendly error rather than duplicating. */
export async function addJobWorker(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!jobId || !contractorId) return { error: 'Job and contractor are required.' }

  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('id, allowed_hours')
    .eq('id', jobId)
    .single()
  if (jErr || !job) return { error: 'Job not found.' }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, full_name, hourly_rate')
    .eq('id', contractorId)
    .single()
  if (!contractor) return { error: 'Contractor not found.' }

  const { data: existing } = await supabase
    .from('job_workers')
    .select('contractor_id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (existing) return { error: `${contractor.full_name} is already assigned to this job.` }

  // Snapshot the contractor's current rate at add time (no existing row here,
  // so there is nothing to preserve). Null is allowed for a rate-less
  // contractor — job-cost falls back to the live rate + shows an "est." badge.
  const hoursAllocated = (job.allowed_hours as number | null) ?? null
  const payRate = pickSnapshotRate(null, contractor.hourly_rate as number | null)

  const { error: insErr } = await supabase.from('job_workers').insert({
    job_id: jobId,
    contractor_id: contractorId,
    hours_allocated: hoursAllocated,
    pay_rate: payRate,
    pay_type: 'hourly',
  })
  if (insErr) return { error: `Failed to add contractor: ${insErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.added',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: null,
    after: { contractor_id: contractorId, hours_allocated: hoursAllocated, pay_rate: payRate },
  })

  revalidate(jobId)
  return { ok: true }
}

/** Admin explicitly changes a worker's snapshotted pay rate. This is the ONLY
 *  sanctioned way to alter an existing pay_rate snapshot — every other path
 *  preserves it. Requires a reason and is fully audited (before → after).
 *  Blocked once the amount is frozen downstream (pay run / paid / has a
 *  payable), where the rate no longer drives what will be paid. */
export async function setJobWorkerPayRate(
  jobId: string,
  contractorId: string,
  newRate: number,
  reason: string,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!jobId || !contractorId) return { error: 'Job and contractor are required.' }
  const rate = toPositiveRate(newRate)
  if (rate == null) return { error: 'Enter a pay rate greater than zero.' }
  if (!reason?.trim()) return { error: 'A reason is required to change a pay rate.' }

  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('pay_rate, pay_status, contractors ( full_name )')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) return { error: 'Worker is not assigned to this job.' }

  const name = (worker.contractors as unknown as { full_name: string } | null)?.full_name ?? 'This contractor'

  if (worker.pay_status === 'included_in_pay_run' || worker.pay_status === 'paid') {
    return { error: `${name}'s pay is already in a pay run / paid — the rate is locked.` }
  }
  const { data: ci } = await supabase
    .from('contractor_invoices')
    .select('invoice_number')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .neq('status', 'void')
    .maybeSingle()
  if (ci) {
    return { error: `${name} has a payable (${ci.invoice_number ?? 'contractor invoice'}); the rate is frozen on it. Void that first to change the rate.` }
  }

  const before = worker.pay_rate != null ? Number(worker.pay_rate) : null

  const { error: upErr } = await supabase
    .from('job_workers')
    .update({ pay_rate: rate, pay_type: 'hourly' })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (upErr) return { error: `Failed to update rate: ${upErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.rate_changed',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { pay_rate: before },
    after: { pay_rate: rate, reason: reason.trim() },
  })

  revalidate(jobId)
  return { ok: true }
}

/** Admin removes a contractor from the job. Blocked once the worker is
 *  committed to pay (pay run / paid / has a payable). */
export async function removeJobWorker(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!jobId || !contractorId) return { error: 'Job and contractor are required.' }

  const { data: worker, error: wErr } = await supabase
    .from('job_workers')
    .select('contractor_id, pay_status, extra_hours, contractors ( full_name )')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single()
  if (wErr || !worker) return { error: 'Worker is not assigned to this job.' }

  const name = (worker.contractors as unknown as { full_name: string } | null)?.full_name ?? 'This contractor'

  if (worker.pay_status === 'included_in_pay_run' || worker.pay_status === 'paid') {
    return { error: `${name} is already in a pay run / paid — can’t be removed.` }
  }

  const { data: ci } = await supabase
    .from('contractor_invoices')
    .select('invoice_number')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (ci) {
    return {
      error: `${name} has a payable (${ci.invoice_number ?? 'contractor invoice'}). Void or reassign that first.`,
    }
  }

  const { data: pri } = await supabase
    .from('pay_run_items')
    .select('job_id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (pri) {
    return { error: `${name} is part of a pay run — can’t be removed.` }
  }

  const { error: delErr } = await supabase
    .from('job_workers')
    .delete()
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
  if (delErr) return { error: `Failed to remove contractor: ${delErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.removed',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: { contractor_id: contractorId, pay_status: worker.pay_status ?? null, extra_hours: worker.extra_hours ?? 0 },
    after: null,
  })

  revalidate(jobId)
  return { ok: true }
}
