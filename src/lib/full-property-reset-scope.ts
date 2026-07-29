// Full Property Reset — structured, itemised quote scope.
//
// A descriptive scope format for full-property reset jobs (used internally for
// heavily cluttered / hoarded properties, but customer-facing wording stays
// neutral and respectful). Stored on `quotes.structured_scope` as one JSON
// blob; it is the source of truth and is never regenerated on open/PDF.
// Pricing, GST and priced lines are entirely separate — this is description
// only.
//
// Existing free-text quotes have `structured_scope = null` and are unaffected.

export interface ScopeSection {
  heading: string
  items: string[]
}

export interface StructuredScope {
  /** Customer-facing service title, e.g. "Full Property Reset". Editable. */
  title: string
  /** Optional staff-entered expected duration, e.g. "two days". Drives the
   *  intro's duration clause; when blank the intro stays duration-free. */
  expectedDuration: string
  /** Short generated introduction (2–3 sentences). Editable; regenerating
   *  replaces ONLY this field. */
  intro: string
  /** Ordered scope sections (heading + task lines). Fully editable. */
  sections: ScopeSection[]
  /** Completion Approach wording. Editable. */
  completion: string
  /** Important Notes (caveats). Editable list. */
  notes: string[]
  /** Optional exclusions. Editable list. */
  exclusions: string[]
  /** Quote-specific weekly hour allocation (Residential Housekeeping). Blank by
   *  default; DESCRIPTIVE ONLY — feeds the generated intro wording, never any
   *  price calculation. Free text so "20" or "up to 20" both read naturally. */
  weeklyHours?: string
  /** Quote-specific service days (Residential Housekeeping). Blank by default;
   *  descriptive only. e.g. "Monday, Wednesday and Friday". */
  serviceDays?: string
}

export const FULL_PROPERTY_RESET_TITLE = 'Full Property Reset'

/** The approved default section structure (verbatim from the agreed scope). */
export const FULL_PROPERTY_RESET_SECTIONS: ScopeSection[] = [
  {
    heading: 'Bedrooms',
    items: [
      'Sort and pack loose items into boxes or disposal bags',
      'Separate retained items from approved waste',
      'Place approved waste into the skip bin',
      'Move accessible furniture as required',
      'Clean accessible surfaces from ceiling level to floor',
      'Clean and freshen drapes where practical',
      'Shampoo-extract and deodorise carpets',
    ],
  },
  {
    heading: 'Toilet',
    items: [
      'Clean accessible surfaces from ceiling level to floor',
      'Thoroughly clean and sanitise the toilet',
      'Scrub and clean flooring',
    ],
  },
  {
    heading: 'Bathroom',
    items: [
      'Clean accessible surfaces from ceiling level to floor',
      'Scrub and clean the bath and shower',
      'Clean accessible drainage areas',
      'Sort, remove or dispose of loose items as agreed',
      'Scrub and sanitise flooring',
    ],
  },
  {
    heading: 'Kitchen',
    items: [
      'Remove and sort loose items',
      'Clean and return approved items to cupboards',
      'Clean inside accessible cupboards and drawers',
      'Deep clean the oven',
      'Scrub benches and work surfaces',
      'Treat heavy grease build-up where required',
      'Wash accessible walls and surfaces',
    ],
  },
  {
    heading: 'Lounge and Dining Areas',
    items: [
      'Sort, box and pack loose items',
      'Deep clean accessible surfaces, edges and corners',
      'Move accessible items where required',
      'Clean internal windows within the included rooms',
      'Wash walls where required',
    ],
  },
  {
    heading: 'Hallways and Common Areas',
    items: [
      'Sort and remove loose items as agreed',
      'Clean accessible surfaces, edges and corners',
      'Wash accessible walls where required',
      'Vacuum, scrub or deodorise flooring as applicable',
    ],
  },
  {
    heading: 'Carpets and Flooring',
    items: [
      'Deep clean accessible carpeted areas',
      'Shampoo-extract carpets',
      'Deodorise carpets and hard flooring',
      'Scrub hard floors where required',
    ],
  },
  {
    heading: 'Item Handling and Disposal',
    items: [
      'Sort items into retain, reuse, recycle and disposal groups',
      'Box or bag items as agreed',
      'Place approved waste into the skip bin',
      'Keep retained items separate from disposal items',
      'Do not dispose of items without approval',
    ],
  },
  {
    heading: 'Additional Detail Cleaning',
    items: [
      'Clean interior windows within the included areas',
      'Clean exterior windows where safely accessible',
      'Complete detailed cleaning of edges and corners',
      'Treat heavy grease build-up where required',
      'Complete accessible surface mould treatment',
      'Wash accessible walls where required',
    ],
  },
]

