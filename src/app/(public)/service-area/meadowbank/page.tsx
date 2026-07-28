import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Meadowbank — wave 5. Residential East Auckland suburb. Home-cleaning led.
 * Service-led copy only: no geography/property-stock/demographic claims.
 */

export const metadata: Metadata = {
  title: 'Meadowbank Cleaning Services | Sano',
  description:
    'Cleaning for Meadowbank homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function MeadowbankServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Meadowbank',
        heroTitle: 'Professional cleaning for Meadowbank homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy work, Sano keeps Meadowbank homes, apartments, and rentals well looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans standalone homes, apartments, and rentals across Meadowbank, from regular upkeep to deeper one-off cleans and end-of-tenancy resets before new tenants move in.',
          'The clean is talked through before the first visit, timed to fit around the home and its access, and wrapped up with the place left clean, tidy, and ready to enjoy.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-kept Auckland home interior after cleaning',
        servicesLead:
          'Regular home upkeep, deep cleans, move cleans, carpets, and windows are all available across Meadowbank. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning through living areas, kitchens, and bathrooms, kept to a routine that suits the household.',
            icon: Home,
          },
          {
            title: 'Apartments and units',
            body: 'Cleaning suited to apartment layouts and shared access, keeping wet areas, floors, and glass consistently done.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning to lift built-up dirt and odours between deeper household cleans.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Meadowbank: regular, deep, end of tenancy, carpet, and window.',
        nearby: [
          { name: 'Mission Bay', href: '/service-area/mission-bay' },
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Mount Wellington', href: '/service-area/mount-wellington' },
        ],
      }}
    />
  )
}
