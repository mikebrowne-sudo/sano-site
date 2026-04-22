// Commercial proposal — client-facing mapping layer.
//
// Transforms raw commercial_quote_details + commercial_scope_items rows
// into the polished, categorised content the CommercialProposalTemplate
// renders. Pure TypeScript, no React, no Supabase. Safe for any layer
// to import.
//
// The goal is: "raw DB data → proposal-ready content". Nothing in the
// output should expose backend field names (quantity_type, unit_minutes,
// production_rate, margin tier internals, etc).

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
  office:     'Office',
  education:  'Education',
  medical:    'Medical / Healthcare',
  industrial: 'Industrial / Warehouse',
  mixed_use:  'Mixed-use',
  custom:     'Commercial',
}
export function sectorLabel(s: SectorCategory | string | null | undefined): string {
  if (!s) return 'Commercial'
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
  low: 'Low', medium: 'Medium', high: 'High',
}
export function trafficLabel(t: TrafficLevel | string | null | undefined): string {
  if (!t) return ''
  return TRAFFIC_LABEL[t as TrafficLevel] ?? ''
}

const OCCUPANCY_LABEL: Record<OccupancyLevel, string> = {
  low: 'Low', medium: 'Medium', high: 'High',
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
  const weekdays = ['mon','tue','wed','thu','fri']
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return 'Weekdays (Mon–Fri)'
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

// ── Scope categorisation — smart grouping into proposal sections ──

export type ProposalGroupKey =
  | 'general_areas'
  | 'offices_workstations'
  | 'kitchens_breakout'
  | 'bathrooms_washrooms'
  | 'common_areas'
  | 'specialist_areas'

export const PROPOSAL_GROUP_LABEL: Record<ProposalGroupKey, string> = {
  general_areas:         'General Areas',
  offices_workstations:  'Offices / Workstations',
  kitchens_breakout:     'Kitchens / Breakout Areas',
  bathrooms_washrooms:   'Bathrooms / Washrooms',
  common_areas:          'Common Areas',
  specialist_areas:      'Specialist Areas',
}

// Display order — groups render in this order when populated. Groups
// with zero rows are not rendered at all.
export const PROPOSAL_GROUP_ORDER: readonly ProposalGroupKey[] = [
  'general_areas',
  'offices_workstations',
  'kitchens_breakout',
  'bathrooms_washrooms',
  'common_areas',
  'specialist_areas',
]

// Keyword patterns used to classify a scope row into a proposal group.
// Case-insensitive substring checks against task_group, area_type, and
// task_name (in that priority order). The first pattern that matches
// wins. Anything unmatched falls into general_areas.
const KEYWORD_PATTERNS: readonly [ProposalGroupKey, RegExp][] = [
  ['bathrooms_washrooms',  /bath|toilet|washroom|shower|urinal|lavatory|restroom/i],
  ['kitchens_breakout',    /kitchen|breakroom|break\s*room|pantry|tea\s*point|cafe|caf[ée]|staff\s*room|staffroom|lunch/i],
  ['offices_workstations', /office|workstation|desk|cubicle|meeting\s*room|board\s*room|boardroom|conference/i],
  ['common_areas',         /reception|lobby|foyer|hall|hallway|corridor|stair|entry|entrance|lift|elevator|lounge|waiting/i],
  ['specialist_areas',     /clinical|treatment|surgery|lab|laboratory|imaging|sterile|clean\s*room|cleanroom|workshop|warehouse|loading|dock|machinery|plant\s*room/i],
]

function classifyRow(row: CommercialScopeItem): ProposalGroupKey {
  const haystacks = [row.task_group, row.area_type, row.task_name].filter(Boolean) as string[]
  for (const [group, pattern] of KEYWORD_PATTERNS) {
    for (const h of haystacks) {
      if (pattern.test(h)) return group
    }
  }
  return 'general_areas'
}

// ── Proposal scope shapes ──────────────────────────────────────────

export interface ProposalScopeTask {
  id: string
  task_name: string
  frequency_label: string
  area_type: string | null      // surfaced in the bullet when not already the group label
  notes: string | null
}

export interface ProposalScopeGroup {
  key: ProposalGroupKey
  label: string
  tasks: ProposalScopeTask[]
}

// Groups included scope rows into proposal sections. Excluded rows
// (operator unchecked the "included" flag) are dropped. Tasks within
// a group are ordered by the operator's saved display_order so the
// proposal mirrors the form.
export function groupScopeForProposal(
  rows: readonly CommercialScopeItem[],
): ProposalScopeGroup[] {
  const buckets = new Map<ProposalGroupKey, ProposalScopeTask[]>()
  const included = rows
    .filter((r) => r.included && r.task_name && r.task_name.trim() !== '')
    .slice()
    .sort((a, b) => a.display_order - b.display_order)

  for (const r of included) {
    const key = classifyRow(r)
    const task: ProposalScopeTask = {
      id: r.id,
      task_name: r.task_name.trim(),
      frequency_label: frequencyLabel(r.frequency),
      area_type: r.area_type?.trim() || null,
      notes: r.notes?.trim() || null,
    }
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(task)
  }

  return PROPOSAL_GROUP_ORDER
    .filter((k) => (buckets.get(k) ?? []).length > 0)
    .map((k) => ({
      key: k,
      label: PROPOSAL_GROUP_LABEL[k],
      tasks: buckets.get(k)!,
    }))
}

// ── Assumption / exclusion splitting ───────────────────────────────

// Operator-entered multi-line text → array of list items when it looks
// like a list (multiple lines, or obvious bullet markers), otherwise a
// single entry used as a paragraph.
export function splitToBullets(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  if (lines.length > 1) return lines
  return [trimmed]
}

// ── Site profile + service-schedule sentences ─────────────────────

export interface SiteProfileView {
  sector: string
  building_type: string
  service_address: string | null
  total_area: string
  floors: string
  traffic: string
  occupancy: string
  fixtures_summary: string
}

export function buildSiteProfile(
  details: CommercialQuoteDetails,
  serviceAddress: string | null,
): SiteProfileView {
  return {
    sector: sectorLabel(details.sector_category),
    building_type: buildingTypeLabel(details.building_type),
    service_address: serviceAddress,
    total_area: fmtArea(details.total_area_m2),
    floors: fmtCount(details.floor_count, 'floor'),
    traffic: trafficLabel(details.traffic_level),
    occupancy: occupancyLabel(details.occupancy_level),
    fixtures_summary: buildFixturesSummary(details),
  }
}

function buildFixturesSummary(details: CommercialQuoteDetails): string {
  const bits: string[] = []
  const push = (s: string) => { if (s) bits.push(s) }
  push(fmtCount(details.toilets_count, 'toilet'))
  push(fmtCount(details.urinals_count, 'urinal'))
  push(fmtCount(details.basins_count, 'basin'))
  push(fmtCount(details.showers_count, 'shower'))
  push(fmtCount(details.kitchens_count, 'kitchen'))
  push(fmtCount(details.desks_count, 'desk'))
  push(fmtCount(details.offices_count, 'office'))
  push(fmtCount(details.meeting_rooms_count, 'meeting room'))
  push(fmtCount(details.reception_count, 'reception area'))
  return bits.join(' · ')
}

// ── Service schedule block ────────────────────────────────────────

export interface ServiceScheduleView {
  frequency_summary: string     // e.g. "Weekly, Monday to Friday"
  service_days: string          // e.g. "Weekdays (Mon–Fri)"
  service_window: string        // e.g. "17:00–22:00"
  access_requirements: string   // notes, when operator entered them
  consumables: string           // "Provided by Sano"
}

export function buildServiceSchedule(details: CommercialQuoteDetails): ServiceScheduleView {
  const days = serviceDaysSummary(details.service_days)
  const window = details.service_window?.trim() ?? ''
  // A single human summary sentence suitable for the top of the schedule
  // section. Kept short — the table beneath gives the detail.
  const frequency_summary = [days, window].filter(Boolean).join(', ')
  return {
    frequency_summary,
    service_days: days,
    service_window: window,
    access_requirements: details.access_requirements?.trim() ?? '',
    consumables: consumablesLabel(details.consumables_by),
  }
}

function consumablesLabel(c: string | null | undefined): string {
  if (!c) return ''
  if (c === 'sano')   return 'Provided by Sano'
  if (c === 'client') return 'Provided by client'
  if (c === 'shared') return 'Shared between Sano and client'
  return c
}

// ── Executive summary ─────────────────────────────────────────────

export function buildExecutiveSummary(
  details: CommercialQuoteDetails,
  scope: readonly CommercialScopeItem[],
  clientName: string | null,
): string {
  const sector = sectorLabel(details.sector_category).toLowerCase()
  const who = clientName ? ` for ${clientName}` : ''

  // Opening
  const opening = `Sano has prepared this commercial cleaning proposal${who}.`

  // Site sentence — pieces it together from what's captured
  const siteBits: string[] = []
  const building = buildingTypeLabel(details.building_type).toLowerCase()
  siteBits.push(building ? `a ${building} ${sector} site` : `a ${sector} site`)
  const area = fmtArea(details.total_area_m2)
  if (area) siteBits.push(`covering approximately ${area}`)
  const floors = fmtCount(details.floor_count, 'floor')
  if (floors) siteBits.push(`across ${floors}`)
  const occ = occupancyLabel(details.occupancy_level).toLowerCase()
  const traf = trafficLabel(details.traffic_level).toLowerCase()
  if (occ && traf) siteBits.push(`with ${occ} occupancy and ${traf} traffic`)
  else if (occ) siteBits.push(`with ${occ} occupancy`)
  else if (traf) siteBits.push(`with ${traf} traffic`)
  const site = `The site is ${siteBits.join(' ')}.`

  // Rhythm sentence
  const schedule = buildServiceSchedule(details)
  const rhythm = schedule.frequency_summary
    ? `Service is delivered ${schedule.frequency_summary.toLowerCase()}.`
    : ''

  // Scope
  const includedCount = scope.filter((r) => r.included).length
  const scopeLine = includedCount > 0
    ? `The programme covers ${includedCount} defined ${includedCount === 1 ? 'task' : 'tasks'} across the agreed areas, designed to maintain a consistent ${sector} cleaning standard.`
    : `The programme will cover all agreed areas to maintain a consistent ${sector} cleaning standard.`

  return [opening, site, rhythm, scopeLine].filter(Boolean).join(' ')
}

// ── Pricing summary (client-safe) ─────────────────────────────────

export interface ProposalPricingView {
  base_label: string
  base_amount: number
  addons: { label: string; amount: number }[]
  discount: number
  subtotal_ex_gst: number
  gst_amount: number
  total_inc_gst: number
  annualised_inc_gst: number
  gst_included: boolean
  gst_note: string
}

export function buildPricingSummary(
  base_price: number,
  addons: readonly { label: string; price: number }[],
  discount: number,
  gst_included: boolean,
): ProposalPricingView {
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
    base_label: 'Monthly service fee',
    base_amount: baseAmount,
    addons: addonsList,
    discount: discount ?? 0,
    subtotal_ex_gst: subtotalExGst,
    gst_amount: gstAmount,
    total_inc_gst: total,
    annualised_inc_gst: total * 12,
    gst_included,
    gst_note: gst_included
      ? 'Pricing shown includes GST at 15%.'
      : 'Pricing shown excludes GST. GST is added at 15%.',
  }
}

