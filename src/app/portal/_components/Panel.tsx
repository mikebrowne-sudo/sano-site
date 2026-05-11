// Phase 4A — locked Panel primitive per design system §2.4.
//
// One panel chrome, three variants. Eyebrow label is the default
// section-title style (§2.3); an optional inline title can take its
// place for prominent panels. No nested cards — when a panel needs
// sub-sections, use `border-t border-sage-100` dividers inside.
//
// Server component. Deterministic from props.
//
// Composition:
//   <Panel eyebrow="Schedule">…</Panel>
//   <Panel title="Possible duplicates" variant="warning">…</Panel>
//   <Panel variant="info" padding="md">…</Panel>

import clsx from 'clsx'

export type PanelVariant = 'plain' | 'info' | 'warning' | 'destructive'
export type PanelPadding = 'sm' | 'md'

const PADDING_CLASSES: Record<PanelPadding, string> = {
  sm: 'p-5',  // default — most panels
  md: 'p-6',  // prominent panels
}

// Each variant defines its own surface + border. Plain panels use the
// gray-100 border per spec §6.4; coloured variants use their family's
// 50/200 pair. Text colour is left to the caller — only the chrome
// changes per variant.
const VARIANT_CLASSES: Record<PanelVariant, string> = {
  plain:       'bg-white border-gray-100 shadow-sm',
  info:        'bg-sage-50 border-sage-100',
  warning:     'bg-amber-50 border-amber-200',
  destructive: 'bg-red-50 border-red-200',
}

export interface PanelProps {
  /** Small uppercase tracking-wide eyebrow above the panel body. */
  eyebrow?: string
  /** Inline H3-style title. Mutually exclusive with eyebrow; if both
   *  are passed, title wins. */
  title?: string
  variant?: PanelVariant
  padding?: PanelPadding
  className?: string
  children: React.ReactNode
}

export function Panel({
  eyebrow,
  title,
  variant = 'plain',
  padding = 'sm',
  className,
  children,
}: PanelProps) {
  return (
    <section
      className={clsx(
        'rounded-xl border',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className,
      )}
    >
      {title ? (
        <h3 className="text-base font-semibold text-sage-800 mb-3">{title}</h3>
      ) : eyebrow ? (
        <div className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-3">
          {eyebrow}
        </div>
      ) : null}
      {children}
    </section>
  )
}
