import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Store } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Mangere — wave 5. South Auckland, homes + workplaces. Registry name is ASCII
 * "Mangere" (no macron); `suburb` must match it exactly or the schema/local FAQ
 * silently degrade. Service-led copy only: no local claims.
 */

export const metadata: Metadata = {
  title: 'Mangere Cleaning Services | Sano',
  description:
    'Cleaning for Mangere homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and commercial cleaning across the area.',
}

export default function MangereServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Mangere',
        heroTitle: 'Professional cleaning for Mangere homes and workplaces.',
        heroSubtitle:
          'From regular home upkeep to end-of-tenancy resets and keeping workplaces presentable, Sano covers homes and businesses across Mangere.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Across Mangere, Sano cleans family homes, units, rentals, and workplaces. Some are booked as ongoing upkeep, others as a one-off deep clean, an end-of-tenancy reset, or workplace presentation.',
          'The clean is planned around access and the hours that suit each home or business, with the scope agreed up front so the space ends up clean, presentable, and ready to use.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A home cleaned by the Sano team in Auckland',
        servicesLead:
          'Regular upkeep, deep cleans, move cleans, workplace presentation, carpets, and windows are all available across Mangere. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular upkeep and deeper cleans through the kitchen, bathrooms, and living areas, kept to a schedule that suits the household.',
            icon: Home,
          },
          {
            title: 'Units and rentals',
            body: 'Cleaning suited to units and rental properties, with wet areas and floors kept on a steady footing between deeper resets.',
            icon: Building2,
          },
          {
            title: 'Workplaces',
            body: 'Offices and workplaces cleaned to a presentation standard, scheduled around staff access and business hours.',
            icon: Store,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans timed to the handover and worked to the standard owners and property managers check against.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Mangere: regular, deep, end of tenancy, commercial, carpet, and window.',
        nearby: [
          { name: 'Onehunga', href: '/service-area/onehunga' },
          { name: 'Papatoetoe', href: '/service-area/papatoetoe' },
          { name: 'Manukau', href: '/service-area/manukau' },
        ],
      }}
    />
  )
}
