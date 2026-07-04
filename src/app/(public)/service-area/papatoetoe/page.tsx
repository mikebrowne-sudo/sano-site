import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Papatoetoe — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: houses across a range of eras, units-and-flats layer,
 * meaningful rentals, small town-centre offices/retail as the fourth card.
 * Traps (South sensitivity): no affordability / demographic / "growing area"
 * framing; no landmark-as-proof; no "careful" lead. Do not name the town
 * centres (Old Papatoetoe / Hunters Corner) in customer copy.
 */

export const metadata: Metadata = {
  title: 'Papatoetoe Cleaning Services | Sano',
  description:
    'Cleaning for Papatoetoe homes, units, and rentals: regular upkeep, end of tenancy, deep cleans, carpet, and window cleaning.',
}

export default function PapatoetoeServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Papatoetoe',
        heroTitle: 'Professional cleaning for Papatoetoe homes, units, and rentals.',
        heroSubtitle:
          'From regular upkeep and end-of-tenancy resets to deeper cleans and specialist surfaces, Sano handles the scope that matches the property and the reason for the clean.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans houses, units, flats, and rentals across Papatoetoe, covering regular upkeep, one-off deeper cleans, end-of-tenancy resets, and move-in work, with office and workplace cleaning available around the local town centres.',
          'The scope gets confirmed before the first visit, the team fits around the property’s layout and handover timing, and the clean is finished properly.',
        ],
        introImage: '/images/deep-cleaning.jpg',
        introImageAlt: 'A deep-cleaned kitchen in an Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, offices, and specialist surfaces, the full range of Sano services is available across Papatoetoe. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Houses and older homes',
            body: 'Established houses across a range of eras, cleaned room by room with kitchens and bathrooms the recurring focus.',
            icon: Home,
          },
          {
            title: 'Units and flats',
            body: 'Compact layouts where bathrooms, kitchens, and high-touch areas need consistent attention, scoped to the floor plan.',
            icon: Building2,
          },
          {
            title: 'Rental turnovers and handovers',
            body: 'End-of-tenancy and move-in cleans timed to the vacancy window, scoped to what owners and property managers check.',
            icon: KeyRound,
          },
          {
            title: 'Town-centre offices and retail',
            body: 'Small offices and customer-facing spaces around the local town centres, cleaned for presentation and worked in around business hours.',
            icon: Briefcase,
          },
        ],
        schemaDescription:
          'Cleaning services across Papatoetoe: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Manukau', href: '/service-area/manukau' },
          { name: 'Papakura', href: '/service-area/papakura' },
          { name: 'Takanini', href: '/service-area/takanini' },
        ],
      }}
    />
  )
}
