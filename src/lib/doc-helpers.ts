/**
 * Builds a natural-language service description from quote/invoice fields.
 * e.g. "One-off standard residential clean for a 2-bedroom home"
 */
export function buildServiceDescription(fields: {
  frequency?: string | null
  type_of_clean?: string | null
  property_category?: string | null
  scope_size?: string | null
}): string {
  const parts: string[] = []

  // Frequency first: "One-off", "Weekly", etc.
  if (fields.frequency) {
    parts.push(fields.frequency.toLowerCase())
  }

  // Clean type: "regular cleaning" → "regular clean"
  if (fields.type_of_clean) {
    const clean = fields.type_of_clean
      .replace(/cleaning$/i, 'clean')
      .toLowerCase()
    parts.push(clean)
  }

  // Scope: "2 bedrooms" → "for a 2-bedroom home" or "for a small office"
  if (fields.scope_size) {
    const size = fields.scope_size.toLowerCase()
    const isResidential = !fields.property_category || fields.property_category === 'Residential'

    if (size.includes('bedroom') || size.includes('studio')) {
      const label = size.replace(/\s*bedrooms?/, '-bedroom')
      parts.push(`for a ${label} ${isResidential ? 'home' : 'property'}`)
    } else {
      parts.push(`for a ${size}`)
    }
  }

  if (parts.length === 0) return ''

  // Capitalise first letter
  const sentence = parts.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/**
 * Builds a meaningful pricing label from fields.
 * e.g. "Residential clean" instead of "Base price"
 *
 * Custom invoices supply a free-text service_description; when present,
 * the first non-blank line wins (multi-line descriptions still render
 * in full inside the dedicated Service Description section, so this
 * just gives the pricing-table row a punchier label than "Service").
 */
export function buildPricingLabel(fields: {
  property_category?: string | null
  type_of_clean?: string | null
  service_description?: string | null
}): string {
  const desc = (fields.service_description ?? '').trim()
  if (desc) {
    const firstLine = desc.split('\n').map((l) => l.trim()).find((l) => l.length > 0)
    if (firstLine) return firstLine
  }
  if (fields.type_of_clean) {
    const clean = fields.type_of_clean.replace(/cleaning$/i, 'clean')
    return clean
  }
  if (fields.property_category) {
    return `${fields.property_category} clean`
  }
  return 'Service'
}

/**
 * Extracts first name from a full name string.
 */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return ''
  return fullName.trim().split(/\s+/)[0]
}
