// Shared rules for what counts as genuine public-website (marketing) traffic.
//
// Used in two layers:
//   1. Collection — <Analytics /> doesn't load GA on internal routes or in
//      automated browsers (Puppeteer PDF renders, crawlers that drive Chrome).
//   2. Reporting — the portal's GA4 queries exclude the same internal paths
//      plus likely data-centre/automated sessions. GA's raw data is never
//      deleted; filtering is applied only when we read it back.
//
// Client-safe: no Node imports. Keep it that way — Analytics.tsx imports it.

/**
 * Route prefixes that are application traffic, not the marketing website:
 * staff/contractor apps, client portal, token-keyed share pages (also loaded
 * by the Puppeteer PDF renderer on every quote/invoice send), print routes,
 * internal tools and API routes.
 */
export const INTERNAL_PATH_PREFIXES = [
  '/portal',
  '/contractor', // also covers /contractor-setup
  '/client',
  '/share',
  '/proposals',
  '/agreement',
  '/remittance', // also covers /remittance-batch
  '/preview',
  '/collateral',
  '/email-signature', // all email-signature variants
  '/training-docs',
  '/api',
] as const

/** True when a pathname is internal application traffic, not the public site. */
export function isInternalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const p = pathname.toLowerCase()
  return INTERNAL_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(`${prefix}-`) || p.startsWith(`${prefix}?`))
}

/**
 * Small towns whose GA4 traffic is effectively all cloud infrastructure
 * (AWS us-east-1/us-west-2, Google, Microsoft data-centre hubs). Excluded only
 * when the country is not New Zealand. Big cities that also host data centres
 * (Los Angeles, Dublin, Sydney…) are deliberately NOT listed — real people
 * live there; automated traffic from them is caught by the Linux rule below.
 */
export const DATA_CENTRE_CITIES = [
  'Ashburn',
  'Boardman',
  'Council Bluffs',
  'The Dalles',
  'Prineville',
  'Quincy',
  'Forest City',
  'Lenoir',
  'Moncks Corner',
] as const

/**
 * Headless/cloud browsers almost always report desktop Linux. Real overseas
 * prospects for an Auckland cleaner on desktop Linux are negligible, so
 * non-NZ + Linux sessions are treated as automated. NZ Linux users are kept.
 */
export const AUTOMATED_OS = 'Linux'
export const HOME_COUNTRY = 'New Zealand'

/** Browser-side check for automation-driven browsers (Puppeteer, Selenium, Playwright). */
export function isAutomatedBrowser(nav: { webdriver?: boolean; userAgent?: string } | undefined): boolean {
  if (!nav) return false
  if (nav.webdriver === true) return true
  // No generic "bot" match: GA4 already drops known crawlers, and a bare "bot"
  // would hit real phones (e.g. the Cubot Android brand).
  return /HeadlessChrome|PhantomJS|Chrome-Lighthouse/i.test(nav.userAgent ?? '')
}
