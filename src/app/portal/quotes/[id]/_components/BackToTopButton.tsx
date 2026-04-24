'use client'

// Phase A — floating back-to-top button.
//
// Appears after the user scrolls past ~400px. Fixed bottom-right,
// sits above the sticky action bar on mobile. Smooth-scrolls back
// to the top of the document.

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 md:bottom-24 md:right-8 z-50 inline-flex items-center justify-center w-11 h-11 rounded-full bg-sage-700 text-white shadow-lg hover:bg-sage-800 transition-colors"
      aria-label="Back to top"
    >
      <ArrowUp size={18} />
    </button>
  )
}
