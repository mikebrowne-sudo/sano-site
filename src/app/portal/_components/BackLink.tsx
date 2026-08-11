'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/**
 * History-aware "Back" link for the portal. Returns to the page you were
 * actually on (browser history) rather than a hardcoded parent. Falls back to
 * `fallbackHref` when there's no in-app history to go back to (fresh tab, direct
 * link, or an external referrer) so Back never dead-ends.
 *
 * Same look as the existing inline back links (sage-600, ArrowLeft, mb-4).
 */
export function BackLink({
  fallbackHref,
  label = 'Back',
  className = '',
}: {
  fallbackHref: string
  label?: string
  className?: string
}) {
  const router = useRouter()

  function goBack(e: React.MouseEvent) {
    e.preventDefault()
    // If we have same-origin in-app history, go back to it; otherwise use the
    // fallback. `history.length > 1` isn't perfectly reliable, but combined with
    // a referrer check it covers the common "opened fresh / came from outside"
    // cases where a raw back() would leave the app.
    const sameOriginReferrer = typeof document !== 'undefined'
      && document.referrer
      && document.referrer.startsWith(window.location.origin)
    if (sameOriginReferrer && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={goBack}
      className={className || 'inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4'}
    >
      <ArrowLeft size={14} /> {label}
    </a>
  )
}
