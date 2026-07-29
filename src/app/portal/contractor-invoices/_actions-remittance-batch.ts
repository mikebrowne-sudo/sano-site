'use server'

// Create an invoice-based contractor remittance batch.
//
// Snapshots the selected contractor_invoices (+ any manual adjustment
// lines) onto the batch so the remittance always matches the actual
// payment. By DEFAULT the batch is created UNPAID (payables stay approved,
// remittance.paid_at null) — staff flip it to paid via markRemittancePaid
// once the money leaves the bank. Pass markPaid:true to mark it paid on
// creation (e.g. recording a historical payment).
//
// Admin-only. Does NOT send anything — preview/PDF only.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getWorkerPayableHours } from '@/lib/job-cost'
import { reconcileRemittanceHours } from '@/lib/remittance-hours'
import { seedRemittanceNote } from '@/lib/remittance-address'
import { resolveRemittanceLineTax, type ApprovedSnapshotForRemittance } from '@/lib/contractor-remittance-tax'
import { revalidatePath } from 'next/cache'

export interface RemittanceAdjustmentInput {
  label: string
  amount: number
}

export interface CreateRemittanceBatchInput {
  paymentDate: string // YYYY-MM-DD
  reference?: string | null
  payeeLabel?: string | null
  notes?: string | null
  ciIds: string[]
  adjustments?: RemittanceAdjustmentInput[]
  markPaid?: boolean // default false — create unpaid, mark paid later
}

interface CIRow {
  id: string
  amount: number | null
  note: string | null
  contractor_id: string | null
  job_id: string | null
  payment_type: string | null
  pay_basis: string | null
  pay_hours: number | null
  site_label: string | null
  period_label: string | null
  // Explicit tax-snapshot link + schedule carried on the payable (PR 9).
  contractor_payment_snapshot_id: string | null
  service_schedule_id: string | null
  contractors: { full_name: string | null } | null
  jobs: { job_number: string | null; address: string | null } | null
}

interface WorkerRow {
  job_id: string | null
  contractor_id: string | null
  pay_rate: number | null
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
}

