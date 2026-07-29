// Turn contractor service schedules into agreement-document "Schedule A / B / C"
// blocks. Pure + DB-free so the display mapping + labelling is unit-tested and
// shared by the live render (draft agreements) and the frozen snapshot (sent /
// signed agreements).
//
// DISPLAY TERMS ONLY. No withholding, GST or tax math here — PR 2 shows the
// agreed commercial terms exactly as staff entered them. The calc engine is a
// later PR.

import type { PaymentBasis, PaymentMethod, RateBasis } from './contractor-schedule-preview'

/** The frozen, display-only shape stored in
 *  employment_agreements.service_schedules_snapshot and rendered by the document. */
export interface AgreementScheduleBlock {
  id: string
  label: string // "Schedule A", "Schedule B", …
  name: string
  customer: string | null
  classification: 'residential' | 'commercial' | null
  serviceType: string | null
  serviceAddress: string | null
  startDate: string | null
  frequency: string | null
  term: 'ongoing' | 'fixed' | null
  paymentMethod: PaymentMethod | null
  paymentBasis: PaymentBasis | null
  rateBasis: RateBasis | null
  agreedAmount: number | null
  noticePeriod: string | null
  priceReviewDate: string | null
  closureTreatment: string | null
  additionalWorkApproval: string | null
  equipmentProducts: string | null
}

/** Minimal schedule input the builder needs (a subset of ServiceSchedule + an
 *  optional resolved customer name). */
export interface ScheduleForBlock {
  id: string
  name: string
  customerName?: string | null
  classification?: 'residential' | 'commercial' | null
  serviceType?: string | null
  serviceAddress?: string | null
  startDate?: string | null
  frequency?: string | null
  term?: 'ongoing' | 'fixed' | null
  paymentMethod?: PaymentMethod | null
  paymentBasis?: PaymentBasis | null
  rateBasis?: RateBasis | null
  agreedAmount?: number | null
  noticePeriod?: string | null
  priceReviewDate?: string | null
  closureTreatment?: string | null
  additionalWorkApproval?: string | null
  equipmentProducts?: string | null
  status?: string
}

/** A→Z schedule label by index (A, B, …, Z, then AA, AB, …). */
export function scheduleLabel(index: number): string {
  let n = index
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `Schedule ${s}`
}

/** Build ordered, labelled blocks from a contractor's schedules. Only 'active'
 *  and 'draft' schedules appear on an agreement; 'superseded'/'ended' are
 *  excluded (a superseded version must never show alongside its replacement). */
export function buildScheduleBlocks(schedules: ScheduleForBlock[]): AgreementScheduleBlock[] {
  return schedules
    .filter((s) => s.status !== 'superseded' && s.status !== 'ended')
    .map((s, i) => ({
      id: s.id,
      label: scheduleLabel(i),
      name: s.name,
      customer: s.customerName ?? null,
      classification: s.classification ?? null,
      serviceType: s.serviceType ?? null,
      serviceAddress: s.serviceAddress ?? null,
      startDate: s.startDate ?? null,
      frequency: s.frequency ?? null,
      term: s.term ?? null,
      paymentMethod: s.paymentMethod ?? null,
      paymentBasis: s.paymentBasis ?? null,
      rateBasis: s.rateBasis ?? null,
      agreedAmount: s.agreedAmount ?? null,
      noticePeriod: s.noticePeriod ?? null,
      priceReviewDate: s.priceReviewDate ?? null,
      closureTreatment: s.closureTreatment ?? null,
      additionalWorkApproval: s.additionalWorkApproval ?? null,
      equipmentProducts: s.equipmentProducts ?? null,
    }))
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  hourly: 'Hourly rate',
  fixed_per_clean: 'Fixed amount per clean',
  fixed_weekly: 'Fixed weekly amount',
  fixed_fortnightly: 'Fixed fortnightly amount',
  fixed_monthly: 'Fixed monthly amount',
  project: 'Project amount',
  custom: 'Custom arrangement',
}

function money(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

/**
 * The plain-English pay line for a schedule block (display only). Reflects
 * payment basis + rate basis honestly without any tax computation:
 *   guaranteed_net → "Guaranteed net payment of $X per month"
 *   gross_fee      → "$X per <period>, GST <exclusive|inclusive>"
 */
export function schedulePayLine(b: AgreementScheduleBlock): string {
  const amount = money(b.agreedAmount)
  if (b.agreedAmount == null || b.paymentMethod == null) {
    return b.paymentMethod ? METHOD_LABEL[b.paymentMethod] : 'To be confirmed'
  }
  const gst = b.rateBasis === 'gst_inclusive' ? 'GST inclusive' : 'GST exclusive'
  if (b.paymentMethod === 'hourly') return `${amount} per hour (${gst})`

  const period =
    b.paymentMethod === 'fixed_weekly' ? 'per week'
    : b.paymentMethod === 'fixed_fortnightly' ? 'per fortnight'
    : b.paymentMethod === 'fixed_monthly' ? 'per month'
    : b.paymentMethod === 'fixed_per_clean' ? 'per clean'
    : ''

  if (b.paymentBasis === 'guaranteed_net') {
    return `Guaranteed net payment of ${amount}${period ? ' ' + period : ''} (${gst})`
  }
  return `${amount}${period ? ' ' + period : ''} (${gst})`
}
