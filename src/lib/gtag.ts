// Tiny Google Analytics 4 helper. Everything is a no-op unless
// NEXT_PUBLIC_GA_ID is set, so with the env var missing the site behaves
// exactly as it does today. No PII is sent — only event names + the contact
// link type (the business's own number/email, never the visitor's details).

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
    dataLayer?: unknown[]
  }
}

export function gaEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !GA_ID || typeof window.gtag !== 'function') return
  window.gtag('event', name, params ?? {})
}

export function gaPageview(url: string) {
  if (typeof window === 'undefined' || !GA_ID || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', { page_path: url })
}
