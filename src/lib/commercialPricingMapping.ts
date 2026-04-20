import type { PricingMode } from './commercialPricing'

export type QuotePricingMode = 'win' | 'standard' | 'premium'

export function mapPricingMode(mode: PricingMode): QuotePricingMode {
  switch (mode) {
    case 'win_work':   return 'win'
    case 'make_money': return 'standard'
    case 'premium':    return 'premium'
  }
}

// buildCommercialDescription + buildQuoteItemsFromCalc will be added in later tasks.
