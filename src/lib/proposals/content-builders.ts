// Proposal Phase 3.1 — Professional content engine (rewrite).
//
// Pure content-builder functions: turn the slim ProposalTemplatePayload
// into the tailored paragraphs, bullet lists, and supporting copy that
// the proposal page components render.
//
// Design rules:
//   • natural, professional, confident — never defensive, never salesy
//   • never expose raw machine values ("tue, thu, sat, 1600-2200")
//   • never repeat data already shown in the service-summary grid
//   • degrade gracefully when fields are missing — omit rather than
//     emit awkward fragments
//   • no brand buzzwords ("premium", "industry-leading", "eco-friendly")

import type { ProposalTemplatePayload } from './buildProposalPayload'

// ── Formatters ────────────────────────────────────────────────────

const NUM_WORDS: readonly string[] = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
]

const DAY_LONG: Record<string, string> = {
  mon: 'Monday',   tue: 'Tuesday',  wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday',   sat: 'Saturday', sun: 'Sunday',
}

/** "Tue, Thu, Sat" / "Weekdays (Mon–Fri)" / "Every day" → readable prose. */
export function formatServiceDays(days: string): string {
  const s = days.trim()
  if (!s) return ''
  if (/every\s*day/i.test(s)) return 'every day'
  if (/weekdays/i.test(s))    return 'Monday to Friday'
  if (/weekends/i.test(s))    return 'Saturday and Sunday'

  const parts = s
    .split(/[,/·]+|\s+and\s+|\s+&\s+/i)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .map((p) => DAY_LONG[p.slice(0, 3)] ?? null)
    .filter((p): p is string => !!p)

  if (parts.length === 0) return s
  if (parts.length === 1) return parts[0]
  const head = parts.slice(0, -1).join(', ')
  return `${head} and ${parts[parts.length - 1]}`
}

/** "1600-2200" / "16:00-22:00" / "5:00 pm - 10:00 pm" → "between 4:00 pm and 10:00 pm". */
export function formatServiceWindow(window: string): string {
  const s = window.trim()
  if (!s) return ''

  const split = s.split(/\s*[-–—]\s*|\s+to\s+/i)
  if (split.length === 2) {
    const a = parseClock(split[0])
    const b = parseClock(split[1])
    if (a && b) return `between ${formatClock12(a)} and ${formatClock12(b)}`
  }
  return s
}

/** "1600-2200" → "4:00 pm – 10:00 pm" (en-dash range, for meta grids). */
export function formatServiceWindowRange(window: string): string {
  const s = window.trim()
  if (!s) return ''
  const split = s.split(/\s*[-–—]\s*|\s+to\s+/i)
  if (split.length === 2) {
    const a = parseClock(split[0])
    const b = parseClock(split[1])
    if (a && b) return `${formatClock12(a)} – ${formatClock12(b)}`
  }
  return s
}

function parseClock(raw: string): { h: number; m: number } | null {
  const s = raw.trim().toLowerCase()
  // "5:00pm" / "5:00 pm" / "17:00"
  const withSuffix = s.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/)
  if (withSuffix) {
    let h = Number(withSuffix[1])
    const m = Number(withSuffix[2] ?? '0')
    const suf = withSuffix[3]
    if (suf === 'pm' && h !== 12) h += 12
    if (suf === 'am' && h === 12) h = 0
    if (inRange(h, m)) return { h, m }
    return null
  }
  // "HH:mm" / "H:mm"
  const hm = s.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) {
    const h = Number(hm[1])
    const m = Number(hm[2])
    if (inRange(h, m)) return { h, m }
    return null
  }
  // "HHmm" / "HMM" / "H"
  if (/^\d{1,4}$/.test(s)) {
    const padded = s.padStart(4, '0')
    const h = Number(padded.slice(0, 2))
    const m = Number(padded.slice(2))
    if (inRange(h, m)) return { h, m }
  }
  return null
}

