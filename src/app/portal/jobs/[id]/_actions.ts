'use server'
import { createInvoiceFromJobCore } from '@/lib/invoice-from-job'
import { nzToday } from '@/lib/nz-date'

import { assertAdminAction } from '@/lib/require-admin'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { sendNotification } from '@/lib/notifications/send'
import { isLockedByInvoice, writeAmendmentAudit } from '@/lib/amendment-lock'
import { isAdminUser } from '@/lib/is-admin'
import { pickSnapshotRate } from '@/lib/contractor-rate-snapshot'
import { resplitJobHours } from '@/lib/job-hours-split'
import { getServiceSupabase } from '@/lib/supabase-service'
import { autoApproveRecurringJobPay } from '@/lib/recurring-pay-auto-approve'

// Phase D — mark a completed job as reviewed. Captures reviewed_at
// + reviewed_by (FK to auth.users) and audit-logs the transition.
// The workflow bar reads reviewed_at to advance to the Reviewed
// stage. Does not change jobs.status itself — review is a layer on
// top of the existing status enum, not a replacement.
export async function markJobReviewed(jobId: string) {
  await assertAdminAction()
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { data: priorJob, error: readErr } = await supabase
    .from('jobs')
    .select('status, reviewed_at')
    .eq('id', jobId)
    .single()

  if (readErr || !priorJob) {
    return { error: `Job not found: ${readErr?.message ?? 'missing row'}` }
  }
  if (priorJob.status !== 'completed' && priorJob.status !== 'invoiced') {
    return { error: 'Only completed jobs can be marked as reviewed.' }
  }
  if (priorJob.reviewed_at) {
    return { error: 'This job has already been reviewed.' }
  }

  const now = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('jobs')
    .update({ reviewed_at: now, reviewed_by: user.id })
    .eq('id', jobId)

  if (updErr) {
    return { error: `Failed to mark reviewed: ${updErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job.reviewed',
    entity_table: 'jobs',
    entity_id: jobId,
    before: { reviewed_at: null },
    after: { reviewed_at: now, reviewed_by: user.id },
  })

  revalidatePath(`/portal/jobs/${jobId}`)
  return { ok: true }
}

export async function createInvoiceFromJob(jobId: string) {
  await assertAdminAction()
  const supabase = createClient()

  const res = await createInvoiceFromJobCore(supabase as never, jobId)
  if ('error' in res) return res

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  revalidatePath('/portal/invoices')

  redirect(`/portal/invoices/${res.invoiceId}`)
}

// Allowed-hours model (2026-06) — staff "Mark complete".
//
// The old two-step Start → Finish clock-in/out flow is archived: a
// job's labour/pay basis is its allowed hours, not a stopwatch, so we
// no longer capture actual_start_time / actual_end_time / actual_hours.
// Staff (and contractors, via contractorCompleteJob) simply mark the
// job complete. We stamp started_at on the way through when it was
// never set, so the lifecycle ("In progress" → "Completed") and the
// job-status derivation stay coherent.
export async function completeJob(jobId: string) {
  await assertAdminAction()
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: priorJob, error: readErr } = await supabase
    .from('jobs')
    .select('started_at')
    .eq('id', jobId)
    .single()
  if (readErr || !priorJob) {
    return { error: `Job not found: ${readErr?.message ?? 'missing row'}` }
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: now,
      // Back-fill a start timestamp for jobs marked complete directly
      // from assigned (no separate Start step in the new model).
      started_at: priorJob.started_at ?? now,
    })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to complete job: ${error.message}` }
  }

  // Recurring occurrence → approve the contractor payable now (see
  // src/lib/recurring-pay-auto-approve.ts). Non-fatal; the cron sweep retries.
  try {
    await autoApproveRecurringJobPay(getServiceSupabase(), jobId)
  } catch (e) {
    console.error('[completeJob] recurring auto-approve failed', e)
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}

// Phase D.1 — assignJob now accepts optional schedule / hours /
// access / notes fields set from the assignment modal, plus a
// `notify` flag so the modal can offer "Assign Only" vs "Assign +
// Notify". Backward compatible when the caller only supplies
// jobId + contractorId — notify defaults to true to match prior
// behaviour.
export interface AssignJobInput {
  jobId: string
  contractorId: string
  scheduledDate?: string | null
  scheduledTime?: string | null
  allowedHours?: number | null
  accessInstructions?: string | null
  internalNotes?: string | null
  notify?: boolean
  // Phase 5B — admin override for the allowed_hours field when the job
  // is invoice-locked. The contractor / schedule / access / notes
  // fields are NON-material and always apply regardless. Only
  // allowed_hours is material and gated.
  force?: boolean
}

export async function assignJob(input: AssignJobInput) {
  const supabase = createClient()
  const {
    jobId,
    contractorId,
    scheduledDate,
    scheduledTime,
    allowedHours,
    accessInstructions,
    internalNotes,
    notify = true,
  } = input

  if (!contractorId) {
    return { error: 'Please select a contractor.' }
  }

  // Look up contractor details. Phase H also reads phone for the
  // automated SMS branch. Phase 5.4 adds the workflow-gate fields
  // (status, onboarding_status, trial_required, trial_status,
  // worker_type) for the new gate below.
  const { data: contractor } = await supabase
    .from('contractors')
    .select('full_name, email, phone, hourly_rate, insurance_expiry, status, onboarding_status, trial_required, trial_status, worker_type')
    .eq('id', contractorId)
    .single()

  if (!contractor) {
    return { error: 'Contractor not found.' }
  }

  // Phase G.1 — block assignment when the contractor has no hourly
  // rate on file. Silent assignment in that state produces job_workers
  // rows with null pay_rate, which then surface as missing labour cost
  // everywhere downstream (job page, finance dashboard, contractor
  // pay run). Admin must set the rate on the contractor profile first.
  const contractorRate = contractor.hourly_rate
  if (
    contractorRate == null ||
    !Number.isFinite(Number(contractorRate)) ||
    Number(contractorRate) <= 0
  ) {
    return {
      error: `Cannot assign — ${contractor.full_name} has no hourly rate on file. Set the contractor's hourly rate on their profile first.`,
    }
  }

  // Phase 5.4 (locked) — Workflow gate driven by workforce_settings.
  // block_assignment_until_ready = true (default) → hard-block on
  // non-active status / incomplete onboarding / unfinished trial.
  // When the toggle is off, the gate is skipped and only the
  // insurance-expiry hard-stop remains.
  const { loadWorkforceSettings } = await import('@/lib/workforce-settings')
  const workforceSettings = await loadWorkforceSettings(supabase)
  if (workforceSettings.block_assignment_until_ready) {
    if (contractor.status !== 'active') {
      return { error: `Worker is not ready for job assignment. Complete onboarding and trial requirements first. (${contractor.full_name})` }
    }
    if (contractor.onboarding_status && contractor.onboarding_status !== 'complete') {
      return { error: `Worker is not ready for job assignment. Complete onboarding and trial requirements first. (${contractor.full_name})` }
    }
    if (contractor.trial_required && contractor.trial_status !== 'passed') {
      return { error: `Worker is not ready for job assignment. Complete onboarding and trial requirements first. (${contractor.full_name})` }
    }
  }

  // Insurance expiry remains a separate hard-stop (legal/compliance
  // gate independent of the onboarding completeness toggle).
  const today = nzToday()
  if (!contractor.insurance_expiry) {
    return { error: `Cannot assign — ${contractor.full_name} has no insurance expiry on file. Update the contractor's insurance details first.` }
  }
  if (contractor.insurance_expiry < today) {
    return { error: `Cannot assign — ${contractor.full_name}'s insurance expired on ${contractor.insurance_expiry}. Update the contractor's insurance details first.` }
  }

  // Load current job to detect contractor change and get job details.
  // Phase 5B — also reads invoice_id + allowed_hours so the partial
  // lock-guard below can decide whether to apply the new allowed_hours.
  const { data: job } = await supabase
    .from('jobs')
    .select('status, contractor_id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, description, invoice_id, allowed_hours')
    .eq('id', jobId)
    .single()

  if (!job) {
    return { error: 'Job not found.' }
  }

  // Phase 5B — partial invoice-lock guard for assignJob. Contractor,
  // schedule, access, and notes are NON-material (operational) and
  // always apply. allowed_hours IS material and is dropped from the
  // update when the job is invoice-locked, unless admin passed
  // `force: true`. The non-material fields proceed regardless.
  const { data: { user } } = await supabase.auth.getUser()
  const jobLocked  = isLockedByInvoice(job.invoice_id as string | null)
  const adminForce = !!input.force && isAdminUser(user ?? null)
  const allowedHoursAllowed = !jobLocked || adminForce
  const allowedHoursWouldChange =
    allowedHours !== undefined && (allowedHours ?? null) !== (job.allowed_hours ?? null)
  const allowedHoursOverridden = jobLocked && adminForce && allowedHoursWouldChange

  const contractorChanged = contractorId !== (job.contractor_id ?? '')
  const newStatus = job.status === 'draft' ? 'assigned' : job.status

  // Only overwrite schedule / hours / access / notes fields when the
  // caller explicitly supplied them (not null/undefined). This lets
  // the legacy bare-bones reassign flow keep working without
  // clobbering previously-set values.
  type JobUpdate = {
    contractor_id: string
    assigned_to: string
    status: string
    scheduled_date?: string | null
    scheduled_time?: string | null
    allowed_hours?: number | null
    access_instructions?: string | null
    internal_notes?: string | null
  }
  const updates: JobUpdate = {
    contractor_id: contractorId,
    assigned_to: contractor.full_name,
    status: newStatus,
  }
  if (scheduledDate       !== undefined) updates.scheduled_date       = scheduledDate || null
  if (scheduledTime       !== undefined) updates.scheduled_time       = scheduledTime || null
  if (allowedHours        !== undefined && allowedHoursAllowed) updates.allowed_hours = allowedHours
  if (accessInstructions  !== undefined) updates.access_instructions  = accessInstructions || null
  if (internalNotes       !== undefined) updates.internal_notes       = internalNotes || null

  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to assign job: ${error.message}` }
  }

  // Phase 5B — if admin overrode the lock to amend allowed_hours,
  // audit-log the override so the timeline can flag it. Non-override
  // assignJob calls don't write an amendment audit row (the existing
  // schedule_changed audit row covers schedule moves; allowed_hours
  // changes pre-invoice are routine).
  if (allowedHoursOverridden) {
    await writeAmendmentAudit({
      supabase,
      entity: 'job',
      entityId: jobId,
      actorId: user?.id ?? null,
      overridden: true,
      before: { allowed_hours: job.allowed_hours ?? null },
      after:   { allowed_hours: allowedHours ?? null },
    })
  }

  // Ensure a matching job_workers row exists so actual-hours
  // tracking (allocated by the staff ActualHoursEditor or captured
  // by contractorStartJob/contractorCompleteJob) has a record to
  // write against. Idempotent via upsert on the composite key.
  //
  // Phase G.1 — also snapshot the contractor's current hourly rate
  // onto job_workers.pay_rate at this point. The snapshot is
  // preserved on subsequent reassign actions: if a pay_rate has
  // already been set (e.g. via earlier assignment, approval-time
  // snapshot in Phase E, or a future admin override), we keep that
  // value rather than overwriting it. Historical pay must remain
  // stable regardless of later rate changes on the contractor profile.
  const { data: existingJw } = await supabase
    .from('job_workers')
    .select('pay_rate')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()

  // Preserve any existing positive snapshot; else snapshot the current rate.
  const payRateToSet = pickSnapshotRate(existingJw?.pay_rate as number | null, contractorRate)

  await supabase
    .from('job_workers')
    .upsert(
      {
        job_id: jobId,
        contractor_id: contractorId,
        // Hours come from the re-split below, which accounts for every worker
        // on the job. Writing the job's full allowed_hours here would give
        // this contractor the whole job even when others are assigned.
        pay_rate: payRateToSet,
        pay_type: 'hourly',
      },
      { onConflict: 'job_id,contractor_id' },
    )

  // Re-split the allowed hours across the job's full roster. allowed_hours is
  // the job's TOTAL labour, so a solo assignee gets all of it and a second
  // worker halves both shares. Workers already committed to pay keep their
  // frozen amount.
  {
    const effectiveAllowed = allowedHoursAllowed
      ? (allowedHours ?? null)
      : ((job.allowed_hours as number | null) ?? null)

    const [{ data: rosterRaw }, { data: payables }] = await Promise.all([
      supabase.from('job_workers').select('contractor_id, hours_allocated, pay_status').eq('job_id', jobId).order('contractor_id'),
      // Only the clean's own payable freezes a worker's hours; an extra doesn't.
      supabase.from('contractor_invoices').select('contractor_id').eq('job_id', jobId).is('job_item_id', null).neq('status', 'void'),
    ])
    const roster = (rosterRaw ?? []) as unknown as
      { contractor_id: string; hours_allocated: number | null; pay_status: string | null }[]
    const withPayable = new Set((payables ?? []).map((p) => p.contractor_id as string))

    if (roster.length > 0) {
      const result = resplitJobHours(effectiveAllowed, roster.map((r) => ({
        contractor_id: r.contractor_id,
        hours_allocated: r.hours_allocated,
        pay_status: r.pay_status,
        locked: withPayable.has(r.contractor_id),
      })))
      for (const u of result.updates) {
        const before = roster.find((r) => r.contractor_id === u.contractor_id)?.hours_allocated ?? null
        if (before === u.hours_allocated) continue
        await supabase
          .from('job_workers')
          .update({ hours_allocated: u.hours_allocated })
          .eq('job_id', jobId)
          .eq('contractor_id', u.contractor_id)
      }
    }
  }

  // Notify contractor. Skipped when the caller opts out via
  // notify:false (Assign Only) or when the contractor hasn't
  // actually changed.
  if (notify && contractorChanged) {
    // Effective scheduling values for the email — prefer the fields
    // the modal just set, otherwise fall back to what was on the job.
    const effectiveDate     = scheduledDate       !== undefined ? scheduledDate       : job.scheduled_date
    const effectiveTime     = scheduledTime       !== undefined ? scheduledTime       : job.scheduled_time
    const effectiveHours    = allowedHours        !== undefined ? allowedHours        : null
    const effectiveAccess   = accessInstructions  !== undefined ? accessInstructions  : null
    const effectiveNotes    = internalNotes       !== undefined ? internalNotes       : null

    await notifyContractorAssigned(contractor, {
      id: jobId,
      job_number: job.job_number,
      title: job.title,
      address: job.address,
      scheduled_date: effectiveDate ?? null,
      scheduled_time: effectiveTime ?? null,
      duration_estimate: job.duration_estimate,
      allowed_hours: effectiveHours ?? null,
      access_instructions: effectiveAccess ?? null,
      notes: effectiveNotes ?? null,
      scope_summary: job.description ?? null,
    })

    // Phase H — also fire the contractor SMS via the central
    // sendNotification path. Every gate (provider, channel, type,
    // automated source, template, recipient phone) is enforced
    // there + every attempt is logged. Failures don't block the
    // assignment; a skipped/failed notification just leaves a row
    // in notification_logs.
    const fmtDate = (iso: string | null) => iso
      ? new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
      : ''
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    await sendNotification(supabase, {
      type: 'job_assigned',
      channel: 'sms',
      audience: 'contractor',
      source: 'automated',
      recipientName: contractor.full_name,
      recipientPhone: (contractor as unknown as { phone?: string | null }).phone ?? null,
      variables: {
        contractor_name: (contractor.full_name ?? '').split(/\s+/)[0],
        job_title:       job.title ?? job.job_number,
        job_number:      job.job_number,
        site_address:    job.address ?? '',
        scheduled_date:  fmtDate(effectiveDate ?? null),
        scheduled_time:  effectiveTime ?? '',
        job_link:        `${siteUrl}/contractor/jobs/${jobId}`,
        business_name:   'Sano',
        business_phone:  '0800 726 686',
      },
      jobId,
      contractorId,
    })
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}
