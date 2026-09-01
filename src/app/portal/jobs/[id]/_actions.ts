'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { sendNotification } from '@/lib/notifications/send'
import { isLockedByInvoice, writeAmendmentAudit } from '@/lib/amendment-lock'
import { isAdminUser } from '@/lib/is-admin'
import { pickSnapshotRate } from '@/lib/contractor-rate-snapshot'

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

  // 1. Load job — service date sources (completed_at preferred over
  //    scheduled_date so a re-scheduled job invoices for the latest
  //    date, not the original quoted one) + payment context.
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('client_id, quote_id, invoice_id, title, description, address, scheduled_date, completed_at, job_price, payment_status, client_reference, requires_po')
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

  // Resolve the canonical service date once — used for both the
  // invoice's scheduled_clean_date column and the due-date helper.
  const { resolveServiceDate, computeInvoiceDueDate } = await import('@/lib/invoice-dates')
  const serviceDate = resolveServiceDate({
    job_completed_at: (job as { completed_at?: string | null }).completed_at ?? null,
    job_scheduled_date: (job as { scheduled_date?: string | null }).scheduled_date ?? null,
  })

  // Pull the client's payment terms so the due date respects the
  // configured terms. We also need the quote's payment_type when
  // available — payment_type lives on the quote, not the job.
  const [{ data: client }, { data: quote }, { data: quoteItems }] = await Promise.all([
    supabase.from('clients').select('payment_type, payment_terms').eq('id', job.client_id).maybeSingle(),
    job.quote_id
      ? supabase.from('quotes').select('payment_type, property_category, type_of_clean, service_type, frequency, scope_size, notes').eq('id', job.quote_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Add-on lines from the source quote. Needed BEFORE the insert so the
    // invoice's base_price can exclude them: InvoiceDocument totals
    // base_price + items, so putting an add-on-inclusive job_price in base
    // AND listing the items would double-count.
    job.quote_id
      ? supabase.from('quote_items')
          .select('label, description, price, sort_order')
          .eq('quote_id', job.quote_id).order('sort_order')
      : Promise.resolve({ data: [] as unknown[] }),
  ])
  const addonRows = (quoteItems ?? []) as {
    label: string; description: string | null; price: number; sort_order: number
  }[]
  const addonsTotal = addonRows.reduce((sum, r) => sum + Number(r.price ?? 0), 0)
  const q = quote as {
    payment_type?: string | null
    property_category?: string | null
    type_of_clean?: string | null
    service_type?: string | null
    frequency?: string | null
    scope_size?: string | null
    notes?: string | null
  } | null
  const paymentType = (q?.payment_type as string | null)
    ?? (client?.payment_type as string | null)
    ?? 'on_account'
  const paymentTerms = (client?.payment_terms as string | null) ?? null

  // Service scope vs customer notes (same logic as the quote→invoice path).
  // Copy the quote's structured clean type so the invoice document shows a
  // real service heading + composed description UNDER the line item — not
  // "Cleaning service" with the scope dumped into Notes. When the quote
  // carries a clean type the document composes the description, so
  // service_description stays null (mirrors quote→invoice); otherwise (a
  // manual job with no quote) fall back to the job's own description so the
  // scope still renders under the line item. Notes is reserved for genuine
  // customer notes (carried from the quote), never the job scope.
  const qType = (q?.type_of_clean as string | null) ?? null
  const serviceDescription = qType ? null : (job.description?.trim() || null)
  const customerNotes = (q?.notes as string | null) ?? null

  // date_issued stays null at creation — it's set on Send. The due
  // date is computed only when both date_issued and a known terms
  // policy are available; otherwise it's left null so the invoice
  // detail can render "Due on send" or similar fallback copy.
  const dueDate = computeInvoiceDueDate({
    payment_type: paymentType,
    payment_terms: paymentTerms,
    date_issued: null,
    service_date: serviceDate,
  })

  // 2. Create invoice
  // Phase 5.5.16 fix — earlier code wrote `base_price = job.job_price`
  // AND inserted a single line_item with the SAME amount, so the
  // invoice total formula (base + sum(items) - discount, consistent
  // across detail / list / share / PDF / Stripe / email) double-
  // counted to 2× the real price. Items in this codebase are
  // ADDONS (see INV-0018: base $415 + waiting-time $60 = $475);
  // a job-based invoice has no addons, so we just write base_price
  // and skip the line item.
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: job.client_id,
      quote_id: job.quote_id || null,
      job_id: jobId,
      service_address: job.address || null,
      // Phase quote-flow-clarity: scheduled_clean_date now reflects
      // the LATEST service date (completed_at ?? scheduled_date), not
      // the originally quoted date. This keeps re-scheduled jobs'
      // invoices honest.
      scheduled_clean_date: serviceDate,
      // job_price now carries the full quoted total (base + add-ons). The
      // document adds the itemised lines on top, so the invoice's base must
      // be the total MINUS those lines or they would be counted twice.
      base_price: job.job_price != null
        ? Math.max(0, Number(job.job_price) - addonsTotal)
        : null,
      // Structured clean type → real service heading + composed description.
      property_category: (q?.property_category as string | null) ?? null,
      type_of_clean: qType,
      service_type: (q?.service_type as string | null) ?? null,
      frequency: (q?.frequency as string | null) ?? null,
      scope_size: (q?.scope_size as string | null) ?? null,
      service_description: serviceDescription,
      notes: customerNotes,
      payment_type: paymentType,
      due_date: dueDate,
      // Phase 5D — auto-pull the PO / client reference from the job onto
      // the invoice (covers the Quote → Job → Invoice path).
      client_reference: (job as { client_reference?: string | null }).client_reference ?? null,
      requires_po: (job as { requires_po?: boolean | null }).requires_po ?? false,
    })
    .select('id')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message}` }
  }

  // 3a. Copy the source quote's add-on lines onto the invoice.
  //
  // This previously inserted nothing, on the reasoning that "a job-based
  // invoice has no add-on lines". That holds for a job created directly, but
  // not for one converted from a quote that had them: the customer agreed to
  // "clean $600 + carpet $300 + windows $180" and received an invoice showing
  // a single $600 line. job_price now carries the full total (see
  // lib/quote-total), so without the lines the invoice would show the right
  // amount with no explanation of what it covers.
  if (addonRows.length > 0) {
    const { error: iiErr } = await supabase.from('invoice_items').insert(
      addonRows.map((it) => ({
        invoice_id: invoice.id,
        label: it.label,
        description: it.description ?? null,
        price: it.price,
        sort_order: it.sort_order,
      })),
    )
    if (iiErr) {
      return { error: `Invoice created but add-on lines failed: ${iiErr.message}` }
    }
  }

  // 3b. Link invoice to job and set status to invoiced. payment_status moves
  // to 'invoice_sent' to reflect the new state.
  await supabase
    .from('jobs')
    .update({ invoice_id: invoice.id, status: 'invoiced', payment_status: 'invoice_sent' })
    .eq('id', jobId)

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  revalidatePath('/portal/invoices')

  redirect(`/portal/invoices/${invoice.id}`)
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
  const today = new Date().toISOString().slice(0, 10)
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
        hours_allocated: allowedHoursAllowed ? (allowedHours ?? null) : (job.allowed_hours as number | null),
        pay_rate: payRateToSet,
        pay_type: 'hourly',
      },
      { onConflict: 'job_id,contractor_id' },
    )

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
