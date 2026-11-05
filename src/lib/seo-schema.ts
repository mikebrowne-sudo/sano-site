/**
 * Shared JSON-LD for the public site.
 *
 * The CleaningService entity is rendered once per page (public layout) under
 * a stable `@id`. Every Service block references it via `businessRef` so
 * Google sees one business — not a separate, nameless "LocalBusiness" on each
 * service and suburb page.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
export const BUSINESS_ID = `${SITE_URL}/#business`

export const businessRef = {
  '@type': 'CleaningService',
  '@id': BUSINESS_ID,
  name: 'Sano Cleaning',
  url: SITE_URL,
} as const

export function businessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CleaningService',
    '@id': BUSINESS_ID,
    name: 'Sano Cleaning',
    legalName: 'Sano Property Services',
    description:
      'Professional residential and commercial cleaning across Auckland, New Zealand. Regular, deep, end of tenancy, carpet, window, commercial and post-construction cleaning.',
    url: SITE_URL,
    telephone: '0800 726 686',
    email: 'hello@sano.nz',
    image: `${SITE_URL}/brand/sano-logomark.png`,
    logo: `${SITE_URL}/brand/sano-logomark.png`,
    areaServed: { '@type': 'City', name: 'Auckland' },
    address: { '@type': 'PostalAddress', addressLocality: 'Auckland', addressRegion: 'Auckland', addressCountry: 'NZ' },
    priceRange: '$$',
    // Google Business Profile + social URLs, set via NEXT_PUBLIC_SAME_AS as a
    // comma-separated list.
    ...(process.env.NEXT_PUBLIC_SAME_AS
      ? { sameAs: process.env.NEXT_PUBLIC_SAME_AS.split(',').map((s) => s.trim()).filter(Boolean) }
      : {}),
  }
}

/** BreadcrumbList from [name, path] pairs (Home is prepended). */
export function breadcrumbSchema(items: ReadonlyArray<readonly [string, string]>) {
  const all: ReadonlyArray<readonly [string, string]> = [['Home', '/'], ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${path === '/' ? '' : path}`,
    })),
  }
}