/** Approved default Important Notes (caveats). */
export const FULL_PROPERTY_RESET_NOTES: string[] = [
  'Final results depend on access, the volume of belongings and waste, and the condition of surfaces',
  'Items will only be disposed of where approval has been provided',
  'Surface mould treatment is cleaning only and does not include specialist remediation, leak investigation or building repairs',
  'Additional work outside the agreed scope will be discussed before any extra cost is incurred',
  'Skip-bin supply and disposal is shown as a separate priced line',
  'Unsafe or inaccessible areas are excluded unless separately agreed',
  'Pest, biohazard or specialist remediation work is excluded unless specifically included as a separate service',
]

/**
 * Completion Approach wording. Uses the expected duration when provided; when
 * blank, stays duration-free (never invents a timeframe).
 */
export function buildResetCompletion(expectedDuration?: string): string {
  const d = (expectedDuration ?? '').trim()
  const durationClause = d
    ? `The work is expected to take approximately ${d}. `
    : ''
  return `${durationClause}Our team will complete the clean carefully and respectfully, with a focus on restoring a healthy and manageable living environment.`
}

/**
 * Inputs the intro generator may draw on — all already present on a quote.
 * Nothing here is invented; absent fields simply drop out of the wording.
 */
export interface ResetIntroInput {
  title?: string | null
  property_category?: string | null
  service_address?: string | null
  /** Staff-entered "Expected duration" from the structured editor. */
  expectedDuration?: string | null
  /** Whether the scope currently includes major work signals — derived from
   *  the section list, NOT invented. */
  sections?: ScopeSection[]
}

function sectionsMention(sections: ScopeSection[] | undefined, needle: RegExp): boolean {
  if (!sections) return false
  return sections.some((s) =>
    needle.test(s.heading) || s.items.some((i) => needle.test(i)),
  )
}

/**
 * Build the short (2–3 sentence) introduction from existing quote details plus
 * the Expected duration. It never invents services, timeframes or outcomes:
 * every clause is gated on data actually present. Regenerating the intro calls
 * only this — it does not touch sections or any other manual edits.
 */
export function buildResetIntro(input: ResetIntroInput): string {
  const duration = (input.expectedDuration ?? '').trim()
  const sections = input.sections ?? []

  // Sentence 1 — purpose + that it's a detailed full-property reset. The
  // duration is phrased as its own clause so any staff wording ("two days",
  // "a day and a half") reads naturally without needing to be an adjective.
  const durationClause = duration ? `, expected to take approximately ${duration},` : ''
  const s1 = `A detailed property reset${durationClause} focused on sorting, clearing and thoroughly cleaning the included areas.`

  // Sentence 2 — main work included, gated on what the scope actually contains.
  const includes: string[] = []
  if (sectionsMention(sections, /sort|pack|box|disposal|waste|item/i)) includes.push('careful item handling')
  if (sectionsMention(sections, /skip bin|rubbish|waste|disposal/i)) includes.push('approved rubbish removal')
  if (sectionsMention(sections, /carpet|shampoo|floor/i)) includes.push('carpet and floor care')
  includes.push('room-by-room deep cleaning')
  // De-dupe while preserving order.
  const uniq = includes.filter((v, i) => includes.indexOf(v) === i)
  const list =
    uniq.length <= 1
      ? uniq[0] ?? 'room-by-room deep cleaning'
      : `${uniq.slice(0, -1).join(', ')} and ${uniq[uniq.length - 1]}`
  const s2 = `The work will include ${list}, with a focus on restoring a cleaner, healthier and more manageable living environment.`

  // Sentence 3 — careful + respectful (always appropriate, invents nothing).
  const s3 = 'Our team will complete the work carefully and respectfully.'

  return `${s1} ${s2} ${s3}`
}

/**
 * The standard Full Property Reset scope, ready to load into the editor when a
 * staff member first selects the service type. Intro is generated from the
 * (initially empty) duration + the default sections; staff then edit freely.
 */
export function buildDefaultResetScope(input?: {
  property_category?: string | null
  service_address?: string | null
}): StructuredScope {
  const sections = FULL_PROPERTY_RESET_SECTIONS.map((s) => ({
    heading: s.heading,
    items: [...s.items],
  }))
  return {
    title: FULL_PROPERTY_RESET_TITLE,
    expectedDuration: '',
    intro: buildResetIntro({
      title: FULL_PROPERTY_RESET_TITLE,
      property_category: input?.property_category ?? null,
      service_address: input?.service_address ?? null,
      expectedDuration: '',
      sections,
    }),
    sections,
    completion: buildResetCompletion(''),
    notes: [...FULL_PROPERTY_RESET_NOTES],
    exclusions: [],
  }
}

