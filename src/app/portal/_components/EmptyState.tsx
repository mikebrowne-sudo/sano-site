// Phase 4A — locked EmptyState primitive per design system §1.12.
//
// Three lines, max:
//   1. Neutral 32px lucide icon in sage-200
//   2. One sentence about what's missing (sage-800 font-medium)
//   3. One sentence about the next action (sage-600 text-sm)
//   4. Optional primary button if a next step exists
//
// Container: bg-white rounded-xl border border-gray-100 shadow-sm
// p-10 text-center. No illustrations, no decorative SVG.
//
// Composition:
//   <EmptyState
//     icon={Receipt}
//     title="No invoices yet."
//     description="Convert a quote to create the first one."
//     action={<Link href="/portal/quotes" className={buttonClasses()}>Go to quotes</Link>}
//   />

import type { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  /** Lucide icon component (not an element). Rendered at 32px in
   *  sage-200 — colour is locked, can't be overridden. */
  icon: LucideIcon
  /** One sentence saying what's missing. */
  title: string
  /** One sentence saying the next action. Optional — many empty
   *  states are self-explanatory after the title. */
  description?: string
  /** Optional action affordance. Typically a Link wearing
   *  `buttonClasses()` chrome or a <Button>. */
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
      <Icon size={32} className="text-sage-200 mx-auto mb-3" />
      <p className="text-sage-800 font-medium mb-1">{title}</p>
      {description && (
        <p className="text-sage-600 text-sm mb-4">{description}</p>
      )}
      {action && (
        <div className="inline-flex items-center gap-2">{action}</div>
      )}
    </div>
  )
}
