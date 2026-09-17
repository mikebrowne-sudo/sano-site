'use server'

// Stage A — shared contractor-pay approval. The single source of truth
// for turning a completed job + contractor into an APPROVED contractor
// payable (contractor_invoice), which then flows into the existing
// remittance batch builder. Both the future Pending-approvals worklist
// and the job-page panel will call this, so they can't create duplicates.
//
// Admin/staff only. Does NOT mark paid, create remittances, or send email.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getWorkerPayableHours } from '@/lib/job-cost'
import { computeApprovedAmount } from '@/lib/contractor-pay'
import { isPayablePerOccurrence, isSetAmountPerVisit } from '@/lib/job-worker-pay-basis'
import { jobItemPayable } from '@/lib/job-items'
import { conciseWorkType } from '@/lib/remittance-work-type'
import { resolveContractorGstSnapshot } from '@/lib/contractor-gst-snapshot'
import { revalidatePath } from 'next/cache'

export interface ApproveContractorPayInput {
  approvedHours?: number | null
  fixedAmount?: number | null
  note?: string | null
  /** Approve pay for a job EXTRA (job_items row) rather than the job occurrence
   *  itself. The item carries its own contractor, amount and basis, and — see
   *  the guard notes below — authorises the payable on its own, without a
   *  job_workers row. */
  jobItemId?: string | null
}

export interface ApprovedPayable {
  id: string
  invoice_number: string | null
  amount: number
  status: string | null
}

export interface ApproveContractorPayResult {
  ok?: true
  payable?: ApprovedPayable
  error?: string
  // Set when a payable already exists for this job + contractor.
  alreadyApprovedId?: string
}

interface JobRow {
  id: string
  job_number: string | null
  address: string | null
  status: string | null
  completed_at: string | null
  scheduled_date: string | null
  deleted_at: string | null
  description: string | null
  quote_id: string | null
}

interface JobItemRow {
  id: string
  job_id: string
  label: string
  contractor_id: string | null
  cost_amount: number | null
  cost_basis: string | null
  cost_hours: number | null
}

interface WorkerRow {
  pay_rate: number | null
  pay_type: string | null
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
}

