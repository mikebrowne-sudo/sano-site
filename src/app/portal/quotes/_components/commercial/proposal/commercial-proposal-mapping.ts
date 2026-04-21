// Commercial proposal — pure mapping helpers.
//
// Turns raw `commercial_quote_details` + `commercial_scope_items` rows
// into client-friendly text and structured groupings used by
// CommercialProposalTemplate. Pure TypeScript, no React, no Supabase.

import type {
  CommercialQuoteDetails,
  CommercialScopeItem,
  ScopeFrequency,
  SectorCategory,
  TrafficLevel,
  OccupancyLevel,
} from '@/lib/commercialQuote'

// ── Label formatting ────────────────────────────────────────────────

const SECTOR_LABEL: Record<SectorCategory, string> = {
  office:     'office',
  education:  'education',
  medical:    'medical / healthcare',
  industrial: 'industrial / warehouse',
  mixed_use:  'mixed-use',
  custom:     'commercial',
}

export function sectorLabel(s: SectorCategory | string | null | undefined): string {
  if (!s) return 'commercial'
  return SECTOR_LABEL[s as SectorCategory] ?? String(s).replace(/_/g, ' ')
}

const FREQUENCY_LABEL: Record<ScopeFrequency, string> = {
  per_visit:   'Per visit',
  daily:       'Daily',
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  six_monthly: 'Six-monthly',
  annual:      'Annually',
  as_required: 'As required',
}

export function frequencyLabel(f: ScopeFrequency | string | null | undefined): string {
  if (!f) return 'As scheduled'
  return FREQUENCY_LABEL[f as ScopeFrequency] ?? String(f).replace(/_/g, ' ')
}

const TRAFFIC_LABEL: Record<TrafficLevel, string> = {
  low: 'Low traffic',
  medium: 'Medium traffic',
  high: 'High traffic',
}
export function trafficLabel(t: TrafficLevel | string | null | undefined): string {
  if (!t) return ''
  return TRAFFIC_LABEL[t as TrafficLevel] ?? ''
}

const OCCUPANCY_LABEL: Record<OccupancyLevel, string> = {
  low: 'Low occupancy',
  medium: 'Medium occupancy',
  high: 'High occupancy',
}
export function occupancyLabel(o: OccupancyLevel | string | null | undefined): string {
  if (!o) return ''
  return OCCUPANCY_LABEL[o as OccupancyLevel] ?? ''
}

const SERVICE_DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}
export function serviceDaysSummary(days: string[] | null | undefined): string {
  if (!days || days.length === 0) return ''
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && ['mon','tue','wed','thu','fri'].every((d) => days.includes(d))) {
    return 'Weekdays (Mon–Fri)'
  }
  return days.map((d) => SERVICE_DAY_LABEL[d] ?? d).join(', ')
}

