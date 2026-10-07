import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Beach Haven — wave 5. Residential North Shore suburb. Home-cleaning led.
 * Service-led copy only: no geography/property-stock/demographic claims.
 */

export const metadata: Metadata = {
  title: 'Beach Haven Cleaning Services | Sano',
  description:
    'Cleaning for Beach Haven homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function BeachHavenServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Beach Haven',
        heroTitle: 'Professional cleaning for Beach Haven homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper resets and end-of-tenancy work, Sano keeps Beach Haven homes and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'For family homes, townhouses, and rentals in Beach Haven, Sano covers regular upkeep alongside deeper one-off cleans and move-in or move-out work.',
          'Each visit is planned around the household’s routine and the layout of the home, with the scope agreed beforehand so the place is left clean and ready to enjoy.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A tidy, well-cleaned Auckland home interior',
        servicesLead:
          'Regular home upkeep, deep cleans, move cleans, carpets, and windows are all available across Beach Haven. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Ongoing upkeep on a schedule that suits the household, keeping kitchens, bathrooms, and busy floors on top of week to week.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning worked around stairs, tighter footprints, and shared entries, so multi-level homes stay easy to keep up.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Deeper carpet and upholstery work for when regular vacuuming has stopped shifting the marks and ground-in dirt.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans timed to the handover and worked to the checklist owners and property managers inspect against.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Beach Haven: regular, deep, end of tenancy, carpet, and window.',
        nearby: [
          { name: 'Birkenhead', href: '/service-area/birkenhead' },
          { name: 'Glenfield', href: '/service-area/glenfield' },
          { name: 'Northcote', href: '/service-area/northcote' },
        ],
      }}
    />
  )
}
