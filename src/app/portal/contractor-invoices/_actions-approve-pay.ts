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
import { conciseWorkType } from '@/lib/remittance-work-type'
import { resolveContractorPaymentGst } from '@/lib/payroll/gst'
import { revalidatePath } from 'next/cache'

export interface ApproveContractorPayInput {
  approvedHours?: number | null
  fixedAmount?: number | null
  note?: string | null
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
  deleted_at: string | null
  description: string | null
  quote_id: string | null
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
    .select('id, job_number, address, status, completed_at, deleted_at, description, quote_id')
    .eq('id', jobId)
    .maybeSingle()
  const job = jobRaw as JobRow | null
  if (!job) return { error: 'Job not found.' }
  if (job.deleted_at) return { error: 'Cannot approve pay for an archived job.' }
  if (job.status !== 'completed' && job.status !== 'invoiced') {
    return { error: 'This job is not completed yet, so pay cannot be approved.' }
  }

  // 2. Contractor must be assigned to the job.
  const { data: jwRaw } = await supabase
    .from('job_workers')
    .select('pay_rate, pay_type, hours_allocated, extra_hours, extra_hours_status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  const jw = jwRaw as WorkerRow | null
  if (!jw) return { error: 'This contractor is not assigned to the job.' }

  // 2b. Fixed-contract basis is NOT payable per occurrence. Enforced here (not
  //     just the UI) so every entry point using this shared action is covered.
  //     The check is per worker row, so a manually-added hourly worker on a job
  //     generated from a fixed recurring template is still payable normally.
  //     Fixed-contract pay flows through the separate fixed-contract
  //     contractor-invoice process.
  if (jw.pay_type === 'fixed') {
    return { error: 'This worker is on a fixed-contract basis for this job — not payable per occurrence. Pay them through the fixed-contract contractor-invoice process instead.' }
  }

  // 3. Duplicate protection — one payable per job + contractor. (Admin
  //    override is a later stage.)
  const { data: existing } = await supabase
    .from('contractor_invoices')
    .select('id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .neq('status', 'void')
    .limit(1)
    .maybeSingle()
  if (existing?.id) {
    return { error: 'This job is already approved for pay for this contractor.', alreadyApprovedId: existing.id as string }
  }

  // 4. Resolve the amount. Fixed wins; otherwise hourly (approved hours
  //    default to the worker's payable hours; rate from the job snapshot,
  //    falling back to the contractor profile).
  let calc
  if (input.fixedAmount != null) {
    calc = computeApprovedAmount({ fixedAmount: input.fixedAmount })
  } else {
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

  // 5. Date = job completion date by default (not today). This is also the GST
  //    SUPPLY DATE for the payment.
  const dateSubmitted = job.completed_at ? String(job.completed_at).slice(0, 10) : new Date().toISOString().slice(0, 10)

  // 5b. GST snapshot at the supply date. Contractor rates are GST-INCLUSIVE, so
  //     GST is split OUT with 3/23 (never added on top) only when the contractor
  //     was GST-registered on the supply date. The full inclusive amount stays
  //     the payable total. Unresolved status (pending review / incomplete data)
  //     is FLAGGED, not guessed. Historical paid invoices are never recomputed.
  const { data: gstC } = await supabase
    .from('contractors')
    .select('gst_registered, gst_number, gst_effective_date, tax_treatment')
    .eq('id', contractorId)
    .maybeSingle()
  const gst = resolveContractorPaymentGst(
    {
      gstRegistered: (gstC?.gst_registered as boolean | null) ?? false,
      gstNumber: (gstC?.gst_number as string | null) ?? null,
      gstEffectiveDate: (gstC?.gst_effective_date as string | null) ?? null,
      taxTreatment: (gstC?.tax_treatment as string | null) ?? null,
    },
    calc.amount,
    dateSubmitted,
  )

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
  const note = input.note?.trim() || workType || null

  // 6. Create the approved payable. CI-#### is set by the DB trigger.
  const { data: created, error: insErr } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: contractorId,
      job_id: jobId,
      amount: calc.amount,
      date_submitted: dateSubmitted,
      notes: note,
      status: 'approved',
      // Record how the pay was approved so the remittance can show hours for
      // hourly pay and a dollar amount only for a fixed (manually-set) amount.
      pay_basis: calc.basis,
      pay_hours: calc.hours,
      // GST snapshot (amount stays GST-inclusive; gst_amount is the 3/23 portion).
      gst_applied: gst.applied,
      gst_amount: gst.gstAmount,
      gst_status: gst.status,
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
