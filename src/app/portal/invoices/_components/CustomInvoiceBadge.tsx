import { FilePlus2 } from 'lucide-react'

const TOOLTIP = 'Custom (legacy / manual) invoice — created outside the standard quote → job → invoice flow.'

export function CustomInvoiceBadge({ size = 'sm' }: { size?: 'sm' | 'md' } = {}) {
  const cls = size === 'md'
    ? 'inline-flex items-center gap-1 text-xs uppercase tracking-wide font-semibold text-sage-700 bg-sage-100 rounded-full px-2 py-0.5'
    : 'inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-700 bg-sage-100 rounded-full px-1.5 py-0.5'
  const icon = size === 'md' ? 11 : 9
  return (
    <span className={cls} title={TOOLTIP} aria-label={TOOLTIP}>
      <FilePlus2 size={icon} />
      Custom
    </span>
  )
}
