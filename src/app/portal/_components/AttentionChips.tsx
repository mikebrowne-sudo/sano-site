// Phase 5.5.14 — render attention reason tags + next-step nudge.
//
// Server component (just renders text). Each reason becomes a small
// pill-coloured chip; nextStep renders as a single faint label after.
//
// Colour palette is intentionally muted — the row copy itself should
// still read first; chips are scannable but not noisy.

import clsx from 'clsx'
import { ArrowRight, AlertTriangle, Clock, FileText, FlaskConical, UserPlus } from 'lucide-react'

interface ChipDef {
  bg: string
  fg: string
  border: string
  icon?: 'clock' | 'alert' | 'doc' | 'flask' | 'user'
}

// Styling per reason — fall back to neutral sage pill for anything unknown.
const CHIPS: Record<string, ChipDef> = {
  // Quotes
  'Unsent draft':       { bg: 'bg-gray-50',    fg: 'text-gray-700',    border: 'border-gray-200',    icon: 'doc'   },
  'Follow up required': { bg: 'bg-amber-50',   fg: 'text-amber-800',   border: 'border-amber-200',   icon: 'clock' },
  'Ready for job':      { bg: 'bg-emerald-50', fg: 'text-emerald-800', border: 'border-emerald-200', icon: 'doc'   },

  // Jobs
  'Needs scheduling':   { bg: 'bg-amber-50',   fg: 'text-amber-800',   border: 'border-amber-200',   icon: 'clock' },
  'Unassigned':         { bg: 'bg-gray-50',    fg: 'text-gray-700',    border: 'border-gray-200',    icon: 'user'  },
  'At risk':            { bg: 'bg-red-50',     fg: 'text-red-700',     border: 'border-red-200',     icon: 'alert' },
  'Ready to invoice':   { bg: 'bg-emerald-50', fg: 'text-emerald-800', border: 'border-emerald-200', icon: 'doc'   },

  // Invoices
  'Not sent':           { bg: 'bg-gray-50',    fg: 'text-gray-700',    border: 'border-gray-200',    icon: 'doc'   },
  'Overdue':            { bg: 'bg-red-50',     fg: 'text-red-700',     border: 'border-red-200',     icon: 'alert' },
  'Outstanding':        { bg: 'bg-amber-50',   fg: 'text-amber-800',   border: 'border-amber-200',   icon: 'clock' },
}

const FALLBACK: ChipDef = { bg: 'bg-sage-50', fg: 'text-sage-700', border: 'border-sage-200' }

function ChipIcon({ icon, size = 10 }: { icon?: ChipDef['icon']; size?: number }) {
  switch (icon) {
    case 'clock': return <Clock size={size} />
    case 'alert': return <AlertTriangle size={size} />
    case 'doc':   return <FileText size={size} />
    case 'flask': return <FlaskConical size={size} />
    case 'user':  return <UserPlus size={size} />
    default:      return null
  }
}

export function AttentionChips({
  reasons,
  nextStep,
  size = 'sm',
}: {
  reasons: string[]
  nextStep?: string
  size?: 'sm' | 'xs'
}) {
  if (reasons.length === 0 && !nextStep) return null
  const isXs = size === 'xs'
  return (
    <div className={clsx('inline-flex flex-wrap items-center gap-1.5', isXs && 'gap-1')}>
      {reasons.map((r) => {
        const chip = CHIPS[r] ?? FALLBACK
        return (
          <span
            key={r}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border font-medium',
              isXs ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5',
              chip.bg, chip.fg, chip.border,
            )}
          >
            <ChipIcon icon={chip.icon} size={isXs ? 9 : 10} />
            {r}
          </span>
        )
      })}
      {nextStep && (
        <span className={clsx(
          'inline-flex items-center gap-1 text-sage-500',
          isXs ? 'text-[10px]' : 'text-[11px]',
        )}>
          <ArrowRight size={isXs ? 9 : 10} />
          {nextStep.replace(/^Next:\s*/, '')}
        </span>
      )}
    </div>
  )
}