// ── Residential Housekeeping ────────────────────────────────────────────────
// A second structured-scope service, sharing the SAME StructuredScope type,
// editor, storage and manual-pricing path as Full Property Reset. Description
// only — no rate/quantity/hourly is ever stored or shown. The "weekly" nature is
// wording only (this is a standard one-off quote, never a recurring engine).

export const RESIDENTIAL_HOUSEKEEPING_TITLE = 'Weekly residential housekeeping service'

/** Approved default housekeeping scope sections (grouped inclusions). Fully editable. */
export const RESIDENTIAL_HOUSEKEEPING_SECTIONS: ScopeSection[] = [
  {
    heading: 'General cleaning',
    items: [
      'General cleaning of bedrooms, bathrooms, kitchens, living areas, entrances and other household spaces',
      'Vacuuming and mopping floors',
      'Dusting and wiping accessible surfaces',
      'Cleaning accessible interior windows, mirrors and glass',
      'Cleaning skirting boards, curtain tracks, doors and other detailed areas',
    ],
  },
  {
    heading: 'Kitchen',
    items: [
      'Cleaning kitchen benches, sinks, cupboard fronts and splashbacks',
      'Cleaning the fridge, freezer, oven, dishwasher or similar household appliances',
      'Cleaning inside selected cupboards, drawers and appliances',
    ],
  },
  {
    heading: 'Bathrooms',
    items: [
      'Cleaning bathroom fixtures, showers, baths, toilets and vanities',
    ],
  },
  {
    heading: 'Laundry & linen',
    items: [
      'Laundry, folding and putting away clothes or household linen',
      'Changing bed linen',
      'Washing and replacing removable chair or couch covers',
    ],
  },
  {
    heading: 'Tidying & detailed tasks',
    items: [
      'Tidying bedrooms, children’s belongings and shared household areas',
      'Cleaning under movable furniture and household items where it is safe and practical',
      'Rotational deep-cleaning tasks agreed with the client',
      'Other reasonable housekeeping duties agreed within the available service time',
    ],
  },
]

/** Approved default housekeeping exclusions. Fully editable. */
export const RESIDENTIAL_HOUSEKEEPING_EXCLUSIONS: string[] = [
  'Cooking or meal preparation',
  'Menu planning',
  'Grocery shopping',
  'Personal care or caregiving duties',
  'Childcare',
  'Exterior window cleaning requiring ladders, roof access or specialist equipment',
  'Moving heavy furniture or appliances',
  'Specialist carpet cleaning',
  'Pest treatment',
  'Mould remediation',
  'Hazardous waste or biohazard cleaning',
  'Work that creates an unreasonable health and safety risk',
  'Work outside the agreed weekly time allocation unless separately approved and quoted',
]

/** Approved default housekeeping service conditions (shown as Important Notes). */
export const RESIDENTIAL_HOUSEKEEPING_NOTES: string[] = [
  'Services are provided on a time-allocation basis. Tasks will be prioritised and completed within the agreed weekly hours. Completion of every listed task during every visit or every week is not guaranteed',
  'Larger, detailed or less frequent tasks may be completed on a rotational basis according to household priorities and the time available',
  'The allocation of hours between service days may vary by agreement and according to operational requirements',
  'The client may provide reasonable day-to-day priorities, provided requested duties remain within the agreed scope, available hours and health and safety requirements',
  'Cooking, meal preparation and grocery shopping are specifically excluded from this service',
  'This is a temporary service ending on the agreed date. Any extension will be subject to availability, revised pricing if applicable and written agreement',
]

/**
 * Housekeeping intro, generated from the quote-specific weekly hours + service
 * days. Both are DESCRIPTIVE ONLY — they never touch pricing. When both are
 * present the wording names them; when either is blank it falls back to neutral
 * wording (never shows a placeholder, empty brackets, or broken text).
 */
