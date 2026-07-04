import type { Metadata } from 'next'
import { Building2, Hammer, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Takanini — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led with the new-build first-clean hook (Direction B): heavy
 * new townhouse / subdivision stock alongside established homes. Cards
 * deliberately distinct from Papakura and Flat Bush (sharpest duplication
 * risk in the set). Traps (South sensitivity): no "fastest-growing" /
 * affordability / demographic framing; no rail/motorway-as-proof; no
 * "careful" lead; no verbatim copy from Papakura or Flat Bush.
 */

export const metadata: Metadata = {
  title: 'Takanini Cleaning Services | Sano',
  description:
    'Cleaning for Takanini homes, townhouses, and new builds: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function TakaniniServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Takanini',
        heroTitle: 'Professional cleaning for Takanini homes and townhouses.',
        heroSubtitle:
          'Sano cleans homes, townhouses, and new builds across Takanini, from first cleans after a build through to regular upkeep, deep cleans, and move-in or move-out resets.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'A lot of cleaning in Takanini starts with a just-finished build: construction dust, grout haze, and surface film that a standard clean doesn’t cover. Sano handles that first clean as its own scope, working through glass, hard surfaces, and finishes before a home is lived in.',
          'Once the home is in use, regular weekly or fortnightly cleaning, deep cleans, windows, and move-out work are all available across the area, scoped and confirmed before each first visit.',
        ],
        introImage: '/images/post-construction.jpg',
        introImageAlt: 'A new build cleaned and ready to move into',
        servicesLead:
          'From new-build first cleans and regular upkeep to deeper resets and move cleans, the full range of Sano services is available across Takanini. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'New-build and post-construction first cleans',
            body: 'Fine dust in grouting, adhesive residue, and window film all need a specific pass before a new home is ready, so the first clean runs to its own checklist.',
            icon: Hammer,
          },
          {
            title: 'Townhouses and multi-level properties',
            body: 'Kitchens and bathrooms stacked across floors, stairs, and glass balustrades, cleaned level by level so nothing on any floor gets missed.',
            icon: Building2,
          },
          {
            title: 'Established homes and regular upkeep',
            body: 'Older family houses on a steady weekly or fortnightly cycle, with the same team keeping the same standard visit after visit.',
            icon: Home,
          },
          {
            title: 'Move-in, move-out, and rental resets',
            body: 'Cleans scoped around the condition expected at handover, covering the areas property managers and owners check most closely.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Takanini: regular, deep, end of tenancy, post-construction, carpet, and window.',
        nearby: [
          { name: 'Papakura', href: '/service-area/papakura' },
          { name: 'Manukau', href: '/service-area/manukau' },
          { name: 'Papatoetoe', href: '/service-area/papatoetoe' },
        ],
      }}
    />
  )
}
