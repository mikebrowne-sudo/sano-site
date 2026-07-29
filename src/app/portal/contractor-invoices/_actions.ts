'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { resolveContractorGstSnapshot } from '@/lib/contractor-gst-snapshot'
import { resolveSnapshotForPayable } from '@/lib/contractor-payment-snapshot-link'

interface CIInput {
  contractor_id: string
  job_id?: string
  amount: number
  date_submitted: string
  // Explicit GST supply date, shown + confirmed by staff on the form. For a
  // fixed-contract period this should be the service-period end date. Never
  // silently assumed — falls back to date_submitted only as the form default.
  gst_supply_date?: string
  // Operational service date for a JOBLESS payable (statement-period basis).
  // Distinct from gst_supply_date (GST tax point); job-derived CIs use the
  // job's completed_at instead. Explicit only — never derived from created_at.
  service_date?: string
  notes?: string
  status?: string
  // Fixed monthly contractor payments (commercial contracts). Defaults to
  // 'standard' so existing callers are unchanged. Site/period are only used
  // for 'fixed_contract' payables (where there is usually no linked job).
  payment_type?: string
  site_label?: string | null
  period_label?: string | null
  // Schedular pipeline (PR 9): when this payable is priced from an approved
  // contractor payment tax snapshot, staff pass BOTH the service schedule and the
  // EXACT approved snapshot id. The snapshot is validated (approved/ok/same
  // contractor/same schedule/not already on another active payable) and its
  // frozen figures flow to the remittance + statement. A schedule WITHOUT a
  // snapshot id is rejected (never a silent ordinary fallback). Ordinary payables
  // omit both. isCorrection allows a snapshot to back a replacement payable.
  service_schedule_id?: string | null
  contractor_payment_snapshot_id?: string | null
  supersedes_invoice_id?: string | null
  correction_reason?: string | null
  is_correction?: boolean
  // Bypass the soft fixed-payment duplicate warning after the operator
  // confirms "create anyway".
  force?: boolean
}

async function requireAdmin(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? null : 'Admin only.'
}

export async function createContractorInvoice(input: CIInput) {
  const supabase = createClient()
  const gate = await requireAdmin(supabase)
  if (gate) return { error: gate }

  if (!input.contractor_id) return { error: 'Contractor is required.' }
  if (!input.amount || input.amount <= 0) return { error: 'Amount is required.' }

  const paymentType = input.payment_type === 'fixed_contract' ? 'fixed_contract' : 'standard'
  const siteLabel = input.site_label?.trim() || null
  const periodLabel = input.period_label?.trim() || null

  // Lightweight duplicate guard for fixed contract payments: warn (don't
  // hard-block) if this contractor already has a fixed payment for the same
  // site + period, so a monthly payment isn't entered twice by accident.
  if (paymentType === 'fixed_contract' && siteLabel && periodLabel && !input.force) {
    const { data: dupe } = await supabase
      .from('contractor_invoices')
      .select('invoice_number')
      .eq('contractor_id', input.contractor_id)
      .eq('payment_type', 'fixed_contract')
      .eq('site_label', siteLabel)
      .eq('period_label', periodLabel)
      .limit(1)
      .maybeSingle()
    if (dupe) {
      return {
        duplicate: true as const,
        message: `A fixed payment for this contractor at ${siteLabel} for ${periodLabel} already exists (${dupe.invoice_number ?? 'existing payable'}). Create another?`,
      }
    }
  }

  const dateSubmitted = input.date_submitted || new Date().toISOString().slice(0, 10)
  // Supply date for GST: the explicit staff-confirmed value; fall back to the
  // submitted date (the form shows this) rather than inventing a date.
  const supplyDate = input.gst_supply_date || dateSubmitted
  const { fields: gstFields, resolved: gst } = await resolveContractorGstSnapshot(supabase, input.contractor_id, input.amount, supplyDate)

  // Schedular pipeline (PR 9): a schedule-based payable REQUIRES an approved
  // snapshot — validate it explicitly (never infer). A schedule with no snapshot,
  // or a snapshot with no schedule, is rejected. Ordinary payables skip this.
  const scheduleId = input.service_schedule_id?.trim() || null
  const snapshotId = input.contractor_payment_snapshot_id?.trim() || null
  if (scheduleId && !snapshotId) {
    return { error: 'A schedule-based (schedular) payable requires an approved payment snapshot id.' }
  }
  if (snapshotId && !scheduleId) {
    return { error: 'A payment snapshot must be linked to its service schedule.' }
  }
  let snapshotLink: { contractor_payment_snapshot_id: string; service_schedule_id: string } | null = null
  if (snapshotId && scheduleId) {
    const resolved = await resolveSnapshotForPayable(supabase, {
      snapshotId, contractorId: input.contractor_id, serviceScheduleId: scheduleId, isCorrection: input.is_correction === true,
    })
    if ('error' in resolved) return { error: `Cannot create schedular payable: ${resolved.error}` }
    snapshotLink = { contractor_payment_snapshot_id: snapshotId, service_schedule_id: scheduleId }
  }

  const { data, error } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: input.contractor_id,
      job_id: input.job_id || null,
      amount: input.amount,
      date_submitted: dateSubmitted,
      notes: input.notes?.trim() || null,
      status: input.status || 'pending',
      payment_type: paymentType,
      site_label: paymentType === 'fixed_contract' ? siteLabel : null,
      period_label: paymentType === 'fixed_contract' ? periodLabel : null,
      // Seed the operational service date for jobless payables from the explicit
      // staff date (service_date or the confirmed GST supply date). Job-derived
      // CIs leave it null and resolve from job.completed_at at statement time.
      service_date: input.job_id ? null : (input.service_date || input.gst_supply_date || null),
      // Schedular link + correction lineage (null for ordinary payables).
      ...(snapshotLink ?? {}),
      supersedes_invoice_id: input.supersedes_invoice_id?.trim() || null,
      correction_reason: input.correction_reason?.trim() || null,
      ...gstFields,
    })
    .select('id, invoice_number')
    .single()

  if (error || !data) return { error: `Failed to create: ${error?.message}` }

  // If this is a correction, supersede the original payable (retain it).
  if (input.is_correction === true && input.supersedes_invoice_id?.trim()) {
    await supabase
      .from('contractor_invoices')
      .update({ ci_tax_status: 'superseded' })
      .eq('id', input.supersedes_invoice_id.trim())
      .neq('ci_tax_status', 'superseded')
  }

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'admin',
    action: 'contractor_invoice.created',
    entity_table: 'contractor_invoices',
    entity_id: data.id,
    before: null,
    after: {
      invoice_number: data.invoice_number ?? null,
      contractor_id: input.contractor_id,
      job_id: input.job_id || null,
      amount: input.amount,
      payment_type: paymentType,
      gst: { status: gst.status, applied: gst.applied, amount: gst.gstAmount, supply_date: supplyDate },
      contractor_payment_snapshot_id: snapshotLink?.contractor_payment_snapshot_id ?? null,
      service_schedule_id: snapshotLink?.service_schedule_id ?? null,
      is_correction: input.is_correction === true,
    },
  })

  redirect(`/portal/contractor-invoices/${data.id}`)
}

