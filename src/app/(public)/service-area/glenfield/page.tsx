import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Glenfield — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: established brick-and-tile / weatherboard homes, units,
 * townhouse infill. Differentiates from Milford / Browns Bay via the
 * carpet-led specialist card (they lead on windows). Traps: no prestige /
 * demographic framing; no landmark-as-proof; no "careful" lead.
 */

export const metadata: Metadata = {
  title: 'Glenfield Cleaning Services | Sano',
  description:
    'Cleaning for Glenfield homes, units, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning on the North Shore.',
}

export default function GlenfieldServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Glenfield',
        heroTitle: 'Professional cleaning for Glenfield homes.',
        heroSubtitle:
          'From regular upkeep in established family homes to deep cleans, carpets, and end-of-tenancy resets, Sano matches the clean to the property across Glenfield.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans established homes across Glenfield, from brick-and-tile and weatherboard family houses to units, townhouses, and rentals. The work spans weekly and fortnightly upkeep, one-off deep cleans, carpets, and end-of-tenancy resets.',
          'Every job starts with the scope agreed, runs to the layout and access of the property, and finishes with the home clean, fresh, and ready to live in.',
        ],
        introImage: '/images/carpet-upholstery.jpg',
        introImageAlt: 'Freshly cleaned carpet in an Auckland home',
        servicesLead:
          'From regular upkeep and deeper resets to end-of-tenancy work and carpet cleaning, the full range of Sano services is available across Glenfield. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Established homes',
            body: 'Brick-and-tile and weatherboard family homes where regular cleaning keeps kitchens, bathrooms, and living areas consistently done across bigger floor plans.',
            icon: Home,
          },
          {
            title: 'Units and townhouses',
            body: 'Smaller floor plans and shared-access properties where the clean is scoped to the layout, with kitchens, bathrooms, and laundry areas the regular focus.',
            icon: Building2,
          },
          {
            title: 'Carpets and interiors',
            body: 'Carpet cleaning and interior deep cleans that reset a home before a new tenancy, after winter, or whenever the place needs a proper going-over.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans scoped to what owners and property managers check, with carpets and kitchens usually the priority areas.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Glenfield: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Birkenhead', href: '/service-area/birkenhead' },
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Albany', href: '/service-area/albany' },
        ],
      }}
    />
  )
}
