// Contractor trading-structure options, in New Zealand terminology.
//
// The STORED values ('sole_trader', 'company', 'partnership', 'trust', 'other')
// are kept stable for data compatibility — only the display labels use NZ terms.
// In particular the legacy stored value 'company' now displays as
// "New Zealand limited company" without any data migration.

export interface BusinessStructureOption {
  value: string
  label: string
}

export const BUSINESS_STRUCTURES: readonly BusinessStructureOption[] = [
  { value: 'sole_trader', label: 'Sole trader' },
  { value: 'company', label: 'New Zealand limited company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
]

/** Human label for a stored business_structure value (NZ terminology). */
export function businessStructureLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const match = BUSINESS_STRUCTURES.find((b) => b.value === value)
  if (match) return match.label
  // Unknown/legacy value — present it tidily rather than raw.
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
