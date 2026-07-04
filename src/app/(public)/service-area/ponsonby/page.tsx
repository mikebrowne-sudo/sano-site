import type { Metadata } from 'next'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Ponsonby — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with Mike-supplied copy preserved verbatim. Residential-led; commercial
 * stays a light secondary thread (services lead names workplace cleaning,
 * grouping keeps it second). Hard traps: no "careful" lead (card 1 uses
 * "considered"); no upscale / luxury / prestige / property-value language;
 * no hospitality claims; no heritage-value claims; no implied client lists.
 */

export const metadata: Metadata = {
  title: 'Ponsonby Cleaning Services | Sano',
  description:
    'Cleaning for Ponsonby character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function PonsonbyServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Ponsonby',
        heroTitle: 'Professional cleaning for Ponsonby homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper move-in and move-out cleans, Sano helps Ponsonby households keep homes, townhouses, apartments, and rentals looking properly cared for.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          "In Ponsonby, Sano looks after character homes, renovated homes, terraces, townhouses, apartments, and rentals, whether that's a regular clean, a deeper one, or an end-of-tenancy reset before new tenants arrive.",
          "We agree what needs doing before the clean, fit the work around each property's layout and timing, and leave it clean, settled, and ready.",
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-presented residential Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, workplace cleaning, and specialist surfaces, the full range of Sano services is available across Ponsonby. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Character homes',
            body: 'A considered clean for established homes where presentation, layout, and a properly finished result matter.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Cleaning suited to updated homes, open-plan areas, and spaces that need to feel settled, tidy, and ready to use.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartment and townhouse cleans are planned around the building as much as the home, working in with lift access, stair access, and the times the building allows.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Turnover and move cleans built around the handover date, slotted in between tenancies, and aimed at what an owner or property manager checks on inspection.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Ponsonby: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
        ],
      }}
    />
  )
}
