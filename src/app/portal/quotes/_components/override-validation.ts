export interface OverrideInput {
  is_price_overridden: boolean
  override_price: string  // raw input string from form
  override_reason: string
  override_confirmed: boolean
}

export interface OverrideValidationErrors {
  override_price?: string
  override_reason?: string
  override_confirmed?: string
}

export function validateOverride(input: OverrideInput): OverrideValidationErrors {
  if (!input.is_price_overridden) return {}

  const errors: OverrideValidationErrors = {}

  const MIN_PRICE = 0.01
  const MAX_PRICE = 99999999.99
  const trimmedPrice = input.override_price.trim()
  const priceFormatRegex = /^\+?\d+(\.\d{1,2})?$/

  if (!priceFormatRegex.test(trimmedPrice)) {
    errors.override_price = 'Enter a valid price (e.g. 100 or 100.00).'
  } else {
    const price = Number(trimmedPrice)
    if (!Number.isFinite(price) || price < MIN_PRICE) {
      errors.override_price = 'Custom price must be at least $0.01.'
    } else if (price > MAX_PRICE) {
      errors.override_price = 'Custom price must not exceed $99,999,999.99.'
    }
  }

  if (!input.override_reason.trim()) {
    errors.override_reason = 'Reason is required.'
  }

  if (!input.override_confirmed) {
    errors.override_confirmed = 'Confirmation is required to apply an override.'
  }

  return errors
}
