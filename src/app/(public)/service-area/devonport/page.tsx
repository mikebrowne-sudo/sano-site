import type { Metadata } from 'next'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Devonport — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Residential-led; commercial stays a light
 * secondary thread. Traps held: no "heritage" / "historic" / "charm" /
 * period-VALUE framing (villas, weatherboard, sash windows named only as
 * property features); no naval references; no affluent / beach-lifestyle
 * framing. Nearby links added — the North Shore cluster now clears the
 * >=3-sibling retrofit threshold.
 */

export const metadata: Metadata = {
  title: 'Devonport Cleaning Services | Sano',
  description:
    'Cleaning for Devonport villas, character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function DevonportServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Devonport',
        heroTitle: 'Professional cleaning for Devonport homes and rentals.',
        heroSubtitle:
          "Sano cleans across Devonport's older villas, character homes, townhouses, apartments, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Across Devonport, Sano cleans character homes, family homes, townhouses, apartments, and rentals, from regular upkeep to a deeper clean, or a full move-out at the end of a tenancy.',
          'We set out a clear plan from the start, work around the layout and access of each property, and leave the place clean, settled, and properly looked after.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'An older weatherboard home in Devonport',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Devonport. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Villas and character homes',
            body: 'Older villas and weatherboard homes where the original joinery, sash windows, and timber floors take a thorough clean that works through each room properly.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Updated homes and open-plan additions where the aim is an even, finished result that leaves the renovation properly clean and ready to live in.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartments and townhouses where lifts, stairs, and shared-building timing shape the job, so the clean is planned to suit the building as well as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans planned around the handover, timed between tenancies, and focused on the areas an owner or property manager checks.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Devonport: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Milford', href: '/service-area/milford' },
          { name: 'Birkenhead', href: '/service-area/birkenhead' },
        ],
      }}
    />
  )
}
