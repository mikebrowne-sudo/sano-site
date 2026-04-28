// Sano quote wording engine — service taxonomy + extras + description
// generator.
//
// Phase residential-upgrade: refactored on top of the previous wording
// engine. The exposed shape (SERVICE_CATEGORIES, ADDON_OPTIONS,
// CONDITION_OPTIONS, generateQuoteScope, etc.) is preserved so legacy
// callers keep working. The internals are rebuilt around three rules:
//
//   1. Base scope (kitchens / bathrooms / bedrooms / living, plus
//      dusting / vacuuming / mopping / mirrors / skirting / cobwebs /
//      touch points) is ALWAYS assumed and never described as a
//      checklist. Service type controls depth, never inclusion.
//   2. Extras list contains only true add-ons. Items that are part
//      of the baseline for a given service type are hidden via
//      `hiddenForServiceTypes` so the operator can't double-charge.
//   3. The description engine emits 5-6 conversational sentences
//      following a fixed structure: opening, scope summary,
//      condition focus, service-level depth, extras, closing.

export type ServiceCategory = 'residential' | 'property_management' | 'airbnb' | 'commercial'

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'residential',         label: 'Residential' },
  { value: 'property_management', label: 'Property Management' },
  { value: 'airbnb',              label: 'Airbnb / Short-Stay' },
  { value: 'commercial',          label: 'Commercial' },
]

export const SERVICE_TYPES_BY_CATEGORY: Record<ServiceCategory, { value: string; label: string }[]> = {
  residential: [
    { value: 'standard_clean',     label: 'Standard Clean' },
    { value: 'deep_clean',         label: 'Deep Clean' },
    { value: 'move_in_out',        label: 'Move In / Move Out Clean' },
    { value: 'pre_sale',           label: 'Pre-Sale / Presentation Clean' },
    // Phase residential-upgrade: post-construction is now its own
    // service type rather than a condition tag, so it controls depth
    // + pricing buffer + closing line.
    { value: 'post_construction',  label: 'Post-Construction Clean' },
  ],
  property_management: [
    { value: 'routine',        label: 'Routine Clean' },
    { value: 'end_of_tenancy', label: 'End of Tenancy Clean' },
    { value: 'pre_inspection', label: 'Pre-Inspection Clean' },
    { value: 'handover',       label: 'Handover / Presentation Clean' },
  ],
  airbnb: [
    { value: 'turnover',   label: 'Turnover Clean' },
    { value: 'deep_reset', label: 'Deep Reset Clean' },
  ],
  commercial: [
    { value: 'maintenance',  label: 'Maintenance Clean' },
    { value: 'detailed',     label: 'Detailed Clean' },
    { value: 'initial',      label: 'Initial Clean' },
    { value: 'one_off_deep', label: 'One-Off Deep Clean' },
  ],
}

export const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'house',      label: 'House' },
  { value: 'apartment',  label: 'Apartment' },
  { value: 'townhouse',  label: 'Townhouse' },
  { value: 'office',     label: 'Office' },
  { value: 'retail',     label: 'Retail' },
  { value: 'warehouse',  label: 'Warehouse' },
  { value: 'other',      label: 'Other' },
]

export const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'one_off',      label: 'One-off' },
  { value: 'weekly',       label: 'Weekly' },
  { value: 'fortnightly',  label: 'Fortnightly' },
  { value: 'x_per_week',   label: 'X times per week' },
]

export const AREA_OPTIONS: { value: string; label: string }[] = [
  { value: 'kitchen',       label: 'Kitchen' },
  { value: 'bathrooms',     label: 'Bathrooms' },
  { value: 'bedrooms',      label: 'Bedrooms' },
  { value: 'living',        label: 'Living areas' },
  { value: 'laundry',       label: 'Laundry' },
  { value: 'hallways',      label: 'Hallways / entry areas' },
  { value: 'office_study',  label: 'Office / study' },
  { value: 'garage',        label: 'Garage' },
  { value: 'outdoor',       label: 'Outdoor areas' },
]

// ─────────────────────────────────────────────────────────────
// Condition tags
// ─────────────────────────────────────────────────────────────

