import type {
  CommercialInputs,
  PricingMode,
  PricingView,
  PropertyType,
} from './commercialPricing'

export type QuotePricingMode = 'win' | 'standard' | 'premium'

export function mapPricingMode(mode: PricingMode): QuotePricingMode {
  switch (mode) {
    case 'win_work':   return 'win'
    case 'make_money': return 'standard'
    case 'premium':    return 'premium'
  }
}

const PROPERTY_LABEL: Record<PropertyType, string> = {
  office: 'office',
  warehouse: 'warehouse',
  retail: 'retail space',
  medical: 'medical space',
}

function propertyPhrase(input: CommercialInputs): string {
  const parts: string[] = []
  if ((input.office_m2    ?? 0) > 0) parts.push(`${input.office_m2}m² ${PROPERTY_LABEL.office}`)
  if ((input.warehouse_m2 ?? 0) > 0) parts.push(`${input.warehouse_m2}m² ${PROPERTY_LABEL.warehouse}`)
  if ((input.retail_m2    ?? 0) > 0) parts.push(`${input.retail_m2}m² ${PROPERTY_LABEL.retail}`)
  if ((input.medical_m2   ?? 0) > 0) parts.push(`${input.medical_m2}m² ${PROPERTY_LABEL.medical}`)
  if (parts.length === 0) return `${PROPERTY_LABEL[input.property_type]} site`
  return parts.join(' plus ')
}

function fixturePhrase(bathrooms: number, kitchens: number): string {
  const bits: string[] = []
  if (bathrooms > 0) bits.push(`${bathrooms} ${bathrooms === 1 ? 'bathroom' : 'bathrooms'}`)
  if (kitchens  > 0) bits.push(`${kitchens} ${kitchens  === 1 ? 'kitchen'  : 'kitchens'}`)
  if (bits.length === 0) return ''
  return ` with ${bits.join(' and ')}`
}

function frequencyPhrase(input: CommercialInputs): string {
  const v = input.visits_per_period
  if (input.frequency_type === 'weekly') {
    if (v === 1) return 'once per week'
    if (v === 2) return 'twice per week'
    if (v === 3) return 'three times per week'
    if (v === 4) return 'four times per week'
    if (v === 5) return 'five times per week'
    if (v === 6) return 'six times per week'
    if (v === 7) return 'daily'
    return `${v} times per week`
  }
  if (input.frequency_type === 'fortnightly') {
    if (v === 1) return 'every two weeks'
    if (v === 2) return 'twice per fortnight'
    return `${v} times per fortnight`
  }
  // monthly
  if (v === 1) return 'once per month'
  if (v === 2) return 'twice per month'
  return `${v} times per month`
}

export function buildCommercialDescription(
  input: CommercialInputs,
  _view: PricingView,
): string {
  const property = propertyPhrase(input)
  const fixtures = fixturePhrase(input.bathrooms, input.kitchens)
  const cadence  = frequencyPhrase(input)
  return `Commercial cleaning for a ${property}${fixtures}, serviced ${cadence}`
}

// buildQuoteItemsFromCalc will be added in a later task.
