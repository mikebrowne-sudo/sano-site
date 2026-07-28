import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Green Bay — wave 5. Residential West Auckland suburb. Home-cleaning led.
 * Service-led copy only: no geography/property-stock/demographic claims.
 */

export const metadata: Metadata = {
  title: 'Green Bay Cleaning Services | Sano',
  description:
    'Cleaning for Green Bay homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function GreenBayServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Green Bay',
        heroTitle: 'Professional cleaning for Green Bay homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano keeps Green Bay homes and rentals in good order.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans homes, townhouses, and rentals throughout Green Bay, covering regular weekly or fortnightly upkeep, one-off deeper cleans, and end-of-tenancy resets at changeover.',
          'The scope is agreed before we begin, the work fits around access and the timing that suits each home, and the space is left clean, presentable, and ready to use.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A home cleaned by the Sano team in Auckland',
        servicesLead:
          'Regular upkeep, deep cleans, move cleans, carpets, and windows are all available across Green Bay. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Ongoing upkeep kept to a schedule that suits the household, with a deeper reset dropped in whenever the home needs one.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning worked around stairs, shared entries, and tighter footprints, so multi-level homes stay easy to keep up.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Deeper carpet and upholstery work for when regular vacuuming has stopped shifting marks and ground-in dirt.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans timed to the handover and worked to the checklist owners and property managers inspect against.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Green Bay: regular, deep, end of tenancy, carpet, and window.',
        nearby: [
          { name: 'Titirangi', href: '/service-area/titirangi' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Avondale', href: '/service-area/avondale' },
        ],
      }}
    />
  )
}
