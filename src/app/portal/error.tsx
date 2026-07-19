'use client'

// Portal-wide error boundary. Catches a render-time exception anywhere under
// /portal that isn't handled by a nearer boundary, and shows a calm, branded
// fallback with a retry + a way back to the dashboard — instead of Next's bare
// "Application error" screen. Errors are logged to the console + server logs.

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[portal] error boundary caught', { message: error?.message, digest: error?.digest })
  }, [error])

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="bg-white rounded-2xl border border-sage-200 shadow-sm p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-sage-800">Something went wrong</h1>
        <p className="text-sm text-sage-500 mt-2 max-w-sm mx-auto">
          This page hit an unexpected error. Nothing you did is wrong — try again, and if it keeps happening let us know.
        </p>
        {error?.digest && (
          <p className="text-[11px] text-sage-400 font-mono mt-3">reference: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <RotateCcw size={15} /> Try again
          </button>
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 bg-white border border-sage-200 text-sage-700 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <LayoutDashboard size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
