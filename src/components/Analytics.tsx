'use client'

// Google Analytics 4 loader + lightweight event tracking.
//
// - Renders nothing (and loads no scripts) unless NEXT_PUBLIC_GA_ID is set.
// - Skips the authenticated staff/contractor apps so the numbers reflect
//   marketing-site traffic, not internal CRM usage.
// - Sends page_view manually on client-side navigation (send_page_view is
//   off in the config) so SPA route changes are counted once each.
// - Tracks phone (tel:) and email (mailto:) link clicks via a single
//   delegated listener, so every such link across the site is covered with
//   no per-link changes.
//
// IP anonymisation is on and no visitor PII is sent — a privacy-conscious
// default that doesn't require a cookie banner under NZ practice. See the PR
// notes for the privacy-policy line to add.

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { GA_ID, gaPageview, gaEvent } from '@/lib/gtag'

const EXCLUDED_PREFIXES = ['/portal', '/contractor']

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))
  const enabled = !!GA_ID && !excluded

  // Page views on navigation.
  useEffect(() => {
    if (!enabled) return
    const qs = searchParams?.toString()
    gaPageview(qs ? `${pathname}?${qs}` : pathname)
  }, [enabled, pathname, searchParams])

  // Phone / email click tracking (delegated, covers every tel:/mailto: link).
  useEffect(() => {
    if (!enabled) return
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null
      const link = target?.closest?.('a[href^="tel:"], a[href^="mailto:"]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      if (href.startsWith('tel:')) gaEvent('phone_click', { link_type: 'phone' })
      else if (href.startsWith('mailto:')) gaEvent('email_click', { link_type: 'email' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: false });
        `}
      </Script>
    </>
  )
}