function inRange(h: number, m: number): boolean {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

function formatClock12(t: { h: number; m: number }): string {
  const suffix = t.h >= 12 ? 'pm' : 'am'
  const hr = t.h % 12 === 0 ? 12 : t.h % 12
  const mm = t.m.toString().padStart(2, '0')
  return `${hr}:${mm} ${suffix}`
}

/** Count cleaning days per week from a days string. */
export function countDaysPerWeek(days: string): number {
  const s = days.trim()
  if (!s) return 0
  if (/every\s*day/i.test(s)) return 7
  if (/weekdays/i.test(s))    return 5
  if (/weekends/i.test(s))    return 2
  const tokens = s.split(/[,/·]+|\s+and\s+|\s+&\s+|\s+/i)
    .map((t) => t.trim().slice(0, 3).toLowerCase())
    .filter((t) => t in DAY_LONG)
  return new Set(tokens).size
}

/** Short schedule descriptor for prose. */
export function scheduleDescriptor(daysPerWeek: number): string {
  if (daysPerWeek <= 0) return 'agreed service schedule'
  if (daysPerWeek === 7) return 'daily service schedule'
  if (daysPerWeek === 1) return 'one scheduled visit per week'
  const w = NUM_WORDS[daysPerWeek] ?? String(daysPerWeek)
  return `${w} scheduled visits per week`
}

/** "three times per week", "daily", etc. */
export function cadencePhrase(daysPerWeek: number): string {
  if (daysPerWeek <= 0) return ''
  if (daysPerWeek === 7) return 'every day'
  if (daysPerWeek === 1) return 'once per week'
  if (daysPerWeek === 2) return 'twice per week'
  const w = NUM_WORDS[daysPerWeek] ?? String(daysPerWeek)
  return `${w} times per week`
}

/** Service-overview grid label — capitalised "Three visits per week". */
export function visitsPerWeekLabel(daysPerWeek: number): string {
  if (daysPerWeek <= 0) return ''
  if (daysPerWeek === 7) return 'Daily service'
  if (daysPerWeek === 1) return 'One visit per week'
  const w = NUM_WORDS[daysPerWeek] ?? String(daysPerWeek)
  const capitalised = w.charAt(0).toUpperCase() + w.slice(1)
  return `${capitalised} visits per week`
}

/** Classify a service window as "evening" / "daytime" / "overnight" /
 *  "" (unknown). Used to modify "agreed service window" prose. */
export function windowDescriptor(window: string): '' | 'evening' | 'daytime' | 'overnight' {
  const s = window.trim()
  if (!s) return ''
  const split = s.split(/\s*[-–—]\s*|\s+to\s+/i)
  const start = split.length >= 1 ? parseClock(split[0]) : null
  if (!start) return ''
  if (start.h >= 16 || start.h < 5) return 'evening'
  return 'daytime'
}

/** Pick "a" or "an" based on the leading vowel sound (best-effort). */
export function articleFor(word: string): string {
  const w = word.trim()
  if (!w) return 'a'
  return /^[aeiou]/i.test(w[0]) ? 'an' : 'a'
}

/** "3 floors" → "three floors", "1 floor" → "a single floor". */
export function floorsToWords(floors: string): string {
  const s = floors.trim()
  if (!s) return ''
  const m = s.match(/^(\d+)\s*floors?/i)
  if (!m) return s
  const n = Number(m[1])
  if (n === 1) return 'a single floor'
  const w = NUM_WORDS[n] ?? String(n)
  return `${w} floors`
}

/** Map Sano sector/buildingType to a natural "{type} site" phrase. */
export function formatSiteType(sector: string, buildingType: string): string {
  const sec = sector.trim().toLowerCase()
  if (sec) return `${sec} site`
  const bt = buildingType.trim().toLowerCase()
  if (bt) return bt.endsWith('site') ? bt : `${bt} site`
  return 'commercial site'
}

/** Map a scope item frequency label to a clean parenthesised suffix.
 *  "Per visit" → "(each visit)", "Weekly" → "(weekly)", etc. */
export function formatScopeFrequency(label: string): string {
  const s = (label || '').trim().toLowerCase()
  if (!s) return ''
  if (s === 'per visit')   return '(each visit)'
  if (s === 'daily')       return '(daily)'
  if (s === 'weekly')      return '(weekly)'
  if (s === 'fortnightly') return '(fortnightly)'
  if (s === 'monthly')     return '(monthly)'
  if (s === 'quarterly')   return '(quarterly)'
  if (s === 'six-monthly' || s === 'sixmonthly' || s === 'six monthly') return '(six-monthly)'
  if (s === 'annually' || s === 'annual' || s === 'yearly') return '(annually)'
  if (s === 'as required' || s === 'as needed') return '(as required)'
  if (s === 'as scheduled') return ''
  return `(${s})`
}

// ── Executive summary ─────────────────────────────────────────────

export interface ExecutiveSummaryContent {
  opener: string
  body: string[]
}

/**
 * Structure:
 *   opener (green) — P1: "This proposal outlines the commercial
 *                        cleaning services for {client}, {a|an}
 *                        {descriptor}."
 *   body [0]       — P2: approach framed around site use
 *   body [1]       — P3: cadence (recurring) / single-visit framing
 *   body [2]       — P4: short team line
 *   body [3]       — closing pointer to the rest of the document
 *
 * The site address is deliberately NOT repeated here. It already
 * appears on the cover page and in the Service Overview meta grid —
 * a third occurrence, in prose, reads as filler.
 *
 * One-off quotes (siteContext.isOneOff) drop every recurring cue:
 * no "delivered {cadence}", no ongoing-service framing.
 */
export function buildExecutiveSummary(payload: ProposalTemplatePayload): ExecutiveSummaryContent {
  const { clientName, siteContext, serviceDays, serviceTimes } = payload
  const oneOff = siteContext.isOneOff

  // ── P1 / opener ──
  const siteTypePhrase = formatSiteType(siteContext.sector, siteContext.buildingType)
  const floorCount = parseFloorCount(siteContext.floors)
  const multiLevel = floorCount != null && floorCount >= 2 ? 'multi-level ' : ''
  const base = `${multiLevel}${siteTypePhrase}`.trim()
  const art = articleFor(base)

  const clauses: string[] = []
  if (siteContext.totalArea) clauses.push(`of approximately ${siteContext.totalArea}`)
  if (floorCount && floorCount >= 2) {
    clauses.push(`across ${floorsToWords(siteContext.floors)}`)
  }
  const descriptor = `${art} ${base}${clauses.length ? ' ' + clauses.join(' ') : ''}`

  const whoClause = clientName ? `for ${clientName}` : 'at your site'
  const siteBit = (base || clauses.length) ? `, ${descriptor}` : ''
  const serviceNoun = oneOff ? 'a one-off commercial clean' : 'the commercial cleaning services'
  const opener = `This proposal outlines ${serviceNoun} ${whoClause}${siteBit}.`

  // ── Body paragraphs ──
  // Phase 4.1 — compressed. Executive Summary now covers only:
  //   • site framing (how the service maps to how the site is used)
  //   • cadence (when visits happen)
  //   • short team line
  //   • closing pointer to the rest of the document
  // The "why we're good" / "structured, repeatable delivery" /
  // "single point of contact" language has moved to Why Sano so the
  // two pages don't echo each other.
  const body: string[] = []

  // The spaces named here have to be the reader's own. "Workspaces, shared
  // areas and amenities" is office vocabulary — on a restaurant or brewery
  // tender it reads as a template that was never adjusted, which is exactly
  // the impression a proposal cannot afford to give. Each sector names the
  // areas its operator would name, and anything unrecognised falls back to
  // neutral wording rather than borrowing another sector's language.
  const AREAS_BY_SECTOR: Record<string, string> = {
    hospitality: 'dining and public areas, bar and service areas, and bathrooms',
    office:      'workspaces, shared areas, and amenities',
    education:   'classrooms, shared spaces, and amenities',
    medical:     'clinical spaces, waiting areas, and amenities',
    industrial:  'operational areas, walkways, and amenities',
  }
  const sectorKey = (siteContext.sector || '').trim().toLowerCase()
  const areasPhrase = AREAS_BY_SECTOR[sectorKey] ?? 'public-facing areas, shared spaces, and amenities'

  body.push(
    oneOff
      ? `The clean has been scoped around how the site is used, with a focus on lifting presentation across ${areasPhrase} in a single visit.`
      : `The service has been structured around how the site is used day to day, with a focus on maintaining presentation across ${areasPhrase}.`,
  )

  // Delivery sentence. Recurring quotes get a cadence ("delivered
  // twice per week"); one-off quotes get single-visit framing, since
  // a cadence would be actively wrong on a job with no repeat.
  const win = formatServiceWindow(serviceTimes || '')
  const winKind = windowDescriptor(serviceTimes || '')
  const winSuffix = winKind ? `agreed ${winKind} service window` : 'agreed service window'
  const winClause = win ? `within the ${winSuffix} (${win})` : (serviceTimes ? `within the ${winSuffix}` : '')

  if (oneOff) {
    body.push(
      winClause
        ? `The work is completed in a single visit on the agreed date, ${winClause}.`
        : 'The work is completed in a single visit on the agreed date.',
    )
  } else {
    const daysPerWeek = countDaysPerWeek(serviceDays || '')
    const cadence = cadencePhrase(daysPerWeek)
    if (cadence && winClause) {
      body.push(`Services are delivered ${cadence} ${winClause}.`)
    } else if (cadence) {
      body.push(`Services are delivered ${cadence}.`)
    } else if (winClause) {
      body.push(`Services are carried out ${winClause}.`)
    } else {
      body.push('Services are delivered to the agreed schedule.')
    }
  }

  // One short team line. "Sano crew" branding is reserved for the
  // Why Sano page so the phrase appears exactly once in the document.
  body.push(
    oneOff
      ? 'A small, experienced team is assigned to the clean.'
      : 'A consistent small team is assigned to the site.',
  )

  body.push(
    oneOff
      ? 'The following pages set out the full scope of the clean, pricing, and terms.'
      : 'The following pages set out the full service structure, including scope, pricing, and commercial terms.',
  )

  return { opener, body }
}

function parseFloorCount(floors: string): number | null {
  const m = floors.trim().match(/^(\d+)\s*floors?/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

// ── Service overview ──────────────────────────────────────────────
// Does NOT repeat the data already rendered in the meta grid (days,
// times, frequency). Instead, explains the shape of the plan and the
// way visits are carried out.

export function buildServiceOverviewText(payload: ProposalTemplatePayload): string[] {
  // One-off: no schedule/cycle language. A single visit has a window
  // and a date, not a cadence or a "service cycle".
  if (payload.siteContext.isOneOff) {
    const kindOneOff = windowDescriptor(payload.serviceTimes || '')
    const windowRefOneOff = kindOneOff ? `the ${kindOneOff} service window` : 'the agreed service window'
    return [
      `The clean is carried out in a single visit on the agreed date, during ${windowRefOneOff}, so the site is ready for use immediately afterwards.`,
      'The full scope is completed within that visit, with the team working through each area in turn and a final check before leaving site.',
    ]
  }

  const daysPerWeek = countDaysPerWeek(payload.serviceDays || '')
  const schedule = scheduleDescriptor(daysPerWeek)
  const kind = windowDescriptor(payload.serviceTimes || '')
  const windowRef = kind ? `the ${kind} service window` : 'the agreed service window'

  // schedule output is either "daily service schedule",
  // "one scheduled visit per week", or "three scheduled visits per
  // week" — the first two take "a/an" naturally, the count forms
  // read better without an article.
  const scheduleClause = daysPerWeek > 0
    ? (daysPerWeek === 7
        ? 'around a daily service schedule'
        : `around ${schedule}`)
    : 'around the agreed service schedule'

  // Phase 4.1 — Service Overview now describes only how the service
  // operates. "Trained staff follow a checklist" / "consistent team"
  // language has moved to Why Sano so the pages don't echo each
  // other. Two paragraphs is enough above the meta grid.
  const p1 = `The service is structured ${scheduleClause}, with cleaning carried out during ${windowRef} so the site is ready for the next working day.`

  const p2 = 'Core tasks are completed at each visit, with additional detail work scheduled across the service cycle.'

  return [p1, p2]
}

// ── Scope of works ────────────────────────────────────────────────

export interface ScopeIntroContent {
  lead: string
  follow: string
}

export function buildScopeIntro(payload?: ProposalTemplatePayload): ScopeIntroContent {
  // One-off: "every visit" and "service cycle" both assume a repeat.
  // On a single visit the whole scope is completed in that one visit.
  if (payload?.siteContext.isOneOff) {
    return {
      lead: 'The following scope outlines the cleaning tasks across each area of the site, grouped by function so it is clear what is covered.',
      follow: 'The full scope is completed within the visit, with the team working through each area in turn so no space is overlooked.',
    }
  }

  return {
    lead: 'The following scope outlines the cleaning tasks across each area of the site. Tasks are grouped by function and delivered at the agreed frequency to maintain a consistent standard across all spaces.',
    follow: 'Core cleaning tasks are completed at every visit, with additional detail and less frequent tasks scheduled across the service cycle to ensure no area is overlooked.',
  }
}

// ── Pricing summary ───────────────────────────────────────────────

export interface PricingSummaryContent {
  intro: string
  inclusionsNote: string
  positioningNote: string
  included: string[]
  closingNote: string
}

export function buildPricingSummaryText(payload: ProposalTemplatePayload): PricingSummaryContent {
  const oneOff = payload.siteContext.isOneOff
  const paymentDays = payload.siteContext.paymentTermDays || 14

  // Phase 4.1 — intro deliberately avoids "consistent / over time"
  // language so the positioning line below owns that theme.
  //
  // One-off drops every recurring reference: no monthly fee, no
  // contract term, no monthly-in-arrears invoicing, and no
  // "consistency over time" positioning — there is no "over time".
  const intro = oneOff
    ? 'The service fee reflects the agreed scope of works for this clean, quoted as a fixed total for the visit.'
    : 'The monthly service fee reflects the agreed scope of works and service frequency, set for the full term of the contract.'

  const inclusionsNote = oneOff
    ? 'Pricing includes all labour, equipment, and materials required to complete the clean to the standard outlined in this proposal.'
    : 'Pricing includes all labour, equipment, and service management required to maintain the standard outlined in this proposal.'

  // Phase 4 — subtle positioning line. Sits below the included list,
  // above the closing payment-terms note.
  const positioningNote = oneOff
    ? 'The clean is scoped and priced to be completed properly in one visit, rather than trimmed to hit a lower number.'
    : 'The service is structured to support consistency and reliability over time, rather than short-term or variable results.'

  const included: string[] = oneOff
    ? [
        'Trained cleaning staff, briefed for the site',
        'All cleaning equipment and materials required',
        'Consumables where agreed as part of the clean',
        'On-site supervision and a final quality check',
        'Direct communication and service support',
      ]
    : [
        'Trained cleaning staff, inducted for the site',
        'All cleaning equipment and materials required',
        'Consumables where agreed as part of the service',
        'Ongoing supervision and quality checks',
        'Direct communication and service support',
      ]

  const closingNote = oneOff
    ? `The invoice is issued on completion of the clean with ${paymentDays}-day payment terms. Any changes to the agreed scope are confirmed in writing prior to being carried out.`
    : `Invoices are issued monthly in arrears with ${paymentDays}-day payment terms. Any changes to the agreed scope are confirmed in writing prior to being carried out.`

  return { intro, inclusionsNote, positioningNote, included, closingNote }
}