export async function createContractorRemittance(input: CreateRemittanceBatchInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  if (!input.paymentDate) return { error: 'Payment date is required.' }
  const ciIds = Array.from(new Set(input.ciIds ?? []))
  const adjustments = (input.adjustments ?? []).filter((a) => a.label?.trim() && Number.isFinite(a.amount))
  if (ciIds.length === 0 && adjustments.length === 0) {
    return { error: 'Select at least one invoice or add an adjustment line.' }
  }

  // Load the selected CIs (snapshot source).
  const { data: ciRaw, error: ciErr } = ciIds.length > 0
    ? await supabase
        .from('contractor_invoices')
        .select('id, amount, notes:notes, contractor_id, job_id, payment_type, pay_basis, pay_hours, site_label, period_label, contractor_payment_snapshot_id, service_schedule_id, contractors ( full_name ), jobs ( job_number, address )')
        .in('id', ciIds)
    : { data: [] as unknown[], error: null }
  if (ciErr) return { error: `Could not load invoices: ${ciErr.message}` }
  const cis = (ciRaw ?? []) as unknown as Array<CIRow & { notes: string | null }>
  if (cis.length !== ciIds.length) return { error: 'Some selected invoices could not be found.' }

  // Load the matching job_worker rows so we can snapshot hours for lines
  // that are genuinely hourly. Display-only: we only attach hours when
  // payable_hours × pay_rate exactly equals the paid amount, so the
  // remittance never implies an hourly basis a fixed-price job didn't
  // have. Anything that doesn't reconcile cleanly stays a fixed amount.
  const jobIds = Array.from(new Set(cis.map((c) => c.job_id).filter((j): j is string => !!j)))
  let workers: WorkerRow[] = []
  if (jobIds.length > 0) {
    const { data: jwRaw } = await supabase
      .from('job_workers')
      .select('job_id, contractor_id, pay_rate, hours_allocated, extra_hours, extra_hours_status')
      .in('job_id', jobIds)
    workers = (jwRaw ?? []) as unknown as WorkerRow[]
  }

  function snapshotHours(ci: CIRow & { notes: string | null }): number | null {
    // Prefer the basis recorded when the pay was approved (new approvals):
    // fixed amounts never show hours; hourly pay shows the approved hours.
    if (ci.pay_basis === 'fixed') return null
    if (ci.pay_basis === 'hourly' && ci.pay_hours != null && ci.pay_hours > 0) return ci.pay_hours
    // Legacy rows (no basis recorded) — reconstruct from the job's allowed
    // hours × rate and show only when it reconciles to the paid amount.
    if (!ci.job_id || !ci.contractor_id) return null
    const w = workers.find((x) => x.job_id === ci.job_id && x.contractor_id === ci.contractor_id)
    if (!w || w.pay_rate == null) return null
    const payable = getWorkerPayableHours({
      pay_rate: w.pay_rate,
      approved_hours: null,
      actual_hours: null,
      hours_allocated: w.hours_allocated,
      extra_hours: w.extra_hours,
      extra_hours_status: w.extra_hours_status,
    })
    return reconcileRemittanceHours(payable, w.pay_rate, ci.amount ?? 0)
  }

  // Freeze the per-line tax breakdown (PR 9) from the EXPLICIT snapshot id the
  // payable carries (contractor_payment_snapshot_id). No (contractor_id,
  // supply_date) search: a payable with no snapshot id is an ordinary
  // amount-only line; a payable WITH a snapshot id must resolve to a valid
  // approved snapshot or the whole remittance is BLOCKED (never pay a
  // tax-bearing line off a missing/invalid snapshot). Figures are copied
  // verbatim, never recomputed.
  const snapshotIds = Array.from(new Set(cis.map((c) => c.contractor_payment_snapshot_id).filter((x): x is string => !!x)))
  const snapshotsById = new Map<string, ApprovedSnapshotForRemittance>()
  if (snapshotIds.length > 0) {
    const { data: snapRaw } = await supabase
      .from('contractor_payment_tax_snapshots')
      .select('id, contractor_id, status, calc_status, service_schedule_id, supply_date, gross_ex_gst, gst_amount, withholding_rate, withholding_amount, net_bank, tax_declaration_id')
      .in('id', snapshotIds)
    for (const s of ((snapRaw ?? []) as Array<Record<string, unknown>>)) {
      snapshotsById.set(s.id as string, {
        id: s.id as string,
        contractorId: s.contractor_id as string,
        status: s.status as string,
        calcStatus: s.calc_status as string,
        serviceScheduleId: (s.service_schedule_id as string | null) ?? null,
        supplyDate: s.supply_date as string,
        grossExGst: s.gross_ex_gst == null ? null : Number(s.gross_ex_gst),
        gstAmount: s.gst_amount == null ? null : Number(s.gst_amount),
        withholdingRate: s.withholding_rate == null ? null : Number(s.withholding_rate),
        withholdingAmount: s.withholding_amount == null ? null : Number(s.withholding_amount),
        netBank: s.net_bank == null ? null : Number(s.net_bank),
        taxDeclarationId: (s.tax_declaration_id as string | null) ?? null,
      })
    }
  }

  // Resolve every line up-front; a single invalid explicit snapshot blocks the
  // whole batch (fail-fast, no partial tax-bearing remittance).
  const frozenByCi = new Map<string, ReturnType<typeof resolveRemittanceLineTax>>()
  for (const ci of cis) {
    const r = resolveRemittanceLineTax(
      { contractorId: ci.contractor_id, serviceScheduleId: ci.service_schedule_id, contractorPaymentSnapshotId: ci.contractor_payment_snapshot_id },
      snapshotsById,
    )
    if (r.kind === 'error') return { error: `Cannot create remittance: ${r.reason}. Resolve the payable's tax snapshot first.` }
    frozenByCi.set(ci.id, r)
  }

  // Create unpaid by default; only stamp paid_at when explicitly marking paid.
  const markPaid = input.markPaid === true

  // Header.
  const { data: header, error: hErr } = await supabase
    .from('contractor_remittances')
    .insert({
      payment_date: input.paymentDate,
      reference: input.reference?.trim() || null,
      payee_label: input.payeeLabel?.trim() || null,
      notes: input.notes?.trim() || null,
      paid_at: markPaid ? new Date(input.paymentDate).toISOString() : null,
      created_by: user.id,
    })
    .select('id, token')
    .single()
  if (hErr || !header) return { error: `Failed to create remittance: ${hErr?.message ?? 'no row'}` }

  // Snapshotted line items (invoices first, then adjustments).
  let sort = 0
  const items = [
    ...cis.map((ci) => {
      // Fixed contract payments usually have no linked job. Show the
      // site/client as the primary detail and the period as the sub-detail,
      // and never imply hours. Because there is no job_address on these
      // lines, the document renders the note directly (the service-keyword
      // note filter only runs when there's an address), so the fixed
      // description is not stripped.
      const isFixed = ci.payment_type === 'fixed_contract'
      const fixedPrimary = isFixed ? (ci.site_label?.trim() || null) : null
      const fixedDetail = isFixed ? (ci.period_label?.trim() || null) : null
      const fr = frozenByCi.get(ci.id)
      const tax = fr && fr.kind === 'frozen' ? fr.tax : null
      return {
        remittance_id: header.id,
        kind: 'invoice',
        contractor_invoice_id: ci.id,
        contractor_id: ci.contractor_id,
        contractor_name: ci.contractors?.full_name ?? null,
        job_number: fixedPrimary ?? (ci.jobs?.job_number ?? null),
        job_address: fixedPrimary ? null : (ci.jobs?.address ?? null),
        note: isFixed ? (fixedDetail ?? ci.notes?.trim() ?? null) : seedRemittanceNote(ci.notes, ci.jobs?.address),
        label: null,
        hours: isFixed ? null : snapshotHours(ci),
        amount: ci.amount ?? 0,
        sort: sort++,
        // Frozen tax breakdown (PR 9) — null on ordinary/non-schedular lines.
        contractor_payment_snapshot_id: tax?.contractor_payment_snapshot_id ?? null,
        gross_ex_gst: tax?.gross_ex_gst ?? null,
        gst_amount: tax?.gst_amount ?? null,
        wht_rate: tax?.wht_rate ?? null,
        wht_amount: tax?.wht_amount ?? null,
        net_paid: tax?.net_paid ?? null,
        tax_declaration_id: tax?.tax_declaration_id ?? null,
        supply_date: tax?.supply_date ?? null,
        tax_status: 'active',
        supersedes_item_id: null,
        correction_reason: null,
      }
    }),
    ...adjustments.map((a) => ({
      remittance_id: header.id,
      kind: 'adjustment',
      contractor_invoice_id: null,
      contractor_id: null,
      contractor_name: null,
      job_number: null,
      job_address: null,
      note: null,
      label: a.label.trim(),
      hours: null,
      amount: Math.round(a.amount * 100) / 100,
      sort: sort++,
      contractor_payment_snapshot_id: null,
      gross_ex_gst: null,
      gst_amount: null,
      wht_rate: null,
      wht_amount: null,
      net_paid: null,
      tax_declaration_id: null,
      supply_date: null,
      tax_status: 'active',
      supersedes_item_id: null,
      correction_reason: null,
    })),
  ]
  const { error: iErr } = await supabase.from('contractor_remittance_items').insert(items)
  if (iErr) {
    await supabase.from('contractor_remittances').delete().eq('id', header.id)
    return { error: `Failed to add lines: ${iErr.message}` }
  }

  // Mark the selected CIs paid on the payment date (only when requested).
  if (markPaid && ciIds.length > 0) {
    await supabase
      .from('contractor_invoices')
      .update({ status: 'paid', date_paid: input.paymentDate })
      .in('id', ciIds)
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_remittance.created',
    entity_table: 'contractor_remittances',
    entity_id: header.id,
    before: null,
    after: {
      payment_date: input.paymentDate,
      reference: input.reference ?? null,
      ci_ids: ciIds,
      adjustments,
      marked_paid: markPaid,
    },
  })

  revalidatePath('/portal/contractor-invoices')
  return { ok: true as const, id: header.id as string }
}
