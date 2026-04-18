// Sano quote wording engine — generates polished quote scope prose
// from structured staff selections. Wording blocks are fixed and
// must not be paraphrased.

export type ServiceCategory = 'residential' | 'property_management' | 'airbnb' | 'commercial'

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'residential',         label: 'Residential' },
  { value: 'property_management', label: 'Property Management' },
  { value: 'airbnb',              label: 'Airbnb / Short-Stay' },
  { value: 'commercial',          label: 'Commercial' },
]

export const SERVICE_TYPES_BY_CATEGORY: Record<ServiceCategory, { value: string; label: string }[]> = {
  residential: [
    { value: 'standard_clean', label: 'Standard Clean' },
    { value: 'deep_clean',     label: 'Deep Clean' },
    { value: 'move_in_out',    label: 'Move In / Move Out Clean' },
    { value: 'pre_sale',       label: 'Pre-Sale / Presentation Clean' },
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

// Condition/focus sentences — verbatim from spec. Sentence field is the
// exact paragraph to emit when the tag is selected.
export interface ConditionOption {
  value: string
  label: string
  sentence: string
  appliesTo: ServiceCategory[] | 'all'
}

export const CONDITION_OPTIONS: ConditionOption[] = [
  // Condition
  {
    value: 'well_maintained',
    label: 'Well maintained',
    sentence: 'The property is well maintained and will require a standard level of cleaning.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'average_condition',
    label: 'Average condition',
    sentence: 'The property is in average condition and will require a consistent, thorough clean throughout.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'build_up_present',
    label: 'Build-up present',
    sentence: 'Some areas show signs of build-up and will require additional attention to achieve the desired result.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  // Focus
  {
    value: 'high_use_areas',
    label: 'High-use areas',
    sentence: 'Additional attention will be given to high-use areas such as kitchen and bathrooms.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'vacant_property',
    label: 'Vacant property',
    sentence: 'The property is currently vacant, allowing for full access across all areas.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'furnished_property',
    label: 'Furnished property',
    sentence: 'The property is furnished, and cleaning will be carried out around existing furniture and belongings.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'recently_renovated',
    label: 'Recently renovated / post work',
    sentence: 'The property has recently undergone work and will require detailed cleaning to remove dust and residue.',
    appliesTo: ['residential', 'property_management', 'airbnb'],
  },
  {
    value: 'inspection_focus',
    label: 'Inspection / presentation focus',
    sentence: 'The clean will focus on presentation to ensure the property is ready for inspection.',
    appliesTo: ['property_management'],
  },
  {
    value: 'guest_ready_focus',
    label: 'Guest-ready focus',
    sentence: 'The property will be prepared to a high standard, ready for incoming guests.',
    appliesTo: ['airbnb'],
  },
  // Commercial variants
  {
    value: 'commercial_regular_use',
    label: 'Regular use / high traffic',
    sentence: 'The site experiences regular use, and cleaning will focus on maintaining presentation in high-traffic areas.',
    appliesTo: ['commercial'],
  },
  {
    value: 'commercial_build_up',
    label: 'Build-up present',
    sentence: 'Some areas require additional attention due to build-up, which will be addressed as part of the service.',
    appliesTo: ['commercial'],
  },
]

// Optional Section 7 support line (max 1, pick via UI toggle)
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

export const ADDON_OPTIONS: { value: string; label: string; wording: string }[] = [
  { value: 'oven_clean',              label: 'Oven clean',              wording: 'oven clean' },
  { value: 'fridge_clean',            label: 'Fridge clean',            wording: 'fridge clean' },
  { value: 'interior_window',         label: 'Interior window cleaning', wording: 'interior window cleaning' },
  { value: 'glass_doors',             label: 'Glass doors',             wording: 'glass doors' },
  { value: 'wall_spot_cleaning',      label: 'Wall spot cleaning',      wording: 'wall spot cleaning' },
  { value: 'skirting_detailing',      label: 'Skirting board detailing', wording: 'skirting board detailing' },
  { value: 'carpet_cleaning',         label: 'Carpet cleaning',         wording: 'carpet cleaning' },
  { value: 'spot_treatment',          label: 'Spot treatment',          wording: 'spot treatment' },
  { value: 'garage_clean',            label: 'Garage clean',            wording: 'garage clean' },
  { value: 'outdoor_areas',           label: 'Outdoor areas',           wording: 'outdoor areas' },
  { value: 'pressure_washing',        label: 'Pressure washing',        wording: 'pressure washing' },
  { value: 'mould_treatment',         label: 'Mould treatment',         wording: 'mould treatment' },
]

// ─────────────────────────────────────────────────────────────
// Wording templates — preserved verbatim from the approved spec.
// Do not paraphrase.
// ─────────────────────────────────────────────────────────────

const SUMMARY_TEMPLATES: Record<string, (ctx: WordingContext) => string> = {
  'residential.standard_clean':          (c) => `Standard clean for a ${c.bedBath} residential property.`,
  'residential.deep_clean':              (c) => `Deep clean for a ${c.bedBath} residential property.`,
  'residential.move_in_out':             (c) => `Move in / move out clean for a ${c.bedBath} residential property.`,
  'residential.pre_sale':                (c) => `Pre-sale presentation clean for a ${c.bedBath} residential property.`,
  'property_management.routine':         (c) => `Routine cleaning service for a ${c.bedBath} residential property.`,
  'property_management.end_of_tenancy':  (c) => `End of tenancy clean for a ${c.bedBath} residential property, prepared for inspection and handover.`,
  'property_management.pre_inspection':  (c) => `Pre-inspection clean for a ${c.bedBath} residential property.`,
  'property_management.handover':        (c) => `Handover clean for a ${c.bedBath} residential property, prepared to a high presentation standard.`,
  'airbnb.turnover':                     () => `Turnover clean for a short-stay property, prepared for incoming guests.`,
  'airbnb.deep_reset':                   () => `Deep reset clean for a short-stay property, bringing the property back to a high presentation standard.`,
  'commercial.maintenance':              (c) => `Commercial cleaning service for ${c.siteType}, covering all agreed areas.`,
  'commercial.detailed':                 (c) => `Detailed commercial clean for ${c.siteType}, focusing on a higher level of surface and presentation detail.`,
  'commercial.initial':                  (c) => `Initial commercial clean for ${c.siteType}, preparing the site for ongoing maintenance cleaning.`,
  'commercial.one_off_deep':             (c) => `One-off commercial deep clean for ${c.siteType}, carried out to restore presentation and cleanliness.`,
}

const CORE_DESCRIPTIONS: Record<string, string> = {
  'residential.standard_clean':
    'Our standard clean follows the Sano 100-Point Cleaning Standard, designed to deliver a consistent and repeatable result across every property we service. This includes general surface cleaning, vacuuming, mopping, and overall presentation across all selected areas.',
  'residential.deep_clean':
    'Our deep clean includes everything within the Sano 100-Point Cleaning Standard, with additional time and attention given to areas requiring a more thorough clean. This includes build-up removal, detailed edge work, and a higher level of attention to high-use and hard-to-reach areas.',
  'residential.move_in_out':
    'This service follows the Sano 100-Point Cleaning Standard and is designed to prepare the property for occupancy, with a thorough clean carried out across all areas to achieve a high level of presentation.',
  'residential.pre_sale':
    'This service is designed to present the property to a high standard, with a detailed clean carried out to enhance overall appearance and presentation.',
  'property_management.routine':
    'Our routine cleaning service follows the Sano 100-Point Cleaning Standard, ensuring a consistent and reliable level of cleaning across all visits. The focus is on maintaining presentation and cleanliness in line with property expectations.',
  'property_management.end_of_tenancy':
    'This service is designed to prepare the property for inspection and handover, with a detailed clean carried out throughout in line with the Sano 100-Point Cleaning Standard to achieve a high presentation standard.',
  'property_management.pre_inspection':
    'This service focuses on bringing the property up to inspection standard, with targeted cleaning carried out across key areas to ensure presentation is maintained.',
  'property_management.handover':
    'This service is designed to prepare the property for handover, with a detailed clean carried out in line with the Sano 100-Point Cleaning Standard to achieve a high presentation standard.',
  'airbnb.turnover':
    'This service follows the Sano 100-Point Cleaning Standard and is designed to reset the property between guest stays, ensuring a clean, tidy, and well-presented space ready for immediate use.',
  'airbnb.deep_reset':
    'This service includes a more detailed clean to bring the property back to a high presentation standard, with additional attention given to areas requiring a deeper level of cleaning.',
  'commercial.maintenance':
    'Our commercial cleaning service follows a structured cleaning system to ensure a consistent and repeatable standard across every visit. The focus is on maintaining cleanliness, hygiene, and overall presentation across all agreed areas.',
  'commercial.detailed':
    'This service provides a more thorough level of cleaning, focusing on build-up removal, detailed surface cleaning, and areas not typically covered during routine maintenance.',
  'commercial.initial':
    'This service is carried out prior to the commencement of ongoing cleaning, ensuring the site is brought up to a suitable standard for regular maintenance.',
  'commercial.one_off_deep':
    'This service provides a one-off detailed clean to restore presentation and cleanliness across the site, with additional attention given to areas requiring a deeper level of cleaning.',
}

const AREAS_BY_CATEGORY: Record<ServiceCategory, string> = {
  residential:         'The clean will cover all main areas of the property including kitchen, bathrooms, bedrooms, and living spaces, along with any additional selected areas.',
  property_management: 'The clean will cover all main areas of the property, with attention given to key spaces required for inspection and presentation.',
  airbnb:              'The clean will cover all guest-facing areas of the property, including kitchen, bathrooms, bedrooms, and living spaces.',
  commercial:          'Cleaning will be carried out across all agreed areas of the site, including workspaces, common areas, amenities, and entry points.',
}

const EXPECTATION_BY_CATEGORY_TYPE: Record<string, string> = {
  // Specialised override first
  'property_management.end_of_tenancy':
    'This clean is carried out to a high standard to support inspection and handover requirements, however it does not guarantee bond return where there are factors outside of cleaning.',
}

const EXPECTATION_BY_CATEGORY: Record<ServiceCategory, string> = {
  residential:
    'While we aim to achieve a high standard throughout, some permanent wear, staining, or damage may not be fully removable.',
  property_management:
    'While we aim to achieve a high standard throughout, some permanent wear, staining, or damage may not be fully removable.',
  airbnb:
    'The property will be cleaned and prepared to a high standard, ready for guest arrival.',
  commercial:
    'Cleaning will be carried out in line with the agreed scope and frequency to maintain presentation standards across the site.',
}

const DIFFERENTIATION_BY_CATEGORY: Record<ServiceCategory, string> = {
  residential:
    'All work is carried out by trained staff following the Sano 100-Point Cleaning Standard, ensuring a consistent and reliable result across every property we service.',
  property_management:
    'All work is carried out by trained staff following the Sano 100-Point Cleaning Standard, ensuring a consistent and repeatable result. Our focus is on delivering a reliable service aligned with inspection and presentation expectations.',
  airbnb:
    'All work is carried out following our structured cleaning system, with a focus on presentation and consistency to ensure the property is ready for guest arrival.',
  commercial:
    'Cleaning is carried out by trained staff following a structured system to ensure consistency across every visit. We focus on reliability, presentation, and maintaining agreed service standards over time.',
}

// ─────────────────────────────────────────────────────────────
// Types + generator
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

interface WordingContext {
  bedBath: string
  siteType: string
}

function buildBedBath(bedrooms?: number | null, bathrooms?: number | null): string {
  const bed = bedrooms != null && bedrooms > 0 ? `${bedrooms} bedroom` : ''
  const bath = bathrooms != null && bathrooms > 0 ? `${bathrooms} bathroom` : ''
  if (bed && bath) return `${bed}, ${bath}`
  if (bed) return bed
  if (bath) return bath
  return ''
}

function frequencySentence(input: QuoteWordingInput): string | null {
  const f = (input.frequency ?? '').toLowerCase()
  if (!f || f === 'one_off' || f === 'one-off') return null
  const cat = input.service_category
  if (cat === 'commercial' && f === 'x_per_week' && input.x_per_week) {
    return `Cleaning is carried out on a ${input.x_per_week} times per week schedule, aligned with site requirements.`
  }
  const word = f === 'weekly' ? 'weekly' : f === 'fortnightly' ? 'fortnightly' : 'agreed'
  return `Cleaning is scheduled on a ${word} basis to maintain ongoing presentation standards.`
}

function addonsSentence(input: QuoteWordingInput): string | null {
  const selected = (input.addons_wording ?? []).filter(Boolean)
  if (selected.length === 0) return null
  const wordings = selected
    .map((v) => ADDON_OPTIONS.find((o) => o.value === v)?.wording)
    .filter((w): w is string => !!w)
  if (wordings.length === 0) return null
  if (wordings.length <= 2) {
    const joined = wordings.length === 1 ? wordings[0] : `${wordings[0]} and ${wordings[1]}`
    return `Additional services included as part of this quote are ${joined}.`
  }
  const list = wordings.map((w) => `- ${w}`).join('\n')
  return `Additional services included as part of this quote:\n${list}`
}

function conditionSentences(input: QuoteWordingInput): string[] {
  const tags = (input.condition_tags ?? []).slice(0, 2)
  return tags
    .map((t) => CONDITION_OPTIONS.find((o) => o.value === t)?.sentence)
    .filter((s): s is string => !!s)
}

function supportSentence(input: QuoteWordingInput): string | null {
  if (!input.support_line) return null
  return SUPPORT_LINE_OPTIONS.find((o) => o.value === input.support_line)?.sentence ?? null
}

function expectationSentence(input: QuoteWordingInput): string | null {
  if (!input.service_category) return null
  const key = `${input.service_category}.${input.service_type_code}`
  return EXPECTATION_BY_CATEGORY_TYPE[key] ?? EXPECTATION_BY_CATEGORY[input.service_category]
}

function differentiationSentence(input: QuoteWordingInput): string | null {
  if (!input.service_category) return null
  return DIFFERENTIATION_BY_CATEGORY[input.service_category]
}

export function generateQuoteScope(input: QuoteWordingInput): string {
  if (!input.service_category || !input.service_type_code) return ''

  const key = `${input.service_category}.${input.service_type_code}`
  const ctx: WordingContext = {
    bedBath: buildBedBath(input.bedrooms, input.bathrooms) || 'residential',
    siteType: (input.site_type?.trim() || 'the site'),
  }

  const parts: string[] = []

  // §2 Service Summary
  const summaryFn = SUMMARY_TEMPLATES[key]
  if (summaryFn) parts.push(summaryFn(ctx))

  // §3 Core Service Description + optional recurring sentence
  const core = CORE_DESCRIPTIONS[key]
  if (core) parts.push(core)
  const freq = frequencySentence(input)
  if (freq) parts.push(freq)

  // §4 Areas Included
  parts.push(AREAS_BY_CATEGORY[input.service_category])

  // §5 Condition & Focus (0-2 sentences)
  parts.push(...conditionSentences(input))

  // §6 Additional Services
  const addons = addonsSentence(input)
  if (addons) parts.push(addons)

  // §7 Service Standard / Expectation Setting
  const exp = expectationSentence(input)
  if (exp) parts.push(exp)
  const support = supportSentence(input)
  if (support) parts.push(support)

  // §8 Professional / Differentiation Block
  const diff = differentiationSentence(input)
  if (diff) parts.push(diff)

  return parts.join('\n\n')
}

// Helper: which service types support recurring frequency
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
