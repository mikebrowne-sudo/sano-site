'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { assertCanAmend, writeAmendmentAudit } from '@/lib/amendment-lock'
import { resolveAllowedHours } from '@/lib/allowed-hours'
import { snapshotJobVersion, computeChangedJobFields } from '@/lib/job-versions'
import { pickSnapshotRate } from '@/lib/contractor-rate-snapshot'

/** Map of contractor_id → current profile hourly_rate, for rate snapshotting. */
async function loadContractorRates(
  supabase: ReturnType<typeof createClient>,
  contractorIds: string[],
): Promise<Record<string, number | null>> {
  const ids = Array.from(new Set(contractorIds.filter(Boolean)))
  if (ids.length === 0) return {}
  const { data } = await supabase.from('contractors').select('id, hourly_rate').in('id', ids)
  const map: Record<string, number | null> = {}
  for (const c of data ?? []) map[c.id as string] = (c.hourly_rate as number | null) ?? null
  return map
}

// Returns an error message if the contractor's insurance is missing or expired; null otherwise.
async function checkContractorInsurance(
  supabase: ReturnType<typeof createClient>,
  contractorId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('contractors')
    .select('full_name, insurance_expiry')
    .eq('id', contractorId)
    .single()
  if (!data) return 'Contractor not found.'
  const today = new Date().toISOString().slice(0, 10)
  if (!data.insurance_expiry) {
    return `Cannot assign — ${data.full_name} has no insurance expiry on file. Update the contractor's insurance details first.`
  }
  if ((data.insurance_expiry as string) < today) {
    return `Cannot assign — ${data.full_name}'s insurance expired on ${data.insurance_expiry}. Update the contractor's insurance details first.`
  }
  return null
}

interface JobInput {
  client_id: string
  quote_id?: string
  invoice_id?: string
  title?: string
  description?: string
  address?: string
  scheduled_date?: string
  scheduled_time?: string
  duration_estimate?: string
  assigned_to?: string
  contractor_id?: string
  contractor_price?: number
  job_price?: number
  allowed_hours?: number
  worker_ids?: string[]
  internal_notes?: string
}

export async function createJob(input: JobInput) {
  const supabase = createClient()

  if (!input.client_id) {
    return { error: 'Client is required.' }
  }

  if (input.contractor_id) {
    const insuranceError = await checkContractorInsurance(supabase, input.contractor_id)
    if (insuranceError) return { error: insuranceError }
  }

  // Pay basis: fall back to a plain-number Duration estimate when
  // Allowed hours is blank, so contractors don't end up with 0 hours.
  const allowedHours = resolveAllowedHours(input.allowed_hours, input.duration_estimate)

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: input.client_id,
      quote_id: input.quote_id || null,
      invoice_id: input.invoice_id || null,
      title: input.title || null,
      description: input.description || null,
      address: input.address || null,
      scheduled_date: input.scheduled_date || null,
      scheduled_time: input.scheduled_time || null,
      duration_estimate: input.duration_estimate || null,
      assigned_to: input.assigned_to || null,
      contractor_id: input.contractor_id || null,
      contractor_price: input.contractor_price ?? null,
      job_price: input.job_price ?? null,
      allowed_hours: allowedHours,
      internal_notes: input.internal_notes || null,
      // Phase 5.5.16 — be explicit. The CHECK only accepts
      // 'not_required'|'on_account'|'invoice_sent'|'payment_pending'|'paid'.
      // Manual jobs default to 'on_account' (matches the DB column default).
      payment_status: 'on_account',
    })
    .select('id, job_number')
    .single()

  if (error || !data) {
    return { error: `Failed to create job: ${error?.message}` }
  }

  // Save worker assignments. Seed each worker's hours_allocated from the
  // job's allowed hours so the per-worker pay basis is populated up front
  // (previously left null here, which stranded hours on multi-worker jobs).
  if (input.worker_ids?.length) {
    const cids = input.worker_ids.filter(Boolean)
    const rateMap = await loadContractorRates(supabase, cids)
    const rows = cids.map((cid) => ({
      job_id: data.id,
      contractor_id: cid,
      hours_allocated: allowedHours,
      // New job → no existing snapshot to preserve; snapshot the current rate.
      pay_rate: pickSnapshotRate(null, rateMap[cid]),
      pay_type: 'hourly',
    }))
    if (rows.length > 0) {
      await supabase.from('job_workers').upsert(rows, { onConflict: 'job_id,contractor_id' })
    }
  }

  // Notify contractor if assigned on creation
  if (input.contractor_id) {
    const { data: contractor } = await supabase
      .from('contractors')
      .select('full_name, email')
      .eq('id', input.contractor_id)
      .single()

    if (contractor) {
      await notifyContractorAssigned(contractor, {
        id: data.id,
        job_number: data.job_number,
        title: input.title || null,
        address: input.address || null,
        scheduled_date: input.scheduled_date || null,
        scheduled_time: input.scheduled_time || null,
        duration_estimate: input.duration_estimate || null,
      })
    }
  }

  redirect(`/portal/jobs/${data.id}`)
}

