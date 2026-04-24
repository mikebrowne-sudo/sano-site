'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { loadJobSettings } from '@/lib/job-settings'
import { isAdminEmail } from '@/lib/is-admin'

// Phase D — mark a completed job as reviewed. Captures reviewed_at
// + reviewed_by (FK to auth.users) and audit-logs the transition.
// The workflow bar reads reviewed_at to advance to the Reviewed
// stage. Does not change jobs.status itself — review is a layer on
// top of the existing status enum, not a replacement.
export async function markJobReviewed(jobId: string) {
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
  const supabase = createClient()

  // 1. Load job
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('client_id, quote_id, invoice_id, title, description, address, scheduled_date, job_price, reviewed_at')
    .eq('id', jobId)
    .single()

  if (jErr || !job) {
    return { error: `Job not found: ${jErr?.message}` }
  }

  if (job.invoice_id) {
    return { error: 'This job already has an invoice.' }
  }

  if (job.job_price == null) {
    return { error: 'Job price must be set before creating an invoice.' }
  }

  // Phase D.3 — require-review-before-invoicing guard. When the
  // admin setting is on AND the job hasn't been reviewed, block
  // the invoice. Admin bypasses so the control stays editable.
  const settings = await loadJobSettings(supabase)
  const { data: { user } } = await supabase.auth.getUser()
  if (
    settings.require_review_before_invoicing
    && !job.reviewed_at
    && !isAdminEmail(user?.email)
  ) {
    return { error: 'This job must be reviewed before invoicing. Mark the job as reviewed first.' }
  }

  // 2. Create invoice
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: job.client_id,
      quote_id: job.quote_id || null,
      service_address: job.address || null,
      scheduled_clean_date: job.scheduled_date || null,
      base_price: job.job_price,
      notes: job.description || null,
    })
    .select('id')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message}` }
  }

  // 3. Create invoice item
  const label = job.title || 'Cleaning service'

  await supabase
    .from('invoice_items')
    .insert({
      invoice_id: invoice.id,
      label,
      price: job.job_price,
      sort_order: 0,
    })

  // 4. Link invoice to job and set status to invoiced
  await supabase
    .from('jobs')
    .update({ invoice_id: invoice.id, status: 'invoiced' })
    .eq('id', jobId)

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  revalidatePath('/portal/invoices')

  redirect(`/portal/invoices/${invoice.id}`)
}

// Phase D.1 — staff-side start/complete now also sync the assigned
// worker's job_workers row (actual_start_time / actual_end_time /
// actual_hours) so the Allowed vs Actual variance stays accurate
// regardless of whether the contractor self-closes the job or staff
// closes it from the portal. Mirrors contractorStartJob +
// contractorCompleteJob in src/app/contractor/jobs/[id]/_actions.ts.
export async function startJob(jobId: string) {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: priorJob, error: readErr } = await supabase
    .from('jobs')
    .select('contractor_id')
    .eq('id', jobId)
    .single()
  if (readErr || !priorJob) {
    return { error: `Job not found: ${readErr?.message ?? 'missing row'}` }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress', started_at: now })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to start job: ${error.message}` }
  }

  // Mirror to job_workers for the primary assigned contractor.
  if (priorJob.contractor_id) {
    await supabase
      .from('job_workers')
      .update({ actual_start_time: now })
      .eq('job_id', jobId)
      .eq('contractor_id', priorJob.contractor_id)
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}

export async function completeJob(jobId: string) {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: priorJob, error: readErr } = await supabase
    .from('jobs')
    .select('contractor_id')
    .eq('id', jobId)
    .single()
  if (readErr || !priorJob) {
    return { error: `Job not found: ${readErr?.message ?? 'missing row'}` }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: now })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to complete job: ${error.message}` }
  }

  // Mirror to job_workers for the primary assigned contractor. If
  // actual_start_time was captured (by either this action's start
  // pair or contractorStartJob), compute actual_hours from the
  // elapsed window rounded to 2dp. Otherwise just set the end time
  // and let ActualHoursEditor fill in actual_hours manually.
  if (priorJob.contractor_id) {
    const { data: worker } = await supabase
      .from('job_workers')
      .select('actual_start_time, actual_hours')
      .eq('job_id', jobId)
      .eq('contractor_id', priorJob.contractor_id)
      .single()

    const updates: { actual_end_time: string; actual_hours?: number } = {
      actual_end_time: now,
    }
    if (worker?.actual_start_time && worker.actual_hours == null) {
      const elapsedMs = new Date(now).getTime() - new Date(worker.actual_start_time).getTime()
      if (Number.isFinite(elapsedMs) && elapsedMs > 0) {
        updates.actual_hours = Math.round((elapsedMs / 3_600_000) * 100) / 100
      }
    }

    await supabase
      .from('job_workers')
      .update(updates)
      .eq('job_id', jobId)
      .eq('contractor_id', priorJob.contractor_id)
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}

export async function updateWorkerActualHours(jobId: string, contractorId: string, actualHours: number) {
  const supabase = createClient()

  const { error } = await supabase
    .from('job_workers')
    .update({ actual_hours: actualHours })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  revalidatePath(`/portal/jobs/${jobId}`)
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

  // Look up contractor details
  const { data: contractor } = await supabase
    .from('contractors')
    .select('full_name, email, insurance_expiry')
    .eq('id', contractorId)
    .single()

  if (!contractor) {
    return { error: 'Contractor not found.' }
  }

  // Block assignment if insurance is missing or expired
  const today = new Date().toISOString().slice(0, 10)
  if (!contractor.insurance_expiry) {
    return { error: `Cannot assign — ${contractor.full_name} has no insurance expiry on file. Update the contractor's insurance details first.` }
  }
  if (contractor.insurance_expiry < today) {
    return { error: `Cannot assign — ${contractor.full_name}'s insurance expired on ${contractor.insurance_expiry}. Update the contractor's insurance details first.` }
  }

  // Load current job to detect contractor change and get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('status, contractor_id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, description')
    .eq('id', jobId)
    .single()

  if (!job) {
    return { error: 'Job not found.' }
  }

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
  if (allowedHours        !== undefined) updates.allowed_hours        = allowedHours
  if (accessInstructions  !== undefined) updates.access_instructions  = accessInstructions || null
  if (internalNotes       !== undefined) updates.internal_notes       = internalNotes || null

  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to assign job: ${error.message}` }
  }

  // Ensure a matching job_workers row exists so actual-hours
  // tracking (allocated by the staff ActualHoursEditor or captured
  // by contractorStartJob/contractorCompleteJob) has a record to
  // write against. Idempotent via upsert on the composite key.
  await supabase
    .from('job_workers')
    .upsert(
      { job_id: jobId, contractor_id: contractorId, hours_allocated: allowedHours ?? null },
      { onConflict: 'job_id,contractor_id' },
    )

  // Notify contractor. Skipped when the caller opts out via
  // notify:false (Assign Only) or when the contractor hasn't
  // actually changed.
  // Phase D.3 — also gate on the admin contractor_notification_method
  // setting. Today only 'email' is supported, so the gate is
  // effectively "notify if method is 'email'". Kept as a check so
  // SMS / portal-notification options can extend cleanly later.
  const jobSettings = await loadJobSettings(supabase)
  const methodOk = jobSettings.contractor_notification_method === 'email'
  if (notify && contractorChanged && methodOk) {
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
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}
