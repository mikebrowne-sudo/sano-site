import type { Metadata } from 'next'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Te Atatū Peninsula — migrated onto the shared SuburbLandingTemplate
 * (parity sweep) with copy preserved verbatim. Residential. Display name
 * carries the macron; `areaName` maps to the registry spelling so the geo
 * schema + coverage FAQ still resolve. Traps held: no "growing area" /
 * affordability / demographic framing; "harbour" / "waterside" as plain
 * location only.
 */

export const metadata: Metadata = {
  title: 'Te Atatū Peninsula Cleaning Services | Sano',
  description:
    'Cleaning for Te Atatū Peninsula family homes, townhouses, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function TeAtatuPeninsulaServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Te Atatū Peninsula',
        areaName: 'Te Atatu Peninsula',
        heroTitle: 'Professional cleaning for Te Atatū Peninsula homes and rentals.',
        heroSubtitle:
          "Sano cleans across the Peninsula's family homes, newer townhouses, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          "In Te Atatū Peninsula, Sano cleans family homes, townhouses, new builds, and rentals, whether that's keeping on top of a busy household, a deeper one-off clean, or a move or handover.",
          "We plan the work around each home's size and layout, keep the steps clear from the quote on, and leave it clean, settled, and properly looked after.",
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A standalone family home in West Auckland',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Te Atatū Peninsula. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Established family homes',
            body: 'Long-standing peninsula homes where regular upkeep across living areas, kitchens, bathrooms, and floors keeps a busy household running through the week.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Original peninsula homes that have been extended or opened up, where the new and older parts get the same finish so the whole house feels even.',
            icon: BadgeCheck,
          },
          {
            title: 'Townhouses and new builds',
            body: 'Newer townhouses and subdivision homes where finishing surfaces, glass, and multiple levels are the focus, often as a first clean before moving in.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover date and scoped around the areas an owner or property manager checks before a new tenancy.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Te Atatū Peninsula: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Titirangi', href: '/service-area/titirangi' },
        ],
      }}
    />
  )
}
