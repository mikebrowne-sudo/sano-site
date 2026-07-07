'use client'

// Portal-wide scroll-position restoration. Saves the window scroll for each
// portal URL as you scroll, and restores it before paint whenever you land
// back on that URL — whether you got there via the browser Back button or an
// in-app "Back to …" link. A fresh navigation to a page with no saved
// position lands at the top, as expected.
//
// The portal scrolls the document body (no nested scroll container), so this
// only needs to manage window scroll. Renders nothing.

import { useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

// useLayoutEffect on the client (restore before paint = no flash), useEffect
// on the server (avoids the SSR warning; it never runs there anyway).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const keyFor = (path: string) => `sano-portal-scroll:${path}`

export function PortalScrollRestoration() {
  const pathname = usePathname()

  // Take manual control while in the portal so the browser/router doesn't
  // also try to restore and fight us. Restored on unmount (leaving portal).
  useEffect(() => {
    const prev = window.history.scrollRestoration
    try { window.history.scrollRestoration = 'manual' } catch { /* unsupported */ }
    return () => { try { window.history.scrollRestoration = prev } catch { /* noop */ } }
  }, [])

  // Restore this path's saved position before the browser paints.
  useIsoLayoutEffect(() => {
    let y = 0
    try {
      const saved = sessionStorage.getItem(keyFor(pathname))
      if (saved != null) { const n = parseInt(saved, 10); if (Number.isFinite(n)) y = n }
    } catch { /* sessionStorage unavailable */ }
    window.scrollTo(0, y)
  }, [pathname])

  // Save the position as the user scrolls (debounced), and once more on the
  // way out so the very last position isn't lost to the debounce.
  useEffect(() => {
    const key = keyFor(pathname)
    let t: number | undefined
    const save = () => { try { sessionStorage.setItem(key, String(window.scrollY)) } catch { /* noop */ } }
    const onScroll = () => { window.clearTimeout(t); t = window.setTimeout(save, 80) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.clearTimeout(t); save(); window.removeEventListener('scroll', onScroll) }
  }, [pathname])

  return null
}
