import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Sparkles } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Glen Eden — wave 5. Residential West Auckland suburb. Home-cleaning led.
 * Service-led copy only: no geography/property-stock/demographic claims.
 */

export const metadata: Metadata = {
  title: 'Glen Eden Cleaning Services | Sano',
  description:
    'Cleaning for Glen Eden homes, units, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function GlenEdenServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Glen Eden',
        heroTitle: 'Professional cleaning for Glen Eden homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deep cleans and end-of-tenancy resets, Sano helps Glen Eden households keep homes and rentals in good order.',
        heroImage: '/images/heroes/deep-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans homes, units, and rentals throughout Glen Eden, from ongoing weekly or fortnightly upkeep to a deeper one-off clean or an end-of-tenancy reset between tenants.',
          'A deep clean is a good way to get a home back to detail across kitchens, wet areas, and edges, with regular visits after to hold it there.',
        ],
        introImage: '/images/deep-cleaning.jpg',
        introImageAlt: 'A deep-cleaned Auckland home interior',
        servicesLead:
          'Deep cleans and detailed resets are available across Glen Eden, along with regular upkeep, move cleans, carpets, and windows. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'A full deep clean to reset the detail, then regular visits keeping kitchens, bathrooms, and living areas to a steady standard.',
            icon: Home,
          },
          {
            title: 'Units and townhouses',
            body: 'Cleaning worked around multi-level layouts and shared access, with wet areas and glass given the attention they need.',
            icon: Building2,
          },
          {
            title: 'Windows and glass',
            body: 'Interior and exterior window cleaning for clear, streak-free glass, booked on its own or added onto a regular or deep clean.',
            icon: Sparkles,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-out cleans that take a lived-in home back to handover condition, scoped to what owners and property managers sign off.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Glen Eden: regular, deep, end of tenancy, carpet, and window.',
        nearby: [
          { name: 'Titirangi', href: '/service-area/titirangi' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Henderson', href: '/service-area/henderson' },
        ],
      }}
    />
  )
}
