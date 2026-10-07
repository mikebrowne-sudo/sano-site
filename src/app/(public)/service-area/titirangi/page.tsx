import type { Metadata } from 'next'
import { BadgeCheck, Home, KeyRound, Trees } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Titirangi — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Residential; the most physically distinct
 * page (bush-set homes where decks, glass, and access genuinely change the
 * clean). Traps held: no prestige / "architectural gems" / lifestyle /
 * bohemian framing; bush, timber, decks, glass named only as plain property
 * features; Waitakere Ranges as plain location only.
 */

export const metadata: Metadata = {
  title: 'Titirangi Cleaning Services | Sano',
  description:
    'Cleaning for Titirangi bush-set homes, timber houses, and rentals: regular upkeep, deep cleans, move-in and move-out, glass, and specialist surfaces.',
}

export default function TitirangiServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Titirangi',
        heroTitle: 'Professional cleaning for Titirangi homes and rentals.',
        heroSubtitle:
          "Sano cleans across Titirangi's bush-set homes, timber houses, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, standalone properties, larger homes, and rentals across Titirangi, from regular upkeep to deeper cleans and move-in or move-out work.',
          'Where a property needs a little extra thought on access or timing, that gets planned in ahead of the visit, and the home is left clean, presentable, and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A timber home set among trees in West Auckland',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, glass, and specialist surfaces, the full range of Sano services is available across Titirangi. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Bush-set homes',
            body: 'Bush-set homes where decks, large windows, and the dust and leaf-fall that come with the setting mean glass and outdoor areas often need as much attention as the rooms inside.',
            icon: Trees,
          },
          {
            title: 'Timber and glass homes',
            body: 'Houses with a lot of timber, glass, and open living, where the clean covers the extra surfaces and angles these homes bring, not just the standard rooms.',
            icon: Home,
          },
          {
            title: 'Renovated and extended homes',
            body: 'Homes that have been updated or added to, where the clean works consistently across the new and original spaces so the whole house reads as finished.',
            icon: BadgeCheck,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around the areas an owner or property manager checks before a new tenancy.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Titirangi: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
        ],
      }}
    />
  )
}
