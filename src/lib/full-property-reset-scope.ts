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
  }
}
