import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Te Atatu South — wave 5. Residential West Auckland suburb. Home-cleaning led.
 * Service-led copy only: no geography/property-stock/demographic claims.
 */

export const metadata: Metadata = {
  title: 'Te Atatu South Cleaning Services | Sano',
  description:
    'Cleaning for Te Atatu South homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function TeAtatuSouthServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Te Atatu South',
        heroTitle: 'Professional cleaning for Te Atatu South homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and move cleans, Sano keeps Te Atatu South homes and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, townhouses, and rentals throughout Te Atatu South, with move-in and move-out work sitting alongside regular upkeep and deeper one-off cleans.',
          'The work is planned around the home’s layout and the times that suit the household, sorted out before the first visit, and finished with the place left tidy and ready.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A home cleaned by the Sano team in Auckland',
        servicesLead:
          'Move cleans and end-of-tenancy resets sit alongside regular upkeep, deep cleans, carpets, and windows across Te Atatu South. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover date and taken to the standard property managers and owners sign off at inspection.',
            icon: KeyRound,
          },
          {
            title: 'Family homes',
            body: 'A regular clean that keeps the kitchen, bathrooms, and living areas ticking over, with a deeper reset added whenever it is due.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning suited to split levels and shared driveways, keeping stairwells, wet areas, and glass consistently done.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning to freshen a home before a tenant moves in or lift wear between deeper cleans.',
            icon: Sofa,
          },
        ],
        schemaDescription:
          'Cleaning services across Te Atatu South: regular, deep, end of tenancy, carpet, and window.',
        nearby: [
          { name: 'Te Atatu Peninsula', href: '/service-area/te-atatu-peninsula' },
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'Massey', href: '/service-area/massey' },
        ],
      }}
    />
  )
}