export interface ConditionOption {
  value: string
  label: string
  /** Verbatim sentence emitted when the tag is selected (legacy callers
   *  may still consume this). The new description engine prefers
   *  `state` + `focus` to compose a natural condition-focus line. */
  sentence: string
  /** Short adjective phrase that fits the prose template
   *  "The property is {state}, so the focus will be {focus}." */
  state?: string
  /** Short focus phrase used in the same template above. */
  focus?: string
  appliesTo: ServiceCategory[] | 'all'
}

export const CONDITION_OPTIONS: ConditionOption[] = [
  {
    value: 'well_maintained',
    label: 'Well maintained',
    sentence: 'The property is well maintained and will require a standard level of cleaning.',
    state: 'well maintained',
    focus: 'maintaining the existing standard',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'average_condition',
    label: 'Average condition',
    sentence: 'The property is in average condition and will require a consistent, thorough clean throughout.',
    state: 'in average condition',
    focus: 'a consistent, thorough clean throughout',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'build_up_present',
    label: 'Build-up present',
    sentence: 'Some areas show signs of build-up and will require additional attention to achieve the desired result.',
    state: 'showing build-up in places',
    focus: 'lifting it in the areas that need it',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'high_use_areas',
    label: 'High-use areas',
    sentence: 'Additional attention will be given to high-use areas such as kitchen and bathrooms.',
    state: 'a high-use space',
    focus: 'extra attention on the kitchen and bathrooms',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'vacant_property',
    label: 'Vacant property',
    sentence: 'The property is currently vacant, allowing for full access across all areas.',
    state: 'currently vacant',
    focus: 'a full clean with unrestricted access',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'furnished_property',
    label: 'Furnished property',
    sentence: 'The property is furnished, and cleaning will be carried out around existing furniture and belongings.',
    state: 'furnished',
    focus: 'working carefully around the furniture and belongings',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'recently_renovated',
    label: 'Recently renovated / post work',
    sentence: 'The property has recently undergone work and will require detailed cleaning to remove dust and residue.',
    state: 'post-renovation',
    focus: 'clearing dust and residue from the work',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'inspection_focus',
    label: 'Inspection / presentation focus',
    sentence: 'The clean will focus on presentation to ensure the property is ready for inspection.',
    state: 'inspection-bound',
    focus: 'presentation across every visible surface',
    appliesTo: ['property_management'],
  },
  {
    value: 'guest_ready_focus',
    label: 'Guest-ready focus',
    sentence: 'The property will be prepared to a high standard, ready for incoming guests.',
    state: 'preparing for incoming guests',
    focus: 'getting it presentation-ready in the time available',
    appliesTo: ['airbnb'],
  },
  {
    value: 'commercial_regular_use',
    label: 'Regular use / high traffic',
    sentence: 'The site experiences regular use, and cleaning will focus on maintaining presentation in high-traffic areas.',
    state: 'a high-traffic site',
    focus: 'maintaining presentation in the busiest areas',
    appliesTo: ['commercial'],
  },
  {
    value: 'commercial_build_up',
    label: 'Build-up present',
    sentence: 'Some areas require additional attention due to build-up, which will be addressed as part of the service.',
    state: 'showing build-up in places',
    focus: 'lifting it where it has accumulated',
    appliesTo: ['commercial'],
  },
]

export const SUPPORT_LINE_OPTIONS: { value: string; label: string; sentence: string }[] = [
  {
    value: 'time_on_site_may_vary',
    label: 'Time on site may vary',
    sentence: 'Final time on site may vary depending on the actual condition at the time of cleaning.',
  },
  {
    value: 'reasonable_access',
    label: 'Reasonable access assumed',
    sentence: 'Cleaning will be carried out based on reasonable access to all areas at the time of service.',
  },
]

// ─────────────────────────────────────────────────────────────
// Extras (true add-ons only)
//
// Three categories — high-value (genuine extra services), detail-time
// (work that adds time but isn't transformative), condition-based
// (treatment for specific problems).
//
// `hiddenForServiceTypes` is the conditional gate: an extra in this
// list is BASELINE for the named service types and must not be
// surfaced as a chargeable add-on for those services.
//
// `deprecated` flags codes that legacy quote rows still reference
// but the picker should no longer surface. These codes still resolve
// to a label/wording so old quotes render unchanged.
// ─────────────────────────────────────────────────────────────

export type AddonCategory = 'high_value' | 'detail_time' | 'condition_based'

