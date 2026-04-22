import clsx from 'clsx'

type StatusKind = 'quote' | 'invoice' | 'job'

const QUOTE_STATUS: Record<string, string> = {
  draft: 'bg-sage-100 text-sage-700',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
}

const INVOICE_STATUS: Record<string, string> = {
  draft: 'bg-sage-100 text-sage-700',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-sage-100 text-sage-600',
}

const JOB_STATUS: Record<string, string> = {
  draft: 'bg-sage-100 text-sage-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  invoiced: 'bg-purple-50 text-purple-700',
}

const KIND_MAP: Record<StatusKind, Record<string, string>> = {
  quote: QUOTE_STATUS,
  invoice: INVOICE_STATUS,
  job: JOB_STATUS,
}

interface StatusBadgeProps {
  kind: StatusKind
  status: string
  className?: string
}

export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const map = KIND_MAP[kind]
  const classes = map[status] ?? map.draft
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap',
        classes,
        className,
      )}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
