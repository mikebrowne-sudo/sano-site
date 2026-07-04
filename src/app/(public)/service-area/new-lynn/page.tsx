import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Layers } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * New Lynn — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Residential-led with a medium-density /
 * apartment-forward angle; commercial stays a light secondary thread so the
 * page stays distinct from the commercial-aware Henderson sibling.
 * Traps held: no "growing area" / "up-and-coming" / affordability /
 * demographic framing.
 */

export const metadata: Metadata = {
  title: 'New Lynn Cleaning Services | Sano',
  description:
    'Cleaning for New Lynn apartments, townhouses, units, and family homes: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function NewLynnServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'New Lynn',
        heroTitle: 'Professional cleaning for New Lynn homes and rentals.',
        heroSubtitle:
          "Sano cleans across New Lynn's apartments, townhouses, units, and family homes, from regular upkeep to deeper resets and move-in and move-out cleans.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Across New Lynn, Sano takes care of apartments, townhouses, units, and family homes, from regular weekly or fortnightly upkeep to deeper cleans and end-of-tenancy work.',
          'We get the details sorted first, work around lifts, stairs, and shared building access where needed, and leave the home clean and settled.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A tidy West Auckland family home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across New Lynn. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Apartments and medium-density',
            body: 'Apartments and units near the centre where lifts, shared entrances, and building schedules set the timing, so the clean is booked to suit the block.',
            icon: Building2,
          },
          {
            title: 'Family homes',
            body: 'Standalone homes on the surrounding streets where regular weekly or fortnightly upkeep keeps living areas, kitchens, and bathrooms on top of a busy week.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Multi-level townhouses and compact units where stairs, tight layouts, and shared driveways mean the clean is planned to suit how the place is built.',
            icon: Layers,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans booked to the handover and scoped around what an owner or property manager checks before the next tenancy.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across New Lynn: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
          { name: 'Titirangi', href: '/service-area/titirangi' },
        ],
      }}
    />
  )
}