export async function approveContractorPay(
  jobId: string,
  contractorId: string,
  input: ApproveContractorPayInput = {},
): Promise<ApproveContractorPayResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  if (!jobId) return { error: 'Job is required.' }
  if (!contractorId) return { error: 'Contractor is required.' }

  // 1. Job must exist, be live, and be completed (or invoiced — both mean
  //    the work is done).
  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, job_number, address, status, completed_at, deleted_at, description, quote_id, scheduled_date')
    .eq('id', jobId)
    .maybeSingle()
  const job = jobRaw as JobRow | null
  if (!job) return { error: 'Job not found.' }
  if (job.deleted_at) return { error: 'Cannot approve pay for an archived job.' }
  if (job.status !== 'completed' && job.status !== 'invoiced') {
    return { error: 'This job is not completed yet, so pay cannot be approved.' }
  }

  // 1b. An EXTRA (job_items row) is paid on its own terms. Load it first, since
  //     it changes which of the gates below apply.
  const itemId = input.jobItemId?.trim() || null
  let item: JobItemRow | null = null
  if (itemId) {
    const { data: itemRaw } = await supabase
      .from('job_items')
      .select('id, job_id, label, contractor_id, cost_amount, cost_basis, cost_hours')
      .eq('id', itemId)
      .maybeSingle()
    item = itemRaw as JobItemRow | null
    if (!item) return { error: 'That extra no longer exists.' }
    if (item.job_id !== jobId) return { error: 'That extra belongs to a different job.' }
    if (!item.contractor_id) return { error: 'Set who did this extra before approving pay for it.' }
    if (item.contractor_id !== contractorId) {
      return { error: 'That extra is assigned to a different contractor.' }
    }
  }

  // 2. Contractor must be assigned to the job — FOR THE JOB ITSELF.
  //
  //    An EXTRA is deliberately exempt. The person who does the carpet clean is
  //    frequently a specialist who was never on the job roster, and adding them
  //    to job_workers to satisfy this check would be worse than skipping it:
  //    a roster row carries hours_allocated, and resplitJobHours re-splits the
  //    job's allowed hours across everyone on it, so the specialist would
  //    silently cut the actual cleaner's payable hours.
  //
  //    The item's own contractor_id (checked above) is the authorisation here.
  const { data: jwRaw } = await supabase
    .from('job_workers')
    .select('pay_rate, pay_type, hours_allocated, extra_hours, extra_hours_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  const jw = jwRaw as WorkerRow | null
  if (!jw && !item) return { error: 'This contractor is not assigned to the job.' }

  // 2b. A RETAINER is not payable per occurrence. Enforced here (not just the
  //     UI) so every entry point using this shared action is covered. The check
  //     is per worker row, so a manually-added hourly worker on a job generated
  //     from a retainer template is still payable normally. Retainer pay flows
  //     through the separate fixed-contract contractor-invoice process.
  //
  //     A SET AMOUNT PER VISIT ('per_visit') is a different thing and IS
  //     payable per occurrence — the amount simply does not depend on hours.
  //     See src/lib/job-worker-pay-basis.ts.
  //
  //     An EXTRA is exempt. A retainer covers the recurring occurrence, not
  //     separately-identified additional work: a carpet clean by a retained
  //     contractor is genuinely extra and genuinely payable. The retainer still
  //     blocks paying the occurrence itself, which is what it is there for.
  if (!item && jw && !isPayablePerOccurrence(jw.pay_type)) {
    return { error: 'This worker is on a retainer for this job — not payable per occurrence. Pay them through the fixed-contract contractor-invoice process instead.' }
  }

  // 3. Duplicate protection.
  //
  //    THE JOB ITSELF: one payable per (job, contractor) — unchanged. The
  //    `is('job_item_id', null)` branch is what preserves that exactly: a
  //    payable raised for an extra must not make the job look already paid,
  //    and vice versa.
  //
  //    AN EXTRA: at most one payable per item. A job item is separately
  //    identified work, so paying it is not paying the job again — but the same
  //    item must never be paid twice. The partial unique index
  //    contractor_invoices_job_item_uniq enforces this at the DB level too.
  const dupBase = supabase
    .from('contractor_invoices')
    .select('id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .neq('status', 'void')
  const { data: existing } = itemId
    ? await dupBase.eq('job_item_id', itemId).limit(1).maybeSingle()
    : await dupBase.is('job_item_id', null).limit(1).maybeSingle()
  if (existing?.id) {
    return {
      error: itemId
        ? 'This extra is already approved for pay.'
        : 'This job is already approved for pay for this contractor.',
      alreadyApprovedId: existing.id as string,
    }
  }

  // 4. Resolve the amount. An explicit fixed amount wins; then a set-amount-
  //    per-visit row (pay_rate IS the whole payable — never multiplied by
  //    hours); otherwise hourly (approved hours default to the worker's payable
  //    hours; rate from the job snapshot, falling back to the contractor
  //    profile).
  let calc
  if (item) {
    // An extra is priced by the ITEM, never by the job_workers row — the person
    // who did it may not have one, and if they do, their hourly rate for the
    // clean has nothing to do with what the carpet was worth.
    calc = jobItemPayable(item)
  } else if (input.fixedAmount != null) {
    calc = computeApprovedAmount({ fixedAmount: input.fixedAmount })
  } else if (jw && isSetAmountPerVisit(jw.pay_type) && jw.pay_rate != null) {
    calc = computeApprovedAmount({ fixedAmount: jw.pay_rate })
  } else {
    if (!jw) return { error: 'This contractor is not assigned to the job.' }
    const effectiveHours = input.approvedHours ?? getWorkerPayableHours({
      pay_rate: jw.pay_rate,
      approved_hours: null,
      actual_hours: null,
      hours_allocated: jw.hours_allocated,
      extra_hours: jw.extra_hours,
      extra_hours_status: jw.extra_hours_status,
    })
    let rate = jw.pay_rate
    if (rate == null) {
      const { data: c } = await supabase.from('contractors').select('hourly_rate').eq('id', contractorId).maybeSingle()
      rate = (c?.hourly_rate as number | null) ?? null
    }
    calc = computeApprovedAmount({ approvedHours: effectiveHours, rate })
  }
  if ('error' in calc) return { error: calc.error }

  // 5. Dates.
  //
  // SERVICE DATE is when the work was actually PERFORMED — the job's scheduled
  // date. It drives which pay period the payable falls into, so it must not be
  // inferred from `completed_at`: a job worked on the 12th but not marked
  // complete until the 19th would otherwise land in the wrong fortnight, and
  // the operator's period filter silently misses it. That happened in
  // production — JOB-0289 (worked 12 Aug, completed 19 Aug) and JOB-0252
  // (worked 22 Jul, completed 18 Aug, a 27-day drift across two periods).
  //
  // Falls back to completed_at, then today, so a job with no scheduled date
  // still gets a usable date rather than null (a null service date is excluded
  // from every period and becomes invisible in the pay run).
  const serviceDate =
    job.scheduled_date
      ? String(job.scheduled_date).slice(0, 10)
      : job.completed_at
        ? String(job.completed_at).slice(0, 10)
        : new Date().toISOString().slice(0, 10)

  // DATE SUBMITTED / GST SUPPLY DATE remain keyed to completion, unchanged.
  // The supply date has GST-period consequences and is deliberately NOT
  // altered here; changing it is a separate decision from fixing pay periods.
  const dateSubmitted = job.completed_at ? String(job.completed_at).slice(0, 10) : new Date().toISOString().slice(0, 10)

  // 5b. GST snapshot at the supply date. Contractor rates are GST-INCLUSIVE, so
  //     GST is split OUT with 3/23 (never added on top) only when the contractor
  //     was GST-registered on the supply date. The full inclusive amount stays
  //     the payable total. Unresolved status (pending review / incomplete data)
  //     is FLAGGED, not guessed. Historical paid invoices are never recomputed.
  const gstSupplyDate = dateSubmitted // job's completed_at
  const { fields: gstFields, resolved: gst } = await resolveContractorGstSnapshot(supabase, contractorId, calc.amount, gstSupplyDate)

  // Note = a concise work type for the remittance advice, NOT the full job
  // description (which made the advice cluttered). Operator-supplied note
  // wins; otherwise derive a short clean type from the linked quote; if
  // none, leave it blank rather than dumping the scope text.
  let workType: string | null = null
  if (job.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('type_of_clean, service_type')
      .eq('id', job.quote_id)
      .maybeSingle()
    workType = conciseWorkType((quote ?? {}) as { type_of_clean?: string | null; service_type?: string | null })
  }
  // For an extra the label IS the work type, and it is far more useful on a
  // remittance advice than the job's clean type ("Carpet clean — lounge & hall"
  // rather than "End of Tenancy Clean", which the specialist never did).
  const note = input.note?.trim() || (item ? item.label : workType) || null

  // 6. Create the approved payable. CI-#### is set by the DB trigger.
  const { data: created, error: insErr } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: contractorId,
      job_id: jobId,
      amount: calc.amount,
      date_submitted: dateSubmitted,
      // Persisted so the pay run periodises by when the work happened.
      service_date: serviceDate,
      notes: note,
      status: 'approved',
      // Record how the pay was approved so the remittance can show hours for
      // hourly pay and a dollar amount only for a fixed (manually-set) amount.
      pay_basis: calc.basis,
      pay_hours: calc.hours,
      // Links the payable to the extra it pays for. NULL for an ordinary job
      // payable, which is what the duplicate guard above keys on.
      job_item_id: itemId,
      // GST snapshot (amount stays GST-inclusive; gst_amount is the 3/23 portion).
      ...gstFields,
    })
    .select('id, invoice_number, amount, status')
    .single()
  if (insErr || !created) {
    return { error: `Could not create the contractor payable: ${insErr?.message ?? 'no row returned'}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_pay.approved',
    entity_table: 'contractor_invoices',
    entity_id: created.id,
    before: null,
    after: {
      job_id: jobId,
      job_number: job.job_number,
      contractor_id: contractorId,
      job_item_id: itemId,
      job_item_label: item?.label ?? null,
      basis: calc.basis,
      hours: calc.hours,
      amount: calc.amount,
      date_submitted: dateSubmitted,
      gst: { status: gst.status, applied: gst.applied, amount: gst.gstAmount, supply_date: dateSubmitted },
    },
  })

  revalidatePath('/portal/contractor-invoices')
  revalidatePath(`/portal/jobs/${jobId}`)
  return {
    ok: true,
    payable: {
      id: created.id as string,
      invoice_number: (created.invoice_number as string | null) ?? null,
      amount: created.amount as number,
      status: (created.status as string | null) ?? 'approved',
    },
  }
}
