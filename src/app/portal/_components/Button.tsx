// Phase 4A — locked Button primitive per design system §2.1.
//
// Four variants, two sizes. No internal state — purely presentational
// and deterministic. Adopt incrementally; existing inline buttons keep
// working until they're swapped over.
//
// Pattern:
//   <Button variant="primary">Send quote</Button>
//   <Button variant="secondary" pending>Sending…</Button>
//   <Link href="/portal/quotes/new" className={buttonClasses({ variant: 'primary' })}>
//     New quote
//   </Link>
//
// `buttonClasses()` exists so Next.js Link / Form actions / anywhere
// that isn't a real <button> can reuse the same chrome without
// rewriting Tailwind soup. Keep both in sync — changes to one update
// the other.

import * as React from 'react'
import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md'

const BASE = 'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1'

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:     'bg-sage-500 hover:bg-sage-700 text-white font-semibold',
  secondary:   'bg-white border border-sage-200 text-sage-700 hover:bg-sage-50',
  ghost:       'text-sage-600 hover:text-sage-800 hover:bg-sage-50',
  destructive: 'bg-white border border-red-200 text-red-700 hover:bg-red-50',
}

export interface ButtonClassOpts {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function buttonClasses(opts: ButtonClassOpts = {}): string {
  const variant = opts.variant ?? 'primary'
  const size    = opts.size    ?? 'md'
  return clsx(BASE, SIZE_CLASSES[size], VARIANT_CLASSES[variant], opts.className)
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** When true, the button renders disabled with aria-busy and the
   *  caller's children become the pending label (e.g. "Sending…").
   *  Avoids the spinner pattern the spec retired in favour of
   *  verb-in-progress text. */
  pending?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', pending, disabled, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {children}
    </button>
  )
})
