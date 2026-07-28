import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Mount Eden — the original suburb pilot, migrated onto the shared
 * SuburbLandingTemplate (parity sweep) with all copy preserved verbatim.
 * Residential-led. Traps held: no Mount-Eden-specific local claims beyond
 * cautious property-mix wording; no prestige / heritage-value framing.
 * Pilot spec: docs/superpowers/specs/2026-05-25-mount-eden-suburb-pilot.md
 */

export const metadata: Metadata = {
  title: 'Mount Eden Cleaning Services | Sano',
  description:
    'Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals. Sano helps prepare properties for everyday living, inspections, and handovers.',
}

export default function MountEdenServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Mount Eden',
        heroTitle: 'Cleaning for homes, rentals, and workplaces.',
        heroSubtitle:
          'From older homes and apartments to rentals, offices, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano handles cleaning for family homes, character homes, apartments, townhouses, and rentals across Mount Eden, from weekly or fortnightly upkeep to one-off deep cleans and move-outs.',
          'The clean is planned around the layout and access of each property, with the scope agreed beforehand, so the place is left clean, tidy, and ready to use.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A residential Auckland home cared for by Sano',
        servicesLead:
          'From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Older homes and detailed interiors',
            body: 'More detailed dusting, skirting boards, room-by-room work, and care around detailed surfaces.',
            icon: Home,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Compact layouts where kitchens, bathrooms, glass, floors, and access timing matter.',
            icon: Building2,
          },
          {
            title: 'Rentals and handovers',
            body: 'Clear scopes, practical timing, and attention to the areas owners or property managers are likely to check.',
            icon: KeyRound,
          },
          {
            title: 'Workplaces and small commercial spaces',
            body: 'Regular presentation, shared amenities, touchpoints, and cleaning that works around the business.',
            icon: Briefcase,
          },
        ],
        schemaDescription:
          'Cleaning services across Mount Eden: regular, deep, end of tenancy, commercial, carpet, window, and post-construction.',
        nearby: [
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
          { name: 'Epsom', href: '/service-area/epsom' },
        ],
      }}
    />
  )
}
