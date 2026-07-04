import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Layers } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Mission Bay — migrated onto the shared SuburbLandingTemplate (parity
 * sweep) with copy preserved verbatim. Residential-led with apartment /
 * townhouse density near the waterfront. Traps held: no affluent /
 * luxury / beach-lifestyle framing ("near the bay" / "waterfront" as plain
 * location only); no hospitality claims; no "careful" lead. Nearby links
 * added — pages now exist for the surrounding area.
 */

export const metadata: Metadata = {
  title: 'Mission Bay Cleaning Services | Sano',
  description:
    'Cleaning for Mission Bay apartments, townhouses, family homes, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function MissionBayServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Mission Bay',
        heroTitle: 'Professional cleaning for Mission Bay homes and rentals.',
        heroSubtitle:
          "From regular upkeep to deeper move-in and move-out cleans, Sano keeps Mission Bay's apartments, townhouses, family homes, and rentals looking properly cared for.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'For apartments, townhouses, family homes, and rentals across Mission Bay, Sano covers regular upkeep, deeper one-off cleans, and move-in or move-out work.',
          "We talk through what's needed before booking, plan around lifts, shared access, and timing for apartments, and leave the home clean and ready.",
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-kept residential Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Mission Bay. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Apartments near the bay',
            body: 'Apartments where the day-to-day is shaped by lift access, shared lobbies, and the building’s own rules on timing and parking, so the clean is booked to suit the block.',
            icon: Building2,
          },
          {
            title: 'Townhouses',
            body: 'Multi-level townhouses where each floor adds its own stairs, bathrooms, and glass, so the clean is worked through level by level rather than treated as one space.',
            icon: Layers,
          },
          {
            title: 'Family homes',
            body: 'Standalone family homes set back from the bay, where steady weekly or fortnightly upkeep keeps living areas, kitchens, and bathrooms from getting away on a busy household.',
            icon: Home,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans booked to the handover date and scoped around the checks a landlord or property manager runs before the next tenancy.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Mission Bay: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Parnell', href: '/service-area/parnell' },
          { name: 'Ellerslie', href: '/service-area/ellerslie' },
        ],
      }}
    />
  )
}