interface UpdateJobInput extends JobInput {
  id: string
  status?: string
  contractor_notes?: string
  // Phase 5B — admin override flag. When true and the caller is admin,
  // bypass the invoice-existence lock for this amendment. Every override
  // produces a `job.amended_after_invoice` audit row.
  force?: boolean
}

export async function updateJob(input: UpdateJobInput) {
  const supabase = createClient()

  // Load current snapshot to detect changes that need audit logging.
  // Phase quote-flow-clarity: scheduled_date / scheduled_time are
  // tracked via a `job.schedule_changed` audit_log row so an
  // operator can reconstruct a job's schedule history.
  // Phase 5B: also reads `invoice_id` and the material fields so the
  // lock guard can fire and the audit row has a before/after diff.
  // Full row — used for change detection, the amendment audit before/after,
  // and the reversible pre-edit version snapshot written after the update.
  const { data: current } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', input.id)
    .single()

  // Phase 5B — invoice-existence lock. Once a job is linked to a sent
  // invoice, edits are blocked for normal staff; an admin unlocks the whole
  // form via the "Edit anyway" gate (which captures a reason) and saves with
  // force. Every amendment is snapshotted below so it stays reversible.
  const { data: { user } } = await supabase.auth.getUser()
  const guard = assertCanAmend({
    linkedInvoiceId: (current?.invoice_id as string | null) ?? null,
    user,
    force: input.force,
  })
  if ('error' in guard) return guard

  const contractorChanged = !!input.contractor_id
    && input.contractor_id !== (current?.contractor_id ?? '')

  const previousScheduledDate = (current?.scheduled_date as string | null) ?? null
  const previousScheduledTime = (current?.scheduled_time as string | null) ?? null
  const nextScheduledDate = input.scheduled_date || null
  const nextScheduledTime = input.scheduled_time || null
  const scheduleChanged =
    previousScheduledDate !== nextScheduledDate
    || previousScheduledTime !== nextScheduledTime

  if (contractorChanged) {
    const insuranceError = await checkContractorInsurance(supabase, input.contractor_id!)
    if (insuranceError) return { error: insuranceError }
  }

  // Pay basis: fall back to a plain-number Duration estimate when
  // Allowed hours is blank, so contractors don't end up with 0 hours.
  const allowedHours = resolveAllowedHours(input.allowed_hours, input.duration_estimate)

  const patch = {
    client_id: input.client_id,
    quote_id: input.quote_id || null,
    invoice_id: input.invoice_id || null,
    status: input.status || 'draft',
    title: input.title || null,
    description: input.description || null,
    address: input.address || null,
    scheduled_date: input.scheduled_date || null,
    scheduled_time: input.scheduled_time || null,
    duration_estimate: input.duration_estimate || null,
    assigned_to: input.assigned_to || null,
    contractor_id: input.contractor_id || null,
    contractor_price: input.contractor_price ?? null,
    job_price: input.job_price ?? null,
    allowed_hours: allowedHours,
    internal_notes: input.internal_notes || null,
    contractor_notes: input.contractor_notes || null,
  }

  const { error } = await supabase.from('jobs').update(patch).eq('id', input.id)

  if (error) {
    return { error: `Failed to update job: ${error.message}` }
  }

  // Reversible-amendment snapshot — record the PRE-edit job row as a new
  // version whenever a tracked field actually changed. Locked/invoiced edits
  // carry the operator's override reason (captured at the "Edit anyway"
  // gate). Best-effort: never blocks the save.
  const changedFields = computeChangedJobFields(current, patch)
  if (current && changedFields.length > 0) {
    let reason: string | null = null
    if (guard.overridden) {
      const { data: ov } = await supabase
        .from('audit_log')
        .select('after')
        .eq('entity_id', input.id)
        .eq('action', 'job.override_initiated')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      reason = ((ov?.after as { reason?: string } | null)?.reason) ?? null
    }
    await snapshotJobVersion(supabase, {
      jobId: input.id,
      snapshot: current,
      changedFields,
      reason,
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
    })
  }

  // Phase quote-flow-clarity: schedule-change audit trail. Only
  // written when the date or time actually moved — typing a value
  // identical to the current row produces no log entry.
  if (scheduleChanged) {
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      actor_role: 'staff',
      action: 'job.schedule_changed',
      entity_table: 'jobs',
      entity_id: input.id,
      before: {
        scheduled_date: previousScheduledDate,
        scheduled_time: previousScheduledTime,
      },
      after: {
        scheduled_date: nextScheduledDate,
        scheduled_time: nextScheduledTime,
      },
    })
  }

  // Phase 5B — material-amendment audit row. Captures the headline
  // billing fields' before/after; override edits use a distinct
  // action verb so the timeline can flag them.
  const materialChanged =
       (current?.job_price       ?? null) !== (input.job_price       ?? null)
    || (current?.allowed_hours   ?? null) !== (allowedHours          ?? null)
    || (current?.description     ?? null) !== (input.description     ?? null)
    || (current?.address         ?? null) !== (input.address         ?? null)
  if (materialChanged) {
    await writeAmendmentAudit({
      supabase,
      entity: 'job',
      entityId: input.id,
      actorId: user?.id ?? null,
      overridden: guard.overridden,
      before: {
        job_price:     current?.job_price ?? null,
        allowed_hours: current?.allowed_hours ?? null,
        description:   current?.description ?? null,
        address:       current?.address ?? null,
      },
      after: {
        job_price:     input.job_price ?? null,
        allowed_hours: allowedHours ?? null,
        description:   input.description ?? null,
        address:       input.address ?? null,
      },
    })
  }

  // Replace worker assignments. Seed each worker's hours_allocated from
  // the job's allowed hours so the per-worker pay basis is populated.
  if (input.worker_ids !== undefined) {
    const cids = (input.worker_ids ?? []).filter(Boolean)
    // Preserve existing pay_rate snapshots across the re-seed so a job edit
    // never silently re-prices historical work at the live contractor rate.
    // (Full non-destructive worker handling — hours, extra-hours, IDs — is
    // PR B; this PR guarantees rate correctness only.)
    const { data: existingWorkers } = await supabase
      .from('job_workers')
      .select('contractor_id, pay_rate, pay_type')
      .eq('job_id', input.id)
    const existingRateMap: Record<string, number | null> = {}
    const existingTypeMap: Record<string, string | null> = {}
    for (const w of existingWorkers ?? []) {
      existingRateMap[w.contractor_id as string] = (w.pay_rate as number | null) ?? null
      existingTypeMap[w.contractor_id as string] = (w.pay_type as string | null) ?? null
    }
    const rateMap = await loadContractorRates(supabase, cids)

    await supabase.from('job_workers').delete().eq('job_id', input.id)
    const rows = cids.map((cid) => ({
      job_id: input.id,
      contractor_id: cid,
      hours_allocated: allowedHours,
      pay_rate: pickSnapshotRate(existingRateMap[cid], rateMap[cid]),
      // Preserve an existing pay_type; only default 'hourly' for genuinely new workers.
      pay_type: existingTypeMap[cid] ?? 'hourly',
    }))
    if (rows.length > 0) {
      await supabase.from('job_workers').insert(rows)
    }
  }

  // Notify new contractor if assignment changed
  if (contractorChanged) {
    const [{ data: contractor }, { data: job }] = await Promise.all([
      supabase.from('contractors').select('full_name, email').eq('id', input.contractor_id!).single(),
      supabase.from('jobs').select('id, job_number').eq('id', input.id).single(),
    ])

    if (contractor && job) {
      await notifyContractorAssigned(contractor, {
        id: job.id,
        job_number: job.job_number,
        title: input.title || null,
        address: input.address || null,
        scheduled_date: input.scheduled_date || null,
        scheduled_time: input.scheduled_time || null,
        duration_estimate: input.duration_estimate || null,
      })
    }
  }

  revalidatePath(`/portal/jobs/${input.id}`)
  revalidatePath('/portal/jobs')
  redirect(`/portal/jobs/${input.id}`)
}

export async function duplicateJob(jobId: string) {
  const supabase = createClient()

  const { data: source, error: loadErr } = await supabase
    .from('jobs')
    .select('client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, assigned_to, contractor_price')
    .eq('id', jobId)
    .single()

  if (loadErr || !source) {
    return { error: `Job not found: ${loadErr?.message}` }
  }

  const { data: newJob, error: createErr } = await supabase
    .from('jobs')
    .insert({
      client_id: source.client_id,
      title: source.title,
      description: source.description,
      address: source.address,
      scheduled_time: source.scheduled_time,
      duration_estimate: source.duration_estimate,
      contractor_id: source.contractor_id,
      assigned_to: source.assigned_to,
      contractor_price: source.contractor_price,
      status: 'draft',
    })
    .select('id')
    .single()

  if (createErr || !newJob) {
    return { error: `Failed to duplicate job: ${createErr?.message}` }
  }

  revalidatePath('/portal/jobs')
  redirect(`/portal/jobs/${newJob.id}/edit`)
}
