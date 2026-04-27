'use client'

// TEMPORARY DIAGNOSTIC — debug/clients-detail-module-trace
//
// Route-segment error boundary. Catches any render-time exception
// thrown by /portal/clients/[id]/page.tsx (or its children) and logs
// the real error message + digest to the browser console + the Next
// error overlay, then renders a minimal fallback so the user isn't
// stuck on the blank "Application error" page.
//
// Remove once the underlying bug is fixed.

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default function ClientDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Browser console — visible in DevTools when the user reproduces.
    // eslint-disable-next-line no-console
    console.error('[clients-debug] ERROR_BOUNDARY caught render error', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    })
  }, [error])

  return (
    <div className="max-w-2xl">
      <Link href="/portal/clients" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} />
        Back to clients
      </Link>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-red-900">Couldn’t load this client</h1>
            <p className="text-sm text-red-800 mt-0.5">
              The page hit an error while rendering. Diagnostics have been logged to the browser console and the server function logs.
            </p>
          </div>
        </div>
        {error?.digest && (
          <p className="text-xs text-red-700 font-mono mb-3">digest: {error.digest}</p>
        )}
        {error?.message && (
          <p className="text-xs text-red-700 font-mono mb-4 break-all">message: {error.message}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/portal/clients"
            className="bg-white border border-red-200 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>
    </div>
  )
}
