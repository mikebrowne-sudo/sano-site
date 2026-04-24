// Proposal Phase 3 — Professional content engine.
//
// Pure content-builder functions: turn the slim ProposalTemplatePayload
// into the tailored paragraphs, bullet lists, and supporting copy that
// the proposal page components render. No React, no DB, no side effects
// — everything is a deterministic function of the payload.
//
// Each builder degrades gracefully when fields are missing (empty
// strings from the legacy mapping, fresh quote with no commercial
// details, etc.) — every paragraph is conditional on the data that
// would make it substantive.
//
// Tone rules (brand):
//   • natural, professional, confident
//   • no hype words ("premium", "industry-leading", "eco-friendly")
//   • no invented stats or unsupported claims
//   • short sentences, plain language

import type { ProposalTemplatePayload } from './buildProposalPayload'

// ── Executive summary ─────────────────────────────────────────────
// Returns a green opener + 4–5 short body paragraphs:
//   opener          — thanks + site-specific context
//   body paragraphs — understanding, approach, cadence, consistency,
//                     closing. Each paragraph is conditional on the
//                     source data so missing fields don't produce
//                     empty or awkward sentences.

export interface ExecutiveSummaryContent {
  opener: string
  body: string[]
}

export function buildExecutiveSummary(payload: ProposalTemplatePayload): ExecutiveSummaryContent {
  const { clientName, siteAddress, siteContext, serviceFrequency, serviceDays, scopeSections } = payload

  // Opener — green lead line.
  const opener = clientName
    ? `Thank you for the opportunity to present this proposal for commercial cleaning services at ${clientName}.`
    : 'Thank you for the opportunity to present this proposal for commercial cleaning services at your site.'

  const body: string[] = []

  // Paragraph 1 — site understanding.
  const sitePieces: string[] = []
  if (siteContext.sector)            sitePieces.push(`${siteContext.sector.toLowerCase()} site`)
  else if (siteContext.buildingType) sitePieces.push(siteContext.buildingType.toLowerCase())
  if (siteContext.totalArea)         sitePieces.push(`approximately ${siteContext.totalArea}`)
  if (siteContext.floors)            sitePieces.push(`across ${siteContext.floors.toLowerCase()}`)

  if (sitePieces.length || siteAddress) {
    const where = siteAddress ? `${siteAddress} is ` : 'The property is '
    const descriptor = sitePieces.length ? `a ${joinWithCommas(sitePieces)}` : 'a commercial workplace'
    body.push(`${where}${descriptor}. The service plan has been shaped around how the site is used, so the areas that matter most to staff and visitors are looked after every visit.`)
  } else {
    body.push('The service plan has been shaped around how the site is used, so the areas that matter most to staff and visitors are looked after every visit.')
  }

  // Paragraph 2 — cleaning approach, shaped by traffic/occupancy.
  const approachPieces: string[] = []
  const t = siteContext.trafficLevel.toLowerCase()
  const o = siteContext.occupancyLevel.toLowerCase()
  if (t.includes('high'))       approachPieces.push('high-traffic areas are prioritised on every visit')
  else if (t.includes('low'))   approachPieces.push('quieter areas still receive the same attention to detail as the rest of the site')
  if (o.includes('high'))       approachPieces.push('shared spaces are kept visibly clean and hygienic for daily occupancy')

  const approachSentence = approachPieces.length
    ? `Our approach is straightforward — ${joinWithCommas(approachPieces)}.`
    : 'Our approach is straightforward — every task in the scope is delivered at the agreed frequency, to a consistent standard, visit after visit.'
  body.push(`${approachSentence} We build the routine around the scope of work and hold ourselves to it, without skipping steps when things get busy.`)

  // Paragraph 3 — service cadence.
  const cadenceParts: string[] = []
  if (serviceFrequency) cadenceParts.push(serviceFrequency.toLowerCase())
  const freqLower = (serviceFrequency || '').toLowerCase()
  if (serviceDays && !freqLower.includes(serviceDays.toLowerCase())) cadenceParts.push(serviceDays.toLowerCase())
  const cadence = cadenceParts.length ? cadenceParts.join(', ') : 'to the agreed schedule'
  const sc = scopeSections.length
  const scopeNote = sc > 0
    ? ` The scope covers ${sc} defined area${sc === 1 ? '' : 's'}, each with its own checklist and frequency.`
    : ''
  body.push(`Services are delivered ${cadence}, using trained staff briefed on the site before their first shift.${scopeNote}`)

  // Paragraph 4 — consistency + single contact.
  body.push(
    'You will have a single point of contact for day-to-day matters, and the same small team returning to site each visit. Where a shift changes, the incoming cleaner is briefed against the same checklist — so the standard does not drop.',
  )

  // Paragraph 5 — closing.
  body.push(
    'The pages that follow set out the service schedule, scope of works, pricing, and commercial terms. We are happy to walk through any section with you before acceptance.',
  )

  return { opener, body }
}

