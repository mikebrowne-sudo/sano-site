// Read-only loader for the contractor tax remediation report (PR 10). Reads
// historical contractor records and feeds the pure buildRemediationReport engine.
// Makes NO writes of any kind. Never creates invoices, snapshots, liabilities or
// remittances; never touches any production record. Read-only throughout.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildRemediationReport, type RemediationReport,
  type RemediationInvoice, type RemediationSnapshot, type RemediationRemittanceItem,
} from '@/lib/contractor-tax-remediation'

export async function loadRemediationReport(supabase: SupabaseClient): Promise<RemediationReport> {
  // ── Contractors: tax treatment + which have a CURRENT verified IR330C. ──────
  const { data: contractorsRaw } = await supabase
    .from('contractors')
    .select('id, full_name, tax_treatment')
  const contractors = (contractorsRaw ?? []) as Array<{ id: string; full_name: string | null; tax_treatment: string | null }>
  const nameById = new Map(contractors.map((c) => [c.id, c.full_name ?? null]))
  const treatmentById = new Map(contractors.map((c) => [c.id, c.tax_treatment ?? null]))

  const { data: declRaw } = await supabase
    .from('contractor_tax_declarations')
    .select('contractor_id')
    .eq('status', 'verified')
    .is('superseded_at', null)
  const verifiedDeclContractors = new Set((declRaw ?? []).map((d) => d.contractor_id as string))

  // ── Invoices (exclude void/superseded at query where cheap; engine re-checks). ─
  const { data: ciRaw } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, contractor_id, amount, status, ci_tax_status, payment_type, service_schedule_id, contractor_payment_snapshot_id, gst_status, gst_supply_date')
  const invoices: RemediationInvoice[] = ((ciRaw ?? []) as Array<Record<string, unknown>>).map((r) => {
    const contractorId = (r.contractor_id as string | null) ?? null
    return {
      id: r.id as string,
      invoiceNumber: (r.invoice_number as string | null) ?? null,
      contractorId,
      contractorName: contractorId ? (nameById.get(contractorId) ?? null) : null,
      amount: r.amount == null ? null : Number(r.amount),
      status: (r.status as string | null) ?? null,
      ciTaxStatus: (r.ci_tax_status as string | null) ?? null,
      paymentType: (r.payment_type as string | null) ?? null,
      serviceScheduleId: (r.service_schedule_id as string | null) ?? null,
      contractorPaymentSnapshotId: (r.contractor_payment_snapshot_id as string | null) ?? null,
      gstStatus: (r.gst_status as string | null) ?? null,
      supplyDate: (r.gst_supply_date as string | null) ?? null,
      contractorTaxTreatment: contractorId ? (treatmentById.get(contractorId) ?? null) : null,
      contractorHasVerifiedDeclaration: contractorId ? verifiedDeclContractors.has(contractorId) : false,
    }
  })

  // ── Approved snapshots + which have an ACTIVE withholding line. ─────────────
  const { data: snapRaw } = await supabase
    .from('contractor_payment_tax_snapshots')
    .select('id, snapshot_number, contractor_id, status, calc_status, tax_treatment, withholding_amount, supply_date')
    .eq('status', 'approved')
  const snapshotRows = (snapRaw ?? []) as Array<Record<string, unknown>>

  const { data: wlRaw } = await supabase
    .from('contractor_withholding_lines')
    .select('payment_snapshot_id')
    .eq('status', 'active')
  const snapshotsWithActiveLine = new Set((wlRaw ?? []).map((w) => w.payment_snapshot_id as string))

  const snapshots: RemediationSnapshot[] = snapshotRows.map((r) => {
    const contractorId = (r.contractor_id as string | null) ?? null
    return {
      id: r.id as string,
      snapshotNumber: (r.snapshot_number as string | null) ?? null,
      contractorId,
      contractorName: contractorId ? (nameById.get(contractorId) ?? null) : null,
      status: (r.status as string | null) ?? null,
      calcStatus: (r.calc_status as string | null) ?? null,
      taxTreatment: (r.tax_treatment as string | null) ?? null,
      withholdingAmount: r.withholding_amount == null ? null : Number(r.withholding_amount),
      supplyDate: (r.supply_date as string | null) ?? null,
      hasActiveWithholdingLine: snapshotsWithActiveLine.has(r.id as string),
    }
  })

  // ── Active remittance items whose source payable is tax-bearing. ────────────
  // A payable is tax-bearing when it carries a snapshot id or references a
  // service schedule (the schedular pipeline).
  const taxBearingCiIds = new Set(
    invoices.filter((ci) => ci.contractorPaymentSnapshotId || ci.serviceScheduleId).map((ci) => ci.id),
  )
  const { data: riRaw } = await supabase
    .from('contractor_remittance_items')
    .select('id, contractor_invoice_id, contractor_name, amount, tax_status, contractor_payment_snapshot_id')
    .eq('kind', 'invoice')
  const remittanceItems: RemediationRemittanceItem[] = ((riRaw ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    contractorInvoiceId: (r.contractor_invoice_id as string | null) ?? null,
    contractorName: (r.contractor_name as string | null) ?? null,
    amount: r.amount == null ? null : Number(r.amount),
    taxStatus: (r.tax_status as string | null) ?? null,
    contractorPaymentSnapshotId: (r.contractor_payment_snapshot_id as string | null) ?? null,
    payableIsTaxBearing: r.contractor_invoice_id != null && taxBearingCiIds.has(r.contractor_invoice_id as string),
  }))

  return buildRemediationReport({ invoices, snapshots, remittanceItems })
}
