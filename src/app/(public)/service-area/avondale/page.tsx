import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Layers } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Avondale — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: weatherboard/bungalow homes + unit and townhouse infill +
 * meaningful rental turnover. Traps (West sensitivity): no affordability /
 * "up-and-coming" / demographic framing; no racecourse-as-proof; no
 * "careful" lead; no transport-as-lifestyle hooks.
 */

export const metadata: Metadata = {
  title: 'Avondale Cleaning Services | Sano',
  description:
    'Cleaning for Avondale homes, units, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, and specialist surfaces.',
}

export default function AvondaleServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Avondale',
        heroTitle: 'Professional cleaning for Avondale homes, rentals, and units.',
        heroSubtitle:
          'From weatherboard homes to newer townhouses and units, Sano covers regular upkeep, deep cleans, and end-of-tenancy work across Avondale.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans older weatherboard and bungalow homes, newer townhouses, units, and a steady run of rentals across Avondale. Jobs range from regular weekly or fortnightly upkeep to deep cleans and end-of-tenancy resets between tenancies.',
          'We agree the details up front, plan the clean around the property and its timing, and finish with the whole place done properly.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A home interior cleaned by Sano',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Avondale. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Weatherboard and bungalow homes',
            body: 'Older standalone homes where the clean works room by room, through the kitchens, bathrooms, and timber detail where grime builds up between visits.',
            icon: Home,
          },
          {
            title: 'Units and smaller flats',
            body: 'Single-level units and older flats with compact layouts, where a tight, consistent scope keeps the whole place done in one visit.',
            icon: Layers,
          },
          {
            title: 'Townhouses',
            body: 'Newer multi-level townhouses where stairs, compact bathrooms, and glass are worked through level by level.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy cleans often booked on tight timelines between tenancies, scoped to the checklist a property manager signs off.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Avondale: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Mount Albert', href: '/service-area/mount-albert' },
          { name: 'Point Chevalier', href: '/service-area/point-chevalier' },
        ],
      }}
    />
  )
}
