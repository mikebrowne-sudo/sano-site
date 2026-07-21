// Shared GST snapshot for contractor payables (Stage 0 PR E).
//
// Fetches the contractor's GST registration window + tax treatment and resolves
// GST for a payable at its supply date via resolveContractorPaymentGst — the
// single source of truth. Used by the canonical job-derived approval AND the
// manual / fixed-contract create + approve paths so they behave identically.

import type { createClient } from './supabase-server'
import { resolveContractorPaymentGst, type ResolvedContractorGst } from './payroll/gst'

type Supabase = ReturnType<typeof createClient>

export interface GstSnapshotFields {
  gst_applied: boolean
  gst_amount: number
  gst_status: string
  gst_supply_date: string | null
}

export interface GstSnapshot {
  fields: GstSnapshotFields
  resolved: ResolvedContractorGst
}

export async function resolveContractorGstSnapshot(
  supabase: Supabase,
  contractorId: string,
  inclusiveAmount: number,
  supplyDate: string | null,
): Promise<GstSnapshot> {
  const { data: c } = await supabase
    .from('contractors')
    .select('gst_registered, gst_number, gst_effective_date, gst_end_date, tax_treatment')
    .eq('id', contractorId)
    .maybeSingle()

  const resolved = resolveContractorPaymentGst(
    {
      gstRegistered: (c?.gst_registered as boolean | null) ?? false,
      gstNumber: (c?.gst_number as string | null) ?? null,
      gstEffectiveDate: (c?.gst_effective_date as string | null) ?? null,
      gstEndDate: (c?.gst_end_date as string | null) ?? null,
      taxTreatment: (c?.tax_treatment as string | null) ?? null,
    },
    inclusiveAmount,
    supplyDate,
  )

  return {
    fields: {
      gst_applied: resolved.applied,
      gst_amount: resolved.gstAmount,
      gst_status: resolved.status,
      gst_supply_date: supplyDate,
    },
    resolved,
  }
}