// Editing an existing payable goes through the guarded, audited path in
// `_actions-payable-edit.ts` (updateContractorPayable) — never a raw,
// unaudited update. (Admin Full Edit Mode — Stage 4.)

export async function markContractorInvoicePaid(id: string) {
  const supabase = createClient()
  const gate = await requireAdmin(supabase)
  if (gate) return { error: gate }
  const today = new Date().toISOString().slice(0, 10)

  // Capture the before-state so this money-status change is auditable (who
  // marked which payable paid, and what it was before).
  const { data: before } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, status, date_paid, amount')
    .eq('id', id)
    .maybeSingle()
  if (!before) return { error: 'Contractor invoice not found.' }

  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'paid', date_paid: today })
    .eq('id', id)

  if (error) return { error: error.message }

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'admin',
    action: 'contractor_invoice.marked_paid',
    entity_table: 'contractor_invoices',
    entity_id: id,
    before: { status: (before.status as string | null) ?? null, date_paid: (before.date_paid as string | null) ?? null },
    after: {
      invoice_number: (before.invoice_number as string | null) ?? null,
      amount: (before.amount as number | null) ?? null,
      status: 'paid',
      date_paid: today,
    },
  })

  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}

export async function approveContractorInvoice(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  // Re-resolve the GST snapshot at approval — if the contractor's GST data was
  // completed since the payable was created, this locks in the correct
  // treatment at the (unchanged) supply date. Amount is untouched.
  const { data: ci } = await supabase
    .from('contractor_invoices')
    .select('contractor_id, amount, gst_supply_date, date_submitted, invoice_number, service_schedule_id, contractor_payment_snapshot_id')
    .eq('id', id)
    .maybeSingle()
  if (!ci) return { error: 'Payable not found.' }

  // Schedular gate (PR 9): a schedule-based payable must not be approved unless it
  // still carries a valid approved snapshot. Re-validate at approval so a snapshot
  // that was superseded/voided after creation blocks approval.
  if (ci.service_schedule_id) {
    if (!ci.contractor_payment_snapshot_id) {
      return { error: 'This schedular payable has no payment snapshot — it cannot be approved.' }
    }
    const { resolveSnapshotForPayable } = await import('@/lib/contractor-payment-snapshot-link')
    const resolved = await resolveSnapshotForPayable(supabase, {
      snapshotId: ci.contractor_payment_snapshot_id as string,
      contractorId: ci.contractor_id as string,
      serviceScheduleId: ci.service_schedule_id as string,
      isCorrection: true, // it already owns this snapshot — single-use check n/a here
    })
    if ('error' in resolved) return { error: `Cannot approve schedular payable: ${resolved.error}` }
  }

  const supplyDate = (ci.gst_supply_date as string | null) ?? (ci.date_submitted as string | null) ?? null
  const { fields: gstFields, resolved: gst } = await resolveContractorGstSnapshot(supabase, ci.contractor_id as string, Number(ci.amount), supplyDate)

  // Authorise for payment: stamp who/when so a fixed contract payment (or any
  // payable) carries an audit-friendly authorised-by/at. Mirrors the
  // sent_by / created_by pattern on contractor_remittances.
  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id ?? null, ...gstFields })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'admin',
    action: 'contractor_invoice.approved',
    entity_table: 'contractor_invoices',
    entity_id: id,
    before: null,
    after: {
      invoice_number: (ci.invoice_number as string | null) ?? null,
      gst: { status: gst.status, applied: gst.applied, amount: gst.gstAmount, supply_date: supplyDate },
    },
  })

  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}