export interface AddonOption {
  value: string
  label: string
  wording: string
  category: AddonCategory
  /** Service-type codes (without category prefix) for which this
   *  add-on is part of the baseline and must not be charged again.
   *  e.g. interior windows are baseline for deep / move-in-out /
   *  end-of-tenancy / post-construction; surfacing them as a
   *  chargeable extra would double-charge the operator's time. */
  hiddenForServiceTypes?: string[]
  /** Hidden from the picker but still resolves wording for legacy
   *  rows that reference this code. */
  deprecated?: boolean
}

export const ADDON_OPTIONS: AddonOption[] = [
  // ── HIGH VALUE ────────────────────────────────────────────────
  { value: 'oven_clean',           label: 'Oven deep clean',          wording: 'oven deep clean',          category: 'high_value' },
  { value: 'fridge_clean',         label: 'Fridge interior clean',    wording: 'fridge interior clean',    category: 'high_value' },
  { value: 'carpet_cleaning',      label: 'Carpet cleaning',          wording: 'carpet cleaning',          category: 'high_value' },
  { value: 'upholstery_cleaning',  label: 'Upholstery cleaning',      wording: 'upholstery cleaning',      category: 'high_value' },
  { value: 'exterior_window',      label: 'Exterior window cleaning', wording: 'exterior window cleaning', category: 'high_value' },
  { value: 'pressure_washing',     label: 'Pressure washing',         wording: 'pressure washing',         category: 'high_value' },
  { value: 'rubbish_removal',      label: 'Rubbish removal',          wording: 'rubbish removal',          category: 'high_value' },
  { value: 'garage_full',          label: 'Garage full clean',        wording: 'garage full clean',        category: 'high_value' },

  // ── DETAIL / TIME-BASED ───────────────────────────────────────
  { value: 'inside_cupboards',     label: 'Inside cupboards & drawers', wording: 'inside cupboards and drawers',
    category: 'detail_time',
    // Baseline for end-of-tenancy & move-in-out (handover-ready scope).
    hiddenForServiceTypes: ['end_of_tenancy', 'move_in_out', 'handover'] },
  { value: 'inside_wardrobes',     label: 'Inside wardrobes',         wording: 'inside wardrobes',
    category: 'detail_time',
    hiddenForServiceTypes: ['end_of_tenancy', 'move_in_out', 'handover'] },
  { value: 'blinds_shutters',      label: 'Blinds / shutters',        wording: 'blinds and shutters',      category: 'detail_time' },
  { value: 'full_wall_wash',       label: 'Full wall wash',           wording: 'full wall wash',           category: 'detail_time' },
  { value: 'high_dusting',         label: 'High dusting',             wording: 'high dusting (above normal reach)',
    category: 'detail_time',
    // Already inside deep / post-construction baseline.
    hiddenForServiceTypes: ['deep_clean', 'post_construction'] },
  { value: 'balcony_deck',         label: 'Balcony / deck clean',     wording: 'balcony or deck clean',    category: 'detail_time' },

  // ── CONDITION-BASED ───────────────────────────────────────────
  { value: 'heavy_grease',         label: 'Heavy grease treatment',   wording: 'heavy grease treatment',   category: 'condition_based' },
  { value: 'mould_treatment',      label: 'Heavy mould treatment',    wording: 'heavy mould treatment',    category: 'condition_based' },
  { value: 'post_construction_residue',
    label: 'Post-construction residue',
    wording: 'post-construction residue treatment',
    category: 'condition_based',
    hiddenForServiceTypes: ['post_construction'] },

  // ── DEPRECATED — kept for backwards compat with legacy quote rows.
  // The picker should not surface these (filterAddonsForServiceType
  // handles it); the codes still resolve to a label/wording so old
  // quotes render correctly.
  { value: 'interior_window',      label: 'Interior window cleaning', wording: 'interior window cleaning',
    category: 'detail_time',
    deprecated: true,
    hiddenForServiceTypes: ['deep_clean', 'move_in_out', 'end_of_tenancy', 'post_construction'] },
  { value: 'glass_doors',          label: 'Glass doors',              wording: 'glass doors',              category: 'detail_time', deprecated: true },
  { value: 'wall_spot_cleaning',   label: 'Wall spot cleaning',       wording: 'wall spot cleaning',       category: 'detail_time', deprecated: true,
    hiddenForServiceTypes: ['deep_clean', 'move_in_out', 'end_of_tenancy', 'post_construction'] },
  { value: 'skirting_detailing',   label: 'Skirting board detailing', wording: 'skirting board detailing', category: 'detail_time', deprecated: true,
    hiddenForServiceTypes: ['deep_clean', 'move_in_out', 'end_of_tenancy', 'post_construction'] },
  { value: 'spot_treatment',       label: 'Spot treatment',           wording: 'spot treatment',           category: 'condition_based', deprecated: true },
  { value: 'outdoor_areas',        label: 'Outdoor areas',            wording: 'outdoor areas',            category: 'detail_time', deprecated: true },
  { value: 'garage_clean',         label: 'Garage clean',             wording: 'garage clean',             category: 'detail_time', deprecated: true },
]

