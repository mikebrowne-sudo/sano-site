import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sparkles } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Northcote — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: older houses + medium-density townhouse development
 * around the town centre. End-of-tenancy hero (unused by North Shore
 * siblings). Traps: no "up-and-coming" / regeneration framing; no
 * landmark-as-proof; no "careful" lead.
 */

export const metadata: Metadata = {
  title: 'Northcote Cleaning Services | Sano',
  description:
    'Cleaning for Northcote homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, and window cleaning on the North Shore.',
}

export default function NorthcoteServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Northcote',
        heroTitle: 'Professional cleaning for Northcote homes, townhouses, and rentals.',
        heroSubtitle:
          'Sano cleans Northcote’s older houses and newer townhouses alike, from regular upkeep and deep cleans through to end-of-tenancy resets at handover.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Across Northcote, Sano cleans older family houses, newer townhouses around the town centre, and the rentals in between. The work runs from ongoing weekly or fortnightly cleaning to deeper one-off cleans and end-of-tenancy resets.',
          'The scope is confirmed before the first visit, the clean is planned around access and timing, and the home is left clean and ready to hand over or live in.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'A rental left clean and ready at handover',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, windows, and specialist surfaces, the full range of Sano services is available across Northcote. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Older houses',
            body: 'Established houses with older layouts and original joinery, where detail work through kitchens, bathrooms, and skirting boards makes the difference.',
            icon: Home,
          },
          {
            title: 'Townhouses and new builds',
            body: 'Multi-level townhouse layouts around the town centre, where the clean is planned around glass, kitchens, and bathrooms spread across floors.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Handover cleans for owners and property managers with one rental or several, scoped to what gets checked before the next tenancy starts.',
            icon: KeyRound,
          },
          {
            title: 'Glass and windows',
            body: 'Interior and exterior window cleaning, a regular ask on townhouses and newer builds where glass makes up much of the frontage.',
            icon: Sparkles,
          },
        ],
        schemaDescription:
          'Cleaning services across Northcote: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Birkenhead', href: '/service-area/birkenhead' },
          { name: 'Glenfield', href: '/service-area/glenfield' },
          { name: 'Takapuna', href: '/service-area/takapuna' },
        ],
      }}
    />
  )
}
