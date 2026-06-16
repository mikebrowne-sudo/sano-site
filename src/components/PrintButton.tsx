'use client'

import { Printer } from 'lucide-react'

// Small client-side print trigger. Hidden from the printed output itself
// (the remittance document's @media print rules show only the advice).
export function PrintButton({ label = 'Print', className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors'
      }
    >
      <Printer size={15} /> {label}
    </button>
  )
}