export function buildHousekeepingIntro(input?: { weeklyHours?: string | null; serviceDays?: string | null }): string {
  const hours = (input?.weeklyHours ?? '').trim()
  const days = (input?.serviceDays ?? '').trim()
  const context = ' The service is intended for households requiring broader practical support than a standard residential clean. Depending on the agreed scope and household priorities, services may include general cleaning, laundry, linen changes, tidying and rotational detailed cleaning tasks.'

  let lead: string
  if (hours && days) {
    lead = `Provision of up to ${hours} hours of residential housekeeping and cleaning support per week, generally provided across ${days}.`
  } else if (hours) {
    lead = `Provision of up to ${hours} hours of residential housekeeping and cleaning support per week.`
  } else if (days) {
    lead = `Residential housekeeping and cleaning support provided within the agreed weekly service allocation, generally across ${days}.`
  } else {
    lead = 'Residential housekeeping and cleaning support provided within the agreed weekly service allocation.'
  }
  return `${lead}${context}`
}

/** Default housekeeping completion/service-basis wording. Editable. */
export function buildHousekeepingCompletion(): string {
  return 'Services are provided on a time-allocation basis. Tasks will be prioritised and completed in order of household priority within the available hours, with larger or less frequent duties completed on a rotational basis.'
}

/**
 * The default Residential Housekeeping scope, loaded when a staff member first
 * selects the service type. Fully editable thereafter. No pricing data here.
 */
export function buildDefaultHousekeepingScope(): StructuredScope {
  return {
    title: RESIDENTIAL_HOUSEKEEPING_TITLE,
    expectedDuration: '',
    // Weekly hours + service days are quote-specific — blank by default. Staff
    // enter them per quote; the intro regenerates from them (with clean neutral
    // fallback wording while blank).
    weeklyHours: '',
    serviceDays: '',
    intro: buildHousekeepingIntro({ weeklyHours: '', serviceDays: '' }),
    sections: RESIDENTIAL_HOUSEKEEPING_SECTIONS.map((s) => ({ heading: s.heading, items: [...s.items] })),
    completion: buildHousekeepingCompletion(),
    notes: [...RESIDENTIAL_HOUSEKEEPING_NOTES],
    exclusions: [...RESIDENTIAL_HOUSEKEEPING_EXCLUSIONS],
  }
}

/** Service-type codes that use the structured-scope editor + manual pricing. */
export const STRUCTURED_SCOPE_CODES = ['full_property_reset', 'residential_housekeeping'] as const

/** True when a service_type_code uses the structured-scope editor (FPR-style). */
export function isStructuredScopeType(code?: string | null): boolean {
  return !!code && (STRUCTURED_SCOPE_CODES as readonly string[]).includes(code)
}

/** Build the correct default structured scope for a service type code. */
export function buildDefaultScopeFor(
  code: string | null | undefined,
  input?: { property_category?: string | null; service_address?: string | null },
): StructuredScope {
  if (code === 'residential_housekeeping') return buildDefaultHousekeepingScope()
  return buildDefaultResetScope(input)
}

/** Runtime check — does this value look like a stored structured scope?
 *  Tolerant of partial/legacy JSON. Returns a plain boolean (not a type
 *  predicate) so callers can still treat the value as `unknown` and normalise. */
export function isStructuredScope(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return Array.isArray(o.sections)
}

/** Normalise possibly-partial stored JSON into a complete StructuredScope. */
export function normaliseStructuredScope(v: unknown): StructuredScope | null {
  if (!isStructuredScope(v)) return null
  const o = v as Record<string, unknown>
  const sections: ScopeSection[] = Array.isArray(o.sections)
    ? (o.sections as unknown[]).map((s) => {
        const sec = (s ?? {}) as Record<string, unknown>
        return {
          heading: typeof sec.heading === 'string' ? sec.heading : '',
          items: Array.isArray(sec.items) ? (sec.items as unknown[]).map((i) => String(i ?? '')) : [],
        }
      })
    : []
  return {
    title: typeof o.title === 'string' && o.title.trim() ? o.title : FULL_PROPERTY_RESET_TITLE,
    expectedDuration: typeof o.expectedDuration === 'string' ? o.expectedDuration : '',
    intro: typeof o.intro === 'string' ? o.intro : '',
    sections,
    completion: typeof o.completion === 'string' ? o.completion : '',
    notes: Array.isArray(o.notes) ? (o.notes as unknown[]).map((n) => String(n ?? '')) : [],
    exclusions: Array.isArray(o.exclusions) ? (o.exclusions as unknown[]).map((e) => String(e ?? '')) : [],
    // Optional quote-specific housekeeping fields (absent on FPR / legacy quotes).
    weeklyHours: typeof o.weeklyHours === 'string' ? o.weeklyHours : '',
    serviceDays: typeof o.serviceDays === 'string' ? o.serviceDays : '',
  }
}
