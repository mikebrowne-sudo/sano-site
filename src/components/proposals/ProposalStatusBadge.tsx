import { cn } from '@/lib/utils'
import type { ProposalStatus } from '@/lib/proposals/types'

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft:    'bg-gray-100 text-gray-700 ring-gray-200',
  sent:     'bg-blue-50 text-blue-700 ring-blue-100',
  viewed:   'bg-amber-50 text-amber-700 ring-amber-100',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
}

type ProposalStatusBadgeProps = {
  status: ProposalStatus
  className?: string
}

export function ProposalStatusBadge({ status, className }: ProposalStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status],
        className
      )}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  )
}