/** Returns the add-ons the picker should surface for the given service
 *  type. Hides deprecated codes always; hides codes whose
 *  hiddenForServiceTypes includes the current service-type code. */
export function filterAddonsForServiceType(serviceTypeCode?: string | null): AddonOption[] {
  return ADDON_OPTIONS.filter((a) => {
    if (a.deprecated) return false
    if (!serviceTypeCode) return true
    return !(a.hiddenForServiceTypes ?? []).includes(serviceTypeCode)
  })
}

// ─────────────────────────────────────────────────────────────
// Service-type vocabulary used by the description generator.
// Each entry has:
//   opening   — friendly first sentence
//   scope     — broad scope summary (no checklist)
//   depth     — service-level detail line (optional; only emitted
//               when the service has a distinct depth narrative)
//   closing   — service-specific closing per the spec
// ─────────────────────────────────────────────────────────────

interface ServiceVocab {
  opening: string
  scope: string
  depth?: string
  closing: string
}

const SERVICE_VOCAB: Record<string, ServiceVocab> = {
  'residential.standard_clean': {
    opening: 'A standard clean to keep the home looking its best.',
    scope: 'All living spaces, kitchen, bathrooms and bedrooms are covered as part of the visit.',
    closing: 'The clean will be completed to a consistent, professional standard.',
  },
  'residential.deep_clean': {
    opening: 'A deep clean designed to reset the property top to bottom.',
    scope: 'Every room is covered with extra time spent on the kitchen, bathrooms and detail-heavy areas.',
    depth: 'Skirtings, edges, interior windows and built-up surfaces are all part of the visit.',
    closing: 'The clean will be completed with a detailed, top-to-bottom approach.',
  },
  'residential.move_in_out': {
    opening: 'A move in / move out clean to prepare the property for handover.',
    scope: 'The whole home is covered, with kitchens, bathrooms and storage given the extra detail this service needs.',
    depth: 'Inside cupboards, inside wardrobes and interior windows are included.',
    closing: 'The clean will be completed to a handover-ready standard.',
  },
  'residential.pre_sale': {
    opening: 'A pre-sale clean to get the property ready for market.',
    scope: 'Living spaces, kitchen, bathrooms and bedrooms are all covered, with attention given to overall presentation.',
    closing: 'The clean will be completed with a focus on presentation and overall finish.',
  },
  'residential.post_construction': {
    opening: 'A post-construction clean to clear dust and residue after building work.',
    scope: 'Every room is covered, with extra time on surfaces, fittings and floors that hold post-work residue.',
    depth: 'High dusting, edge work and detailed surface cleaning are included.',
    closing: 'The clean will be completed to remove dust and residue, leaving the space ready for use.',
  },
  'property_management.routine': {
    opening: 'A routine clean to maintain the property between tenants and inspections.',
    scope: 'Living areas, kitchen, bathrooms and bedrooms are covered each visit to keep the property presentation consistent.',
    closing: 'The clean will be completed to a consistent, professional standard.',
  },
  'property_management.end_of_tenancy': {
    opening: 'An end of tenancy clean to prepare the property for inspection and handover.',
    scope: 'The whole property is covered, with detailed work in kitchens, bathrooms and storage areas.',
    depth: 'Inside cupboards, inside wardrobes and interior windows are included as part of the handover scope.',
    closing: 'The clean will be completed to a handover-ready standard.',
  },
  'property_management.pre_inspection': {
    opening: 'A pre-inspection clean to bring the property up to presentation standard.',
    scope: 'Targeted attention is given to the spaces inspectors and prospective tenants notice first.',
    closing: 'The clean will be completed with a focus on presentation and overall finish.',
  },
  'property_management.handover': {
    opening: 'A handover clean to present the property at a high standard for the next occupant.',
    scope: 'All living areas, kitchen, bathrooms and bedrooms are covered with extra care for storage and detail.',
    depth: 'Inside cupboards, inside wardrobes and interior windows are included.',
    closing: 'The clean will be completed to a handover-ready standard.',
  },
  'airbnb.turnover': {
    opening: 'A turnover clean between guest stays.',
    scope: 'Living spaces, kitchen, bathroom and bedrooms are reset with linen and presentation in mind.',
    closing: 'The clean will be completed to a guest-ready standard.',
  },
  'airbnb.deep_reset': {
    opening: 'A deep reset clean to bring the short-stay property back to its presentation standard.',
    scope: 'Every room is covered, with extra time on the spaces guests use most.',
    depth: 'Skirtings, edges and detail-heavy surfaces get the additional attention this service is designed for.',
    closing: 'The clean will be completed to a guest-ready standard.',
  },
  'commercial.maintenance': {
    opening: 'A maintenance clean to keep the site presentation consistent between visits.',
    scope: 'All agreed work areas, common spaces, amenities and entry points are covered each visit.',
    closing: 'The clean will be completed to a consistent, professional standard.',
  },
  'commercial.detailed': {
    opening: 'A detailed commercial clean above and beyond the routine maintenance scope.',
    scope: 'Surfaces, fittings and high-traffic spaces receive extra time for build-up and finish.',
    closing: 'The clean will be completed with a detailed, top-to-bottom approach.',
  },
  'commercial.initial': {
    opening: 'An initial commercial clean to bring the site up to standard before ongoing service starts.',
    scope: 'All agreed areas are covered to establish the baseline for the maintenance schedule that follows.',
    closing: 'The clean will be completed to a consistent, professional standard.',
  },
  'commercial.one_off_deep': {
    opening: 'A one-off commercial deep clean to restore presentation across the site.',
    scope: 'Every agreed area is covered with extra time on surfaces and details that need it most.',
    closing: 'The clean will be completed with a detailed, top-to-bottom approach.',
  },
}

