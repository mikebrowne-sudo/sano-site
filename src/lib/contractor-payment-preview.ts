// Assemble read-only contractor payment previews per schedule (server helper).
//
// Pulls the contractor's verified tax declarations + GST history + schedules and
// runs the pure calc engine for each — a PREVIEW ONLY. Writes nothing. Used by the
// staff tax page to show gross/GST/withholding/net for the schedules as they stand
// today. The supply date defaults to today; a later PR will preview per actual
// supply/payment date.

import { getServiceSupabase } from './supabase-service'
import { computeContractorPayment, type PaymentCalc } from './contractor-payment-calc'
import type { DeclarationRecord } from './contractor-tax-declaration'
import type { GstHistoryRecord } from './contractor-gst-history'
import type { PaymentBasis, RateBasis } from './contractor-schedule-preview'
import type { ScheduleTaxTreatment } from './contractor-tax-gate'

export interface SchedulePaymentPreview {
  scheduleId: string
  name: string
  agreedAmount: number | null
  paymentBasis: PaymentBasis | null
  rateBasis: RateBasis | null
  calc: PaymentCalc | null // null when the schedule has no amount to preview
}

/** Build a payment preview for each of a contractor's active/draft schedules,
 *  as at `supplyDateIso` (default today). Read-only. */
export async function getContractorPaymentPreviews(
  contractorId: string,
  supplyDateIso?: string,
): Promise<SchedulePaymentPreview[]> {
  const svc = getServiceSupabase()
  const supply = supplyDateIso ?? new Date().toISOString().slice(0, 10)

  const [{ data: schedules }, { data: decls }, { data: gst }] = await Promise.all([
    svc.from('contractor_service_schedules')
      .select('id, name, agreed_amount, payment_basis, rate_basis, tax_treatment, status')
      .eq('contractor_id', contractorId).in('status', ['draft', 'active']).order('created_at', { ascending: true }),
    svc.from('contractor_tax_declarations')
      .select('id, status, declaration_type, withholding_rate, effective_date, expiry_date')
      .eq('contractor_id', contractorId),
    svc.from('contractor_gst_history')
      .select('id, status, gst_registered, gst_number, effective_date, end_date')
      .eq('contractor_id', contractorId),
  ])

  const taxDeclarations: DeclarationRecord[] = (decls ?? []).map((d) => ({
    id: d.id as string, status: d.status as DeclarationRecord['status'],
    declarationType: d.declaration_type as DeclarationRecord['declarationType'],
    withholdingRate: d.withholding_rate == null ? null : Number(d.withholding_rate),
    effectiveDate: (d.effective_date as string | null) ?? null, expiryDate: (d.expiry_date as string | null) ?? null,
  }))
  const gstHistory: GstHistoryRecord[] = (gst ?? []).map((g) => ({
    id: g.id as string, status: g.status as GstHistoryRecord['status'],
    gstRegistered: !!g.gst_registered, gstNumber: (g.gst_number as string | null) ?? null,
    effectiveDate: (g.effective_date as string | null) ?? null, endDate: (g.end_date as string | null) ?? null,
  }))

  return (schedules ?? []).map((s) => {
    const agreedAmount = s.agreed_amount == null ? null : Number(s.agreed_amount)
    const paymentBasis = (s.payment_basis as PaymentBasis | null) ?? null
    const rateBasis = (s.rate_basis as RateBasis | null) ?? null
    const calc = (agreedAmount != null && paymentBasis && rateBasis)
      ? computeContractorPayment({
          agreedAmount, paymentBasis, rateBasis,
          taxTreatment: (s.tax_treatment ?? null) as ScheduleTaxTreatment,
          taxDeclarations, gstHistory, supplyDateIso: supply,
        })
      : null
    return { scheduleId: s.id as string, name: (s.name as string | null) ?? '', agreedAmount, paymentBasis, rateBasis, calc }
  })
}
