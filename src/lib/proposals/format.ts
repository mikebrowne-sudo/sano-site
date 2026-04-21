export function formatNzd(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNzdPrecise(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(amount)
}

export function formatProposalDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatServiceLevelLabel(level: string | null | undefined): string {
  if (!level) return '—'
  return level.charAt(0).toUpperCase() + level.slice(1)
}