/** Service-specific closing line — exported for call-sites that want
 *  the closing string on its own (e.g. proposal templates). Falls back
 *  to a generic line when the service-type key is unknown. */
export function closingLineFor(serviceCategory?: ServiceCategory | null, serviceTypeCode?: string | null): string {
  if (!serviceCategory || !serviceTypeCode) return 'The clean will be completed to a consistent, professional standard.'
  const key = `${serviceCategory}.${serviceTypeCode}`
  return SERVICE_VOCAB[key]?.closing ?? 'The clean will be completed to a consistent, professional standard.'
}

// ─────────────────────────────────────────────────────────────
// Description generator (5–6 sentences, conversational, no checklists)
// ─────────────────────────────────────────────────────────────

export interface QuoteWordingInput {
  service_category?: ServiceCategory | null
  service_type_code?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  site_type?: string | null
  frequency?: string | null
  areas_included?: string[] | null
  condition_tags?: string[] | null
  addons_wording?: string[] | null
  support_line?: string | null
  x_per_week?: number | null
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function bedBathPhrase(bedrooms?: number | null, bathrooms?: number | null): string {
  const parts: string[] = []
  if (bedrooms != null && bedrooms > 0) parts.push(`${bedrooms}-bedroom`)
  if (bathrooms != null && bathrooms > 0) parts.push(`${bathrooms}-bathroom`)
  return parts.join(', ')
}

function frequencySuffix(input: QuoteWordingInput): string | null {
  const f = (input.frequency ?? '').toLowerCase()
  if (!f || f === 'one_off' || f === 'one-off') return null
  if (input.service_category === 'commercial' && f === 'x_per_week' && input.x_per_week) {
    return `Visits run ${input.x_per_week} times per week to match the site's pattern.`
  }
  if (f === 'weekly')      return 'Visits run weekly to keep things consistent.'
  if (f === 'fortnightly') return 'Visits run fortnightly to keep things consistent.'
  return null
}

function conditionFocusSentence(input: QuoteWordingInput, isCommercial: boolean): string | null {
  const tags = (input.condition_tags ?? []).slice(0, 2)
  if (tags.length === 0) return null

  const opts = tags
    .map((t) => CONDITION_OPTIONS.find((o) => o.value === t))
    .filter((o): o is ConditionOption => !!o)
  if (opts.length === 0) return null

  // The leading tag supplies the "state" phrase; both can contribute
  // their "focus" phrase. Subject word swaps for commercial sites.
  const subject = isCommercial ? 'The site' : 'The property'
  const lead = opts[0]
  const state = lead.state ?? lead.label.toLowerCase()
  const focusPhrases = opts.map((o) => o.focus).filter((f): f is string => !!f)
  if (focusPhrases.length === 0) {
    // Fall back to the verbatim legacy sentence.
    return lead.sentence
  }
  return `${subject} is ${state}, so the focus will be ${joinNatural(focusPhrases)}.`
}

function extrasSentence(input: QuoteWordingInput): string | null {
  const selected = (input.addons_wording ?? []).filter(Boolean)
  if (selected.length === 0) return null
  const wordings = selected
    .map((v) => ADDON_OPTIONS.find((o) => o.value === v)?.wording)
    .filter((w): w is string => !!w)
  if (wordings.length === 0) return null
  return `Add-ons booked alongside this clean: ${joinNatural(wordings)}.`
}

function openingFor(vocab: ServiceVocab, bedBath: string, siteType: string, isCommercial: boolean): string {
  if (isCommercial && siteType) {
    // Replace "the property" / "the site" depending on context.
    const opening = vocab.opening.replace(/property/g, siteType)
    return opening
  }
  if (!bedBath) return vocab.opening
  // Insert the bed/bath phrase into the opening — natural pattern is
  // "for the home" → "for this 3-bedroom, 2-bathroom home".
  if (vocab.opening.includes('property')) {
    return vocab.opening.replace('property', `${bedBath} property`)
  }
  if (vocab.opening.includes('home')) {
    return vocab.opening.replace('home', `${bedBath} home`)
  }
  return vocab.opening
}

export function generateQuoteScope(input: QuoteWordingInput): string {
  if (!input.service_category || !input.service_type_code) return ''

  const key = `${input.service_category}.${input.service_type_code}`
  const vocab = SERVICE_VOCAB[key]
  if (!vocab) return ''

  const bedBath = bedBathPhrase(input.bedrooms, input.bathrooms)
  const siteType = input.site_type?.trim() || 'the site'
  const isCommercial = input.service_category === 'commercial'

  const sentences: string[] = []

  // 1. Opening — what it is + context.
  sentences.push(openingFor(vocab, bedBath, siteType, isCommercial))

  // 2. Scope summary — broad, no checklist.
  sentences.push(vocab.scope)

  // 3. Condition / situation — most important line. Adapts based
  //    on selected condition tags.
  const cond = conditionFocusSentence(input, isCommercial)
  if (cond) sentences.push(cond)

  // 4. Service-level detail — only when the service has a distinct
  //    depth narrative (deep, move-in/out, end-of-tenancy, etc.).
  if (vocab.depth) sentences.push(vocab.depth)

  // 5. Extras — only if selected.
  const extras = extrasSentence(input)
  if (extras) sentences.push(extras)

  // 5b. Frequency — additive when the service is recurring. Counts
  //     toward the 5-6 sentence target only when present.
  const freq = frequencySuffix(input)
  if (freq) sentences.push(freq)

  // 6. Closing — service-specific.
  sentences.push(vocab.closing)

  return sentences.join(' ')
}

// ─────────────────────────────────────────────────────────────
// Helper: which service types support recurring frequency.
// (Public — used by QuoteBuilder to gate the frequency selector.)
// ─────────────────────────────────────────────────────────────

export function supportsRecurring(category?: ServiceCategory | null, type?: string | null): boolean {
  if (!category || !type) return false
  const key = `${category}.${type}`
  return [
    'residential.standard_clean',
    'property_management.routine',
    'airbnb.turnover',
    'commercial.maintenance',
  ].includes(key)
}
