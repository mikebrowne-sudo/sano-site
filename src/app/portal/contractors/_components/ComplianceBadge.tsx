import clsx from 'clsx'
import { COMPLIANCE_LABELS, COMPLIANCE_STYLES, type ComplianceStatus } from '@/lib/contractor-compliance'

export function ComplianceBadge({ status, reasons, size = 'md' }: { status: ComplianceStatus; reasons?: string[]; size?: 'sm' | 'md' }) {
  return (
    <span
      title={reasons && reasons.length > 0 ? reasons.join('\n') : undefined}
      className={clsx(
        'inline-block rounded-full font-medium',
        COMPLIANCE_STYLES[status],
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      {COMPLIANCE_LABELS[status]}
    </span>
  )
}
