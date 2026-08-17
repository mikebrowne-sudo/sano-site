// "Awaiting payment" — remittances created but not yet paid out.
//
// The missing middle stage of the contractor pay workflow:
//
//   Awaiting approval -> Ready to pay -> AWAITING PAYMENT -> Paid -> Bank confirmed
//
// Ready to pay counts approved payables NOT yet on a remittance. Once a
// remittance is created those payables are (correctly) excluded from Ready to
// pay — but until this loader existed, the money then became invisible on the
// Pay Run screen. A prepared-but-unpaid run could be forgotten entirely, which
// is exactly what happened with the July run (RA-0024..RA-0027, $3,890).
//
// Voided remittances need no exclusion: voidRemittanceBatch HARD-DELETES the
// batch and its items, so any surviving row is genuinely live. `paid_at IS NULL`
// is therefore a complete filter.
//
// Read-only. Nothing here writes paid_at, payment_confirmed or allocations.

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveContractorServiceDate } from './contractor-service-date'
import { toNzCalendarDate } from './contractor-statement-period'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface AwaitingPaymentLine {
  itemId: string
  contractorName: string | null
  jobNumber: string | null
  jobAddress: string | null
  serviceDate: string | null
  amount: number
  /** Adjustment lines carry no invoice and no job. */
  isAdjustment: boolean
  label: string | null
}

export interface AwaitingPaymentRemittance {
  id: string
  remittanceNumber: string
  payeeLabel: string | null
  reference: string | null
  paymentDate: string | null
  createdAt: string | null
  sentAt: string | null
  total: number
  itemCount: number
  /** Distinct jobs on the remittance (adjustments excluded). */
  jobCount: number
  /** Earliest / latest resolved service date across the items, or null. */
  serviceFrom: string | null
  serviceTo: string | null
  /** Items whose service date could not be resolved — never invent a range. */
  undatedCount: number
  lines: AwaitingPaymentLine[]
}

export interface AwaitingPaymentSummary {
  total: number
  remittanceCount: number
  payeeCount: number
  remittances: AwaitingPaymentRemittance[]
}

/**
 * Every unpaid remittance with its frozen items.
 *
 * Sorted by payment date so distinct pay periods stay visually separate —
 * deliberately NOT grouped by payee, because one payee can legitimately hold
 * two remittances for different periods (VMK LTD has both the July run
 * RA-0027 and the August RA-0023). Grouping by payee would imply they belong
 * together and invite paying the wrong one.
 */
export async function loadAwaitingPayment(supabase: SupabaseClient): Promise<AwaitingPaymentSummary> {
  const { data: headers } = await supabase
    .from('contractor_remittances')
    .select('id, remittance_number, payee_label, reference, payment_date, created_at, sent_at')
    .is('paid_at', null)
    .order('payment_date', { ascending: true })

  const heads = (headers ?? []) as Array<{
    id: string; remittance_number: string; payee_label: string | null
    reference: string | null; payment_date: string | null; created_at: string | null; sent_at: string | null
  }>
  if (heads.length === 0) {
    return { total: 0, remittanceCount: 0, payeeCount: 0, remittances: [] }
  }

  const ids = heads.map((h) => h.id)
  const { data: itemsRaw } = await supabase
    .from('contractor_remittance_items')
    .select('id, remittance_id, contractor_name, job_number, job_address, amount, kind, label, sort, tax_status, contractor_invoices ( job_id, service_date, gst_supply_date, jobs ( completed_at ) )')
    .in('remittance_id', ids)
    .order('sort', { ascending: true })

  const flat = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

  const byRemittance = new Map<string, AwaitingPaymentLine[]>()
  for (const raw of (itemsRaw ?? []) as Array<Record<string, unknown>>) {
    // A superseded line is a correction, not live money.
    if ((raw.tax_status as string | null) === 'superseded') continue

    const ci = flat(raw.contractor_invoices) as
      { job_id: string | null; service_date: string | null; gst_supply_date: string | null; jobs: unknown } | null
    const job = flat(ci?.jobs) as { completed_at: string | null } | null
    const serviceDate = ci
      ? resolveContractorServiceDate({
          job_id: ci.job_id,
          job_completed_at_nz: toNzCalendarDate(job?.completed_at ?? null),
          service_date: ci.service_date,
          gst_supply_date: ci.gst_supply_date,
        }).date
      : null

    const rid = raw.remittance_id as string
    const arr = byRemittance.get(rid) ?? []
    arr.push({
      itemId: raw.id as string,
      contractorName: (raw.contractor_name as string | null) ?? null,
      jobNumber: (raw.job_number as string | null) ?? null,
      jobAddress: (raw.job_address as string | null) ?? null,
      serviceDate,
      amount: round2(Number(raw.amount ?? 0)),
      isAdjustment: (raw.kind as string | null) === 'adjustment',
      label: (raw.label as string | null) ?? null,
    })
    byRemittance.set(rid, arr)
  }

  const remittances: AwaitingPaymentRemittance[] = heads.map((h) => {
    const lines = byRemittance.get(h.id) ?? []
    const dated = lines.map((l) => l.serviceDate).filter((d): d is string => !!d).sort()
    const jobs = new Set(lines.filter((l) => !l.isAdjustment && l.jobNumber).map((l) => l.jobNumber as string))
    return {
      id: h.id,
      remittanceNumber: h.remittance_number,
      payeeLabel: h.payee_label,
      reference: h.reference,
      paymentDate: h.payment_date,
      createdAt: h.created_at,
      sentAt: h.sent_at,
      total: round2(lines.reduce((s, l) => s + l.amount, 0)),
      itemCount: lines.length,
      jobCount: jobs.size,
      serviceFrom: dated[0] ?? null,
      serviceTo: dated[dated.length - 1] ?? null,
      undatedCount: lines.filter((l) => !l.isAdjustment && !l.serviceDate).length,
      lines,
    }
  })

  return {
    total: round2(remittances.reduce((s, r) => s + r.total, 0)),
    remittanceCount: remittances.length,
    payeeCount: new Set(remittances.map((r) => r.payeeLabel ?? r.remittanceNumber)).size,
    remittances,
  }
}
