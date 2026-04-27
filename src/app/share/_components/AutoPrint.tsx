'use client'

// Phase 5.5.8 — Tiny client island that triggers window.print() once
// after mount, when the share page is opened with ?print=1. The dash-
// board's "PDF" button uses this; bare "View" links don't append the
// flag, so the print dialog only appears when the user explicitly
// asked for it.

import { useEffect } from 'react'

export function AutoPrint({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    // Defer slightly so layout + fonts settle before the print dialog
    // captures the page. 250ms is enough on cold loads.
    const t = window.setTimeout(() => {
      try { window.print() } catch { /* ignore */ }
    }, 250)
    return () => window.clearTimeout(t)
  }, [active])
  return null
}