// ── Aggregator input shapes ────────────────────────────────────────
// Loose row shapes the aggregator (and the React proposal template)
// consume. They're intentionally narrow — only the fields the proposal
// renders. Defined here so any caller can build the input without
// importing UI types.

export interface ProposalQuote {
  id: string
  quote_number: string
  status: string | null
  date_issued: string | null
  valid_until: string | null
  accepted_at: string | null
  service_address: string | null
  notes: string | null
  base_price: number
  discount: number | null
  gst_included: boolean
  payment_type: string | null
}

export interface ProposalClient {
  name: string | null
  company_name: string | null
  service_address: string | null
  phone: string | null
  email: string | null
}

export interface ProposalAddon {
  label: string
  price: number
  sort_order: number
}

// ── Date formatting (shared by all proposal renderers) ─────────────

export function fmtProposalDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtProposalDateOrNull(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Standard Sano content blocks ───────────────────────────────────
// These are the issuer block + fixed-content sections the proposal
// always carries unless overridden per-quote (not yet supported).
// Wording must respect the brand voice rules in CLAUDE.md:
//   never "premium", "eco-friendly", "industry-leading"; no fake
//   testimonials; tone is reliable, detail-focused, easy to deal with.

export interface ProposalIssuer {
  company_name: string
  trading_as: string
  phone: string
  email: string
  website: string
  address_line: string
  logo_src: string
}

export const SANO_ISSUER: ProposalIssuer = {
  company_name: 'Sano Property Services Limited',
  trading_as: 'Sano',
  phone: '0800 726 686',
  email: 'hello@sano.nz',
  website: 'sano.nz',
  address_line: 'Auckland, New Zealand',
  logo_src: '/brand/sano-logo-print.png',
}

export const SANO_WHY_BULLETS: readonly string[] = [
  'Local Auckland team — one consistent crew, one point of contact.',
  'Inducted, photo-ID staff with documented procedures for every site.',
  'Transparent scope: every task is listed, scheduled, and auditable.',
  'Easy to deal with — quick to quote, fast to respond, no lock-ins.',
]

export interface ProposalAcceptanceBlock {
  blurb: string
  next_steps: readonly string[]
}

export const SANO_ACCEPTANCE_BLOCK: ProposalAcceptanceBlock = {
  blurb:
    'To accept this proposal, reply to this email confirming you would like to proceed, or sign and return the bottom of this document. We will then arrange a short on-site walk-through, confirm a start date, and issue a service schedule.',
  next_steps: [
    'Confirm acceptance (email or signed return).',
    'On-site walk-through — typically within 5 working days.',
    'First service date confirmed in writing.',
    'Monthly invoicing on the 1st, 7-day terms.',
  ],
}

// ── Aggregated payload shape ───────────────────────────────────────
// Matches docs/commercial-proposals/field-map.md exactly. This payload
// is what feeds:
//   1. CommercialProposalTemplate.tsx (React render)
//   2. docs/commercial-proposals/templates/commercial-proposal-template.html
//      (static HTML render, hydrated via window.PROPOSAL_DATA)
//   3. Future PDF route
//
// Internal-only fields (margin tier, labour cost basis, estimated
// hours, scope quantities / unit_minutes / production_rate, the
// `included` flag, sector_fields JSONB) are *deliberately* not in this
// shape — the contract is what's safe to show a client.

export interface ProposalMeta {
  reference: string
  issued: string                 // pre-formatted: "22 April 2026" or "—"
  valid_until: string            // pre-formatted: "22 May 2026" or "—"
  accepted_at: string | null     // pre-formatted, null when not accepted
  status: string | null
  version: number                // reserved for proposal-versioning
}

export interface ProposalClientView {
  company_name: string
  contact_name: string | null
  site_address: string | null
  phone: string | null
  email: string | null
}

export interface ProposalPayload {
  meta: ProposalMeta
  sano: ProposalIssuer
  client: ProposalClientView
  executive_summary: string
  site_profile: SiteProfileView
  service_schedule: ServiceScheduleView
  scope_groups: ProposalScopeGroup[]
  assumptions: string[]
  exclusions: string[]
  compliance_notes: string | null
  pricing: ProposalPricingView
  why_sano: readonly string[]
  acceptance: ProposalAcceptanceBlock
}

export interface BuildProposalPayloadInput {
  quote: ProposalQuote
  client: ProposalClient | null
  addons: readonly ProposalAddon[]
  details: CommercialQuoteDetails
  scope: readonly CommercialScopeItem[]
  // Optional overrides — defaults to the SANO_* constants. Useful for
  // tests and for any future per-quote overrides.
  issuer?: ProposalIssuer
  whyBullets?: readonly string[]
  acceptance?: ProposalAcceptanceBlock
  proposalVersion?: number
}

/**
 * buildProposalPayload
 *
 * One aggregator that turns the live commercial-quote rows into the
 * single client-safe JSON payload documented in
 * docs/commercial-proposals/field-map.md. Pure — no Supabase, no React,
 * no formatting beyond what the existing helpers provide.
 *
 * The returned object is structurally a drop-in for both:
 *   - CommercialProposalTemplate.tsx (the React renderer)
 *   - docs/commercial-proposals/templates/commercial-proposal-template.html
 *     (the static Mustache renderer — JSON.stringify the payload into
 *      the <script id="proposal-data"> block, or set window.PROPOSAL_DATA)
 *
 * Internal-only pricing / labour / scope-time fields are excluded by
 * construction: every field is sourced from a helper that already
 * narrows to client-safe output.
 */
export function buildProposalPayload(input: BuildProposalPayloadInput): ProposalPayload {
  const {
    quote,
    client,
    addons,
    details,
    scope,
    issuer = SANO_ISSUER,
    whyBullets = SANO_WHY_BULLETS,
    acceptance = SANO_ACCEPTANCE_BLOCK,
    proposalVersion = 1,
  } = input

  const siteAddress = quote.service_address ?? client?.service_address ?? null
  const clientLabel = client?.name ?? client?.company_name ?? null

  const meta: ProposalMeta = {
    reference: quote.quote_number,
    issued: fmtProposalDate(quote.date_issued),
    valid_until: fmtProposalDate(quote.valid_until),
    accepted_at: fmtProposalDateOrNull(quote.accepted_at),
    status: quote.status,
    version: proposalVersion,
  }

  const clientView: ProposalClientView = {
    company_name: client?.company_name ?? client?.name ?? 'Client',
    contact_name: client?.name ?? null,
    site_address: siteAddress,
    phone: client?.phone ?? null,
    email: client?.email ?? null,
  }

  return {
    meta,
    sano: issuer,
    client: clientView,
    executive_summary: buildExecutiveSummary(details, scope, clientLabel),
    site_profile:     buildSiteProfile(details, siteAddress),
    service_schedule: buildServiceSchedule(details),
    scope_groups:     groupScopeForProposal(scope),
    assumptions:      splitToBullets(details.assumptions),
    exclusions:       splitToBullets(details.exclusions),
    compliance_notes: details.compliance_notes?.trim() ? details.compliance_notes.trim() : null,
    pricing:          buildPricingSummary(
                        quote.base_price ?? 0,
                        addons,
                        quote.discount ?? 0,
                        quote.gst_included,
                      ),
    why_sano:         whyBullets,
    acceptance,
  }
}
