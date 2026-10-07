import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sparkles } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Orakei — wave 5. Residential East Auckland suburb. Home-cleaning led,
 * apartment + standalone mix. Service-led copy only: no local claims.
 */

export const metadata: Metadata = {
  title: 'Orakei Cleaning Services | Sano',
  description:
    'Cleaning for Orakei homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, window, and carpet cleaning.',
}

export default function OrakeiServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Orakei',
        heroTitle: 'Professional cleaning for Orakei homes and apartments.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano looks after Orakei homes, apartments, and rentals.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano looks after standalone homes, apartments, and rentals across Orakei, from ongoing upkeep to deeper one-off cleans and end-of-tenancy resets, with window work available on top.',
          'The job is scoped with you up front, the clean is shaped around the building and how it is used, and the home or apartment is handed back clean and in order.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-kept Auckland home interior after cleaning',
        servicesLead:
          'Regular upkeep, deep cleans, move cleans, carpets, and window work are all available across Orakei. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning through kitchens, bathrooms, and living areas, with interior glass kept clear as part of the visit.',
            icon: Home,
          },
          {
            title: 'Apartments and units',
            body: 'Cleaning suited to apartment layouts and shared access, keeping wet areas, floors, and windows on a steady footing.',
            icon: Building2,
          },
          {
            title: 'Windows and glass',
            body: 'Glass brought back to clear and streak-free inside and out, either as a standalone visit or folded into a scheduled clean.',
            icon: Sparkles,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans handed over to inspection standard, from the wet areas through to the windows and floors.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Orakei: regular, deep, end of tenancy, window, and carpet.',
        nearby: [
          { name: 'Mission Bay', href: '/service-area/mission-bay' },
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Meadowbank', href: '/service-area/meadowbank' },
        ],
      }}
    />
  )
}
