interface ComputeInput {
  is_price_overridden: boolean
  override_price: string
  engineFinalPrice: number | null
  manualBasePrice: number
}

export function computeFinalPrice({ is_price_overridden, override_price, engineFinalPrice, manualBasePrice }: ComputeInput): number {
  if (is_price_overridden) {
    const n = parseFloat(override_price)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  if (engineFinalPrice != null) return engineFinalPrice
  return manualBasePrice
}
