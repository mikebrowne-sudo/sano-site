'use client'

// Phase 5B — admin-only "Edit anyway" trigger that opens a warning
// modal and, on confirmation, navigates to the page with ?override=1.
// The destination page reads that query param + re-verifies admin
// status server-side before enabling the edit affordance with force.
//
// Why a URL param instead of session state: the override is per-page-
// view, the navigation makes the intent visible in the URL bar
// ("you're in override mode"), and refresh keeps the operator in the
// same posture. Closing the URL exits override mode cleanly.

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShieldAlert, X } from 'lucide-react'

export function AmendmentOverrideButton({
  invoiceNumber,
  /** Entity label used in the warning copy. */
  entity,
}: {
  invoiceNumber: string
  entity: 'quote' | 'job'
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function confirm() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('override', '1')
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <ShieldAlert size={14} />
        Edit anyway
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-sage-800/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="amendment-override-title"
          >
            <header className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 id="amendment-override-title" className="text-base font-semibold text-sage-800 inline-flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-700" />
                Edit a locked record
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-sage-500 hover:text-sage-800 transition-colors"
              >
                <X size={16} />
              </button>
            </header>
            <div className="p-5 space-y-3 text-sm text-sage-700">
              <p>
                This {entity} has already been invoiced ({invoiceNumber}).
              </p>
              <p>
                Editing will change the operational record but{' '}
                <strong className="text-sage-800">will NOT change the invoice itself</strong>.
                The change will be logged with your name.
              </p>
              <p className="text-xs text-sage-500">
                Use this only to reconcile genuine billing errors or post-invoice
                amendments the customer has agreed to.
              </p>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-sage-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                aria-busy={isPending || undefined}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Opening…' : 'Edit anyway'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
