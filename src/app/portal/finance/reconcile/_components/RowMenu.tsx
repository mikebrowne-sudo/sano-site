'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'

/**
 * The "⋯" menu on a reconcile row. Everything secondary lives here — why it
 * matched, warnings, uninvoiced jobs, existing matches with undo, manual
 * matching, tick-off — so the row itself stays to one primary action.
 */
export function RowMenu({ children, attention = false, label = 'More' }: { children: React.ReactNode; attention?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  // Open upward when there isn't room below (last rows of a long table).
  const [up, setUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function toggle() {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setUp(window.innerHeight - r.bottom < 340 && r.top > 340)
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        className={clsx(
          'relative inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
          open ? 'border-sage-300 bg-sage-50 text-sage-700' : 'border-gray-200 text-sage-500 hover:border-sage-300 hover:text-sage-700',
        )}
      >
        <MoreHorizontal size={15} />
        {attention && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div className={clsx(
          'absolute right-0 z-40 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 text-left shadow-lg',
          up ? 'bottom-full mb-1' : 'top-full mt-1',
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

/** A titled block inside the menu. */
export function MenuSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-2 [&+&]:border-t [&+&]:border-gray-100">
      {title && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sage-400">{title}</p>}
      <div className="space-y-1 text-sm text-sage-700">{children}</div>
    </div>
  )
}