export function buildingTypeLabel(t: string | null | undefined): string {
  if (!t) return ''
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Numeric helpers ────────────────────────────────────────────────

export function nzd(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export function fmtArea(m2: number | null | undefined): string {
  if (m2 == null || !Number.isFinite(m2) || m2 <= 0) return ''
  return `${Math.round(m2).toLocaleString('en-NZ')} m²`
}

export function fmtCount(n: number | null | undefined, singular: string, plural?: string): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return ''
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`
}

// ── Scope grouping ─────────────────────────────────────────────────
// Group scope rows into Areas → Tasks. Within an area we keep the
// operator's saved display_order so the proposal mirrors what they
// arranged in the form. Excluded rows are dropped from the visible
// scope (operator's "included" toggle is the gate).

export interface ProposalScopeArea {
  area: string                  // 'General' if area_type was empty
  tasks: ProposalScopeTask[]
}

export interface ProposalScopeTask {
  id: string
  task_group: string | null
  task_name: string
  frequency_label: string
  notes: string | null
}

export function groupScopeForProposal(
  rows: readonly CommercialScopeItem[],
): ProposalScopeArea[] {
  const included = rows.filter((r) => r.included && r.task_name && r.task_name.trim() !== '')
  const sorted = [...included].sort((a, b) => a.display_order - b.display_order)
  const byArea = new Map<string, ProposalScopeTask[]>()
  for (const r of sorted) {
    const area = (r.area_type && r.area_type.trim()) || 'General'
    if (!byArea.has(area)) byArea.set(area, [])
    byArea.get(area)!.push({
      id: r.id,
      task_group: r.task_group?.trim() || null,
      task_name: r.task_name.trim(),
      frequency_label: frequencyLabel(r.frequency),
      notes: r.notes?.trim() || null,
    })
  }
  return Array.from(byArea.entries()).map(([area, tasks]) => ({ area, tasks }))
}

// ── Site profile sentence ──────────────────────────────────────────
// One sentence that summarises what's being serviced. Built from the
// fields the operator most likely captured.

export function siteProfileSentence(details: CommercialQuoteDetails): string {
  const parts: string[] = []

  // Building / sector phrase
  const sector = sectorLabel(details.sector_category)
  const building = buildingTypeLabel(details.building_type)
  if (building) {
    parts.push(`a ${building.toLowerCase()} ${sector} site`)
  } else {
    parts.push(`a ${sector} site`)
  }

  // Area phrase
  const area = fmtArea(details.total_area_m2)
  if (area) parts.push(`covering approximately ${area}`)

  // Floors
  const floors = fmtCount(details.floor_count, 'floor')
  if (floors) parts.push(`across ${floors}`)

  // Occupancy / traffic
  const occ = occupancyLabel(details.occupancy_level)
  const traffic = trafficLabel(details.traffic_level)
  if (occ && traffic) parts.push(`with ${occ.toLowerCase()} and ${traffic.toLowerCase()}`)
  else if (occ) parts.push(`with ${occ.toLowerCase()}`)
  else if (traffic) parts.push(`with ${traffic.toLowerCase()}`)

  return parts.join(' ') + '.'
}

// ── Service rhythm sentence ────────────────────────────────────────

export function serviceRhythmSentence(details: CommercialQuoteDetails): string {
  const days = serviceDaysSummary(details.service_days)
  const window = details.service_window?.trim() || ''
  if (!days && !window) return ''
  if (days && window) return `Service is delivered ${days.toLowerCase()} during a ${window} window.`
  if (days) return `Service is delivered ${days.toLowerCase()}.`
  return `Service window: ${window}.`
}

// ── Executive summary ──────────────────────────────────────────────
// Combines site profile + service rhythm + scope row count into a
// short professional opening paragraph.

export function executiveSummary(
  details: CommercialQuoteDetails,
  scope: readonly CommercialScopeItem[],
  clientName: string | null,
): string {
  const sector = sectorLabel(details.sector_category)
  const lead = clientName
    ? `Sano has prepared this commercial cleaning proposal for ${clientName}.`
    : `Sano has prepared this commercial cleaning proposal.`

  const site = siteProfileSentence(details)
  const rhythm = serviceRhythmSentence(details)
  const includedCount = scope.filter((r) => r.included).length
  const scopeLine = includedCount > 0
    ? `The proposed programme covers ${includedCount} structured ${includedCount === 1 ? 'task' : 'tasks'} across the agreed areas, designed to maintain a consistent ${sector} cleaning standard.`
    : `The programme will cover all agreed areas to maintain a consistent ${sector} cleaning standard.`

  return [lead, `The site is ${site.charAt(0).toLowerCase()}${site.slice(1)}`, rhythm, scopeLine].filter(Boolean).join(' ')
}

// ── Multi-line text → bullets ─────────────────────────────────────
// Operator-entered assumptions / exclusions. Split on newlines or
// bullet/dash markers; if the result has more than one item, render as
// a list. Otherwise render as a single paragraph.

export function splitToBullets(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  // Try lines first
  const lines = trimmed.split(/\n+/).map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
  if (lines.length > 1) return lines
  // Fall back to single paragraph
  return [trimmed]
}

// ── Pricing presentation ──────────────────────────────────────────
// Always present the operator-set base_price as the recurring fee.
// Phase 1's selected_pricing_view stored on commercial_calculations
// determines the per-clean vs monthly framing, but base_price was set
// per that view — so we just label generically as "Service fee" and
// add an annualised value for tender feel.

export interface ProposalPricing {
  base_label: string
  base_amount: number
  addons: { label: string; amount: number }[]
  addons_total: number
  discount: number
  subtotal_ex_gst: number
  gst_amount: number
  total_inc_gst: number
  annualised_inc_gst: number   // total × 12 (operator can override mentally for one-offs)
  gst_included: boolean
}

export function computeProposalPricing(
  base_price: number,
  addons: readonly { label: string; price: number }[],
  discount: number,
  gst_included: boolean,
): ProposalPricing {
  const baseAmount = base_price ?? 0
  const addonsList = (addons ?? [])
    .filter((a) => (a.price ?? 0) > 0)
    .map((a) => ({ label: a.label, amount: a.price }))
  const addonsTotal = addonsList.reduce((s, a) => s + a.amount, 0)
  const lineTotal = baseAmount + addonsTotal - (discount ?? 0)
  const gstAmount = gst_included ? lineTotal * 3 / 23 : lineTotal * 0.15
  const subtotalExGst = gst_included ? lineTotal - gstAmount : lineTotal
  const total = gst_included ? lineTotal : lineTotal + gstAmount
  return {
    base_label: 'Service fee',
    base_amount: baseAmount,
    addons: addonsList,
    addons_total: addonsTotal,
    discount: discount ?? 0,
    subtotal_ex_gst: subtotalExGst,
    gst_amount: gstAmount,
    total_inc_gst: total,
    annualised_inc_gst: total * 12,
    gst_included,
  }
}