// ── Service overview ──────────────────────────────────────────────
// Short paragraph summarising what the service plan delivers, drawn
// from frequency/days/times + site traffic.

export function buildServiceOverviewText(payload: ProposalTemplatePayload): string {
  const { serviceFrequency, serviceDays, serviceTimes, siteContext } = payload

  const cadence = [serviceFrequency, serviceDays].filter((s) => s && s.trim()).join(' · ')
  const window = serviceTimes?.trim()

  const sentences: string[] = []
  if (cadence && window) {
    sentences.push(`The service plan is built around a ${cadence.toLowerCase()} cadence, with cleaning carried out ${window.toLowerCase()} so the site is ready for the next working day.`)
  } else if (cadence) {
    sentences.push(`The service plan runs to a ${cadence.toLowerCase()} cadence that fits the rhythm of the site.`)
  } else if (window) {
    sentences.push(`Cleaning is carried out ${window.toLowerCase()} so the site is ready for the next working day.`)
  } else {
    sentences.push('The service plan is built around the agreed schedule and scope.')
  }

  if (siteContext.trafficLevel.toLowerCase().includes('high')) {
    sentences.push('High-traffic areas are attended every visit, with rotating deep-clean tasks scheduled so nothing is overlooked.')
  } else {
    sentences.push('Core tasks are attended every visit, with rotating deep-clean tasks scheduled so nothing is overlooked.')
  }

  return sentences.join(' ')
}

// Short, on-brand bullet points rendered below the service overview.
// Each point describes the concrete value of the plan — not a promise.
export const SERVICE_OVERVIEW_BENEFITS: readonly string[] = [
  'Consistent cleaning delivered by the same small team each visit',
  'Reliable service attendance with same-day cover when needed',
  'Clear, direct communication with a single point of contact',
  'Low-disruption scheduling — we work around the way the site is used',
]

// ── Scope of works ────────────────────────────────────────────────
// A short professional intro paragraph that sits above the scope list.

export function buildScopeIntro(payload: ProposalTemplatePayload): string {
  const groupCount = payload.scopeSections.length
  const sectorBit = payload.siteContext.sector
    ? `${payload.siteContext.sector.toLowerCase()} site`
    : 'site'
  if (groupCount === 0) {
    return `The scope below covers the agreed cleaning tasks for the ${sectorBit}. Every task is carried out at the agreed frequency by staff briefed on the site.`
  }
  return `The following scope sets out the cleaning tasks for each area of the ${sectorBit}, grouped by function and ordered by priority. Each task runs to the frequency shown, and is tracked against a site-specific checklist on every visit.`
}

// ── Pricing summary ───────────────────────────────────────────────
// Short pricing-basis paragraph plus the "What's included" checklist.

export interface PricingSummaryContent {
  intro: string
  included: string[]
  closingNote: string
}

export function buildPricingSummaryText(payload: ProposalTemplatePayload): PricingSummaryContent {
  const { serviceFrequency, siteContext, monthlyFeeSuffix } = payload
  const unit = (monthlyFeeSuffix || 'per month').toLowerCase().replace(/^\s*per\s+/i, '')

  const introParts: string[] = []
  introParts.push(
    `Pricing is based on the defined scope of works and the agreed service frequency${serviceFrequency ? ` (${serviceFrequency.toLowerCase()})` : ''}, billed ${monthlyFeeSuffix || 'per month'}.`,
  )
  introParts.push(
    `The figure reflects labour, equipment, consumables where agreed, and the supervision needed to keep the service consistent over the ${siteContext.contractTermMonths}-month term.`,
  )
  const intro = introParts.join(' ')

  const included: string[] = [
    'Trained cleaning staff and site-specific inductions',
    'All cleaning equipment and materials required for the scope',
    'Consumables (soap, paper, bin liners) when agreed as part of the service',
    'On-site supervision and scheduled quality checks',
    'Responsive communication and single point of contact',
  ]

  const closingNote = `Invoicing is monthly in arrears with ${siteContext.paymentTermDays}-day payment terms. Any variation to scope is agreed in writing before it is actioned, so the price you see is the price you pay per ${unit}.`

  return { intro, included, closingNote }
}

// ── Helpers ───────────────────────────────────────────────────────

function joinWithCommas(pieces: string[]): string {
  if (pieces.length === 0) return ''
  if (pieces.length === 1) return pieces[0]
  if (pieces.length === 2) return `${pieces[0]} ${pieces[1]}`
  const head = pieces.slice(0, -1).join(', ')
  const tail = pieces[pieces.length - 1]
  return `${head}, ${tail}`
}
