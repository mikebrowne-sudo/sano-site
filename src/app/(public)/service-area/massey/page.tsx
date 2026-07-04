import type { Metadata } from 'next'
import { BadgeCheck, CalendarCheck, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Massey — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: standalone family homes on larger sections, era-varied
 * stock (established standalones + newer subdivision pockets), meaningful
 * rentals. Traps (West sensitivity): no affordability / demographic /
 * "growing area" framing; no landmark-as-proof; no "careful" lead.
 */

export const metadata: Metadata = {
  title: 'Massey Cleaning Services | Sano',
  description:
    'Cleaning for Massey homes and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning across West Auckland.',
}

export default function MasseyServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Massey',
        heroTitle: 'Professional cleaning for Massey homes and rentals.',
        heroSubtitle:
          'From regular upkeep and one-off deep cleans to end-of-tenancy resets, Sano helps Massey households keep their homes properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans standalone family homes, newer builds, and rentals across Massey, from established houses on larger sections to homes in the newer subdivision pockets. Regular weekly or fortnightly upkeep is the mainstay, with deep cleans and end-of-tenancy resets alongside.',
          'The scope gets confirmed before the first visit, the team plans around the household’s timing, and the finish stays consistent whether the home is older or new.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A standalone Auckland family home kept clean by Sano',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, carpets, and windows, the full range of Sano services is available across Massey. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Standalone homes on larger sections',
            body: 'Full-size family homes where regular upkeep across living areas, kitchens, and bathrooms keeps the whole house on top of a busy week.',
            icon: Home,
          },
          {
            title: 'Homes across different eras',
            body: 'Older and newer builds take different cleaning, from original timber and tile to modern finishes, so the scope is matched to how each home is built.',
            icon: BadgeCheck,
          },
          {
            title: 'Rentals and end-of-tenancy cleans',
            body: 'Move-out resets scoped to what a landlord or property manager signs off, timed to the end of one tenancy and the start of the next.',
            icon: KeyRound,
          },
          {
            title: 'Regular upkeep for busy households',
            body: 'Weekly or fortnightly cleans that keep kitchens, bathrooms, and living areas consistently done, so the housework never piles up.',
            icon: CalendarCheck,
          },
        ],
        schemaDescription:
          'Cleaning services across Massey: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'Hobsonville', href: '/service-area/hobsonville' },
          { name: 'Westgate', href: '/service-area/westgate' },
        ],
      }}
    />
  )
}
