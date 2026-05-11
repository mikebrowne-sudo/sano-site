// Phase 4A — locked page-header primitive per design system §2.2.
//
// Three slots: title, optional subtitle, optional action area (one
// filled primary button per page). Optional back link, locked to the
// sage-600 / ArrowLeft / mb-4 pattern.
//
// Server component. No internal state. Adopt across list + detail
// pages so the top-of-page chrome stops drifting per route.
//
// Composition:
//   <PortalPageHeader
//     backHref="/portal/quotes"
//     backLabel="Back to quotes"
//     title="Quotes"
//     subtitle="Live quotes · latest version only"
//     actions={<Link href="/portal/quotes/new" className={buttonClasses()}>+ New quote</Link>}
//   />

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export interface PortalPageHeaderProps {
  /** Optional back link rendered above the title. */
  backHref?: string
  /** Visible + aria label for the back link. */
  backLabel?: string
  /** H1 — locked sizing per spec §2.2. */
  title: string
  /** One-line subtitle in sage-600, optional. */
  subtitle?: React.ReactNode
  /** Right-side action area. Conventionally one <Button variant="primary">
   *  per page. Stacks below the title at sm breakpoint. */
  actions?: React.ReactNode
}

export function PortalPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  actions,
}: PortalPageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-sage-800 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-sage-600 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
