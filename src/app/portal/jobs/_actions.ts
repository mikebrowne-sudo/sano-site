'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { assertCanAmend, writeAmendmentAudit } from '@/lib/amendment-lock'
import { resolveAllowedHours } from '@/lib/allowed-hours'
import { splitAllowedHours, resplitJobHours } from '@/lib/job-hours-split'
import { snapshotJobVersion, computeChangedJobFields } from '@/lib/job-versions'
import { pickSnapshotRate } from '@/lib/contractor-rate-snapshot'
import { planWorkerDiff, localRemovalBlock, reconcilePrimaryContractor, type WorkerRow } from '@/lib/job-worker-diff'
import { isAdminUser } from '@/lib/is-admin'

type ExistingWorkerRow = WorkerRow & { contractors: { full_name: string } | null }

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

  // Save worker assignments. allowed_hours is the job's TOTAL labour, so each
  // worker's hours_allocated is their SHARE of it — an 8h job with two
  // cleaners is 4h each. Seeding the full amount to every worker (the original
  // bug) booked 16h of pay against an 8h job.
  const createCids = (input.worker_ids ?? []).filter(Boolean)
  if (createCids.length) {
    const rateMap = await loadContractorRates(supabase, createCids)
    const shares = splitAllowedHours(allowedHours, createCids.length)
    const rows = createCids.map((cid, i) => ({
      job_id: data.id,
      contractor_id: cid,
      hours_allocated: shares[i] ?? null,
      // New job → no existing snapshot to preserve; snapshot the current rate.
      pay_rate: pickSnapshotRate(null, rateMap[cid]),
      pay_type: 'hourly',
    }))
    if (rows.length > 0) {
      await supabase.from('job_workers').upsert(rows, { onConflict: 'job_id,contractor_id' })
    }
  }

  // Notify EVERY assigned worker, each with their own share of the hours.
  // This previously notified only `input.contractor_id` (the primary pointer),
  // so on a two-cleaner job the second cleaner was never told.
  const notifyCids = createCids.length
    ? createCids
    : (input.contractor_id ? [input.contractor_id] : [])
  if (notifyCids.length) {
    const notifyShares = splitAllowedHours(allowedHours, notifyCids.length)
    const { data: people } = await supabase
      .from('contractors')
      .select('id, full_name, email')
      .in('id', notifyCids)
    const byId = new Map((people ?? []).map((p) => [p.id as string, p]))

    await Promise.all(notifyCids.map((cid, i) => {
      const person = byId.get(cid)
      if (!person) return Promise.resolve()
      return notifyContractorAssigned(person, {
        id: data.id,
        job_number: data.job_number,
        title: input.title || null,
        address: input.address || null,
        scheduled_date: input.scheduled_date || null,
        scheduled_time: input.scheduled_time || null,
        duration_estimate: input.duration_estimate || null,
        // Their share, not the job total.
        allowed_hours: notifyShares[i] ?? null,
      })
    }))
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
  // PR D — required reason when an admin overrides the job-identity lock
  // (changing address/client on a job with contractor payment history).
  identity_override_reason?: string
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

  // PR B — plan the non-destructive worker diff and validate any removals UP
  // FRONT, before any write. updateJob ends in redirect() and can't roll back,
  // so a blocked removal must abort here with nothing changed.
  const workerIdsProvided = input.worker_ids !== undefined
  const desiredCids = (input.worker_ids ?? []).filter(Boolean)

  // Existing workers (loaded in every case — needed both for the diff and to
  // validate the primary pointer). job_workers is authoritative for pay;
  // jobs.contractor_id is only a primary pointer whose invariant is: null OR a
  // member of this job's job_workers.
  const { data: existingRaw } = await supabase
    .from('job_workers')
    .select('contractor_id, pay_status, extra_hours, extra_hours_status, contractors ( full_name )')
    .eq('job_id', input.id)
  const existingRows = (existingRaw ?? []) as unknown as ExistingWorkerRow[]
  const existingCids = existingRows.map((r) => r.contractor_id)

  let workerDiff: ReturnType<typeof planWorkerDiff<ExistingWorkerRow>> | null = null
  if (workerIdsProvided) {
    workerDiff = planWorkerDiff(existingRows, desiredCids)

    for (const w of workerDiff.toRemove) {
      const nm = (w.contractors as { full_name?: string } | null)?.full_name ?? 'A contractor'
      const local = localRemovalBlock(w)
      if (local) {
        return { error: `Can’t remove ${nm} — ${local}. Handle it through a correction (void the payable / adjust) first, not by editing the job.` }
      }
      const { data: ci } = await supabase
        .from('contractor_invoices')
        .select('invoice_number')
        .eq('job_id', input.id)
        .eq('contractor_id', w.contractor_id)
        .neq('status', 'void')
        .maybeSingle()
      if (ci) {
        return { error: `Can’t remove ${nm} — has a payable (${ci.invoice_number ?? 'contractor invoice'}). Void it first.` }
      }
      const { data: pri } = await supabase
        .from('pay_run_items')
        .select('job_id')
        .eq('job_id', input.id)
        .eq('contractor_id', w.contractor_id)
        .maybeSingle()
      if (pri) {
        return { error: `Can’t remove ${nm} — part of a pay run. Void that first.` }
      }
    }
  }

  // The final worker set after this update.
  const finalCids = workerIdsProvided ? desiredCids : existingCids

  // Resolve the primary pointer under the invariant:
  //  - a SUBMITTED primary must already be in the worker set (never silently
  //    creates a worker row) — otherwise reject;
  //  - if NOT submitted, the primary is left untouched, unless the current
  //    primary was just removed from the set, in which case it is re-pointed to
  //    a remaining worker (or null). Ordinary edits never move the primary.
  const currentPrimary = (current?.contractor_id as string | null) ?? null
  const primarySubmitted = input.contractor_id !== undefined
  let effectivePrimary: string | null | undefined // undefined = leave unchanged
  if (primarySubmitted) {
    const requested = input.contractor_id || null
    if (requested === null) {
      effectivePrimary = null // explicit clear
    } else if (finalCids.includes(requested)) {
      effectivePrimary = requested
    } else {
      const nm = existingRows.find((r) => r.contractor_id === requested)?.contractors?.full_name
      return {
        error: `${nm ?? 'That contractor'} isn’t assigned to this job — add them as a worker (or use Assign) before making them the primary contractor.`,
      }
    }
  } else if (currentPrimary && !finalCids.includes(currentPrimary)) {
    effectivePrimary = reconcilePrimaryContractor(null, finalCids) // forced re-point
  } else {
    effectivePrimary = undefined
  }

  // The value we will store (unchanged when the primary wasn't submitted/forced).
  const newPrimary = effectivePrimary === undefined ? currentPrimary : effectivePrimary
  const contractorChanged = !!newPrimary && newPrimary !== (currentPrimary ?? '')

  const previousScheduledDate = (current?.scheduled_date as string | null) ?? null
  const previousScheduledTime = (current?.scheduled_time as string | null) ?? null
  const nextScheduledDate = input.scheduled_date || null
  const nextScheduledTime = input.scheduled_time || null
  const scheduleChanged =
    previousScheduledDate !== nextScheduledDate
    || previousScheduledTime !== nextScheduledTime

  if (contractorChanged) {
    const insuranceError = await checkContractorInsurance(supabase, newPrimary!)
    if (insuranceError) return { error: insuranceError }
  }

  // PR D — job-identity protection. Once a job carries contractor financial
  // history (an approved/paid contractor invoice — which also covers any
  // remittance), its IDENTITY fields — the property (address) and the customer
  // (client_id) — can no longer be changed. Changing them would repurpose a
  // paid job into different work (the JOB-0065/JOB-0066 incident). Every other
  // field stays editable for genuine corrections. A material identity change
  // must be a NEW job. An admin may override, but it is explicitly audited.
  // (job_number + recurring_job_id are not editable via this action at all, so
  // they are immutable here already.)
  const addressChanged = input.address !== undefined
    && (input.address || null) !== ((current?.address as string | null) ?? null)
  const clientChanged = input.client_id !== ((current?.client_id as string | null) ?? null)
  if (addressChanged || clientChanged) {
    const { data: fins } = await supabase
      .from('contractor_invoices')
      .select('invoice_number')
      .eq('job_id', input.id)
      .neq('status', 'void')
    const affectedInvoices = (fins ?? [])
      .map((f) => f.invoice_number as string | null)
      .filter((n): n is string => !!n)
    if (affectedInvoices.length > 0) {
      const overrideReason = input.identity_override_reason?.trim()
      // Block unless an ADMIN explicitly overrides WITH a reason. The message
      // names the payments so staff see exactly why it's frozen.
      if (!input.force || !isAdminUser(user) || !overrideReason) {
        return {
          error: `This job has contractor payment history attached (${affectedInvoices.join(', ')}), so its property or customer can’t be changed. Create a new job (or duplicate this one) for the different work.`,
        }
      }
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null, // person performing the override
        actor_role: 'admin',
        action: 'job.identity_changed_override',
        entity_table: 'jobs',
        entity_id: input.id,
        before: { address: (current?.address as string | null) ?? null, client_id: (current?.client_id as string | null) ?? null },
        after: {
          address: input.address ?? null,
          client_id: input.client_id,
          reason: overrideReason,
          affected_invoice_numbers: affectedInvoices,
          forced_by_admin: true,
        },
      })
    }
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
    contractor_id: newPrimary,
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

  // PR B — apply the non-destructive worker diff. Unchanged workers keep their
  // existing rows (id, pay_rate snapshot, allocated hours, extra-hours, pay
  // linkage) COMPLETELY untouched. Only genuinely-new workers are inserted and
  // only validated (unpaid) removals are deleted. A snapshot rate is never
  // altered as a side effect of a job/worker-list edit.
  if (workerDiff) {
    for (const w of workerDiff.toRemove) {
      await supabase.from('job_workers').delete().eq('job_id', input.id).eq('contractor_id', w.contractor_id)
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null,
        actor_role: 'staff',
        action: 'job_worker.removed',
        entity_table: 'job_workers',
        entity_id: `${input.id}:${w.contractor_id}`,
        before: { contractor_id: w.contractor_id, pay_status: w.pay_status ?? null },
        after: null,
      })
    }
    if (workerDiff.toAdd.length > 0) {
      const rateMap = await loadContractorRates(supabase, workerDiff.toAdd)
      // Hours are assigned by the re-split below, which sees the whole final
      // roster. Insert with a null basis so a new worker never briefly carries
      // the job's FULL hours.
      const addRows = workerDiff.toAdd.map((cid) => ({
        job_id: input.id,
        contractor_id: cid,
        hours_allocated: null,
        pay_rate: pickSnapshotRate(null, rateMap[cid]),
        pay_type: 'hourly',
      }))
      await supabase.from('job_workers').insert(addRows)
      for (const cid of workerDiff.toAdd) {
        await supabase.from('audit_log').insert({
          actor_id: user?.id ?? null,
          actor_role: 'staff',
          action: 'job_worker.added',
          entity_table: 'job_workers',
          entity_id: `${input.id}:${cid}`,
          before: null,
          after: { contractor_id: cid, pay_rate: pickSnapshotRate(null, rateMap[cid]) },
        })
      }
    }
  }

  // Re-split the allowed hours across the FINAL roster. The roster or the
  // allowed hours may have changed, and both move everyone's share: adding a
  // 2nd worker to an 8h job must take the 1st from 8h to 4h, or the job books
  // 12h. Workers already committed to pay are left untouched (their amount is
  // frozen) and their hours come off the pool first.
  {
    const { data: finalRaw } = await supabase
      .from('job_workers')
      .select('contractor_id, hours_allocated, pay_status')
      .eq('job_id', input.id)
      .order('contractor_id')
    const finalRows = (finalRaw ?? []) as unknown as
      { contractor_id: string; hours_allocated: number | null; pay_status: string | null }[]

    if (finalRows.length > 0) {
      // A payable freezes the amount just as a pay run does.
      const { data: payables } = await supabase
        .from('contractor_invoices')
        .select('contractor_id')
        .eq('job_id', input.id)
        .neq('status', 'void')
      const withPayable = new Set((payables ?? []).map((p) => p.contractor_id as string))

      const resplit = resplitJobHours(
        allowedHours,
        finalRows.map((r) => ({
          contractor_id: r.contractor_id,
          hours_allocated: r.hours_allocated,
          pay_status: r.pay_status,
          locked: withPayable.has(r.contractor_id),
        })),
      )

      for (const u of resplit.updates) {
        const before = finalRows.find((r) => r.contractor_id === u.contractor_id)?.hours_allocated ?? null
        if (before === u.hours_allocated) continue
        await supabase
          .from('job_workers')
          .update({ hours_allocated: u.hours_allocated })
          .eq('job_id', input.id)
          .eq('contractor_id', u.contractor_id)
        await supabase.from('audit_log').insert({
          actor_id: user?.id ?? null,
          actor_role: 'staff',
          action: 'job_worker.hours_resplit',
          entity_table: 'job_workers',
          entity_id: `${input.id}:${u.contractor_id}`,
          before: { hours_allocated: before },
          after: { hours_allocated: u.hours_allocated, allowed_hours: allowedHours, worker_count: finalRows.length },
        })
      }
    }
  }

  // Notify every NEWLY-ASSIGNED worker, plus a changed primary. Previously
  // this fired only when the primary pointer changed, so adding a second
  // cleaner to an existing job notified nobody at all.
  {
    const toNotify = new Set<string>(workerDiff?.toAdd ?? [])
    if (contractorChanged && newPrimary) toNotify.add(newPrimary)

    if (toNotify.size > 0) {
      const ids = Array.from(toNotify)
      const [{ data: people }, { data: job }, { data: finalWorkers }] = await Promise.all([
        supabase.from('contractors').select('id, full_name, email').in('id', ids),
        supabase.from('jobs').select('id, job_number').eq('id', input.id).single(),
        supabase.from('job_workers').select('contractor_id, hours_allocated').eq('job_id', input.id),
      ])
      const hoursByCid = new Map(
        (finalWorkers ?? []).map((w) => [w.contractor_id as string, (w.hours_allocated as number | null) ?? null]),
      )

      if (job) {
        await Promise.all((people ?? []).map((person) =>
          notifyContractorAssigned(person, {
            id: job.id,
            job_number: job.job_number,
            title: input.title || null,
            address: input.address || null,
            scheduled_date: input.scheduled_date || null,
            scheduled_time: input.scheduled_time || null,
            duration_estimate: input.duration_estimate || null,
            // Their post-split share, not the job total.
            allowed_hours: hoursByCid.get(person.id as string) ?? null,
          }),
        ))
      }
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
