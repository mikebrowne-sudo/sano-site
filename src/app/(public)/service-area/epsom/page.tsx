import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Layers } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Epsom — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with Mike-confirmed copy preserved verbatim. Residential-led.
 * Traps held: no school-zone / catchment framing; no property-value /
 * prestige angle; no villa / heritage characterisation; no demographics.
 * Rollout plan: docs/superpowers/specs/2026-05-25-suburb-rollout-plan.md (A1).
 */

export const metadata: Metadata = {
  title: 'Epsom Cleaning Services | Sano',
  description:
    'Regular, deep, and end-of-tenancy cleaning for Epsom homes, apartments, and rentals. Sano matches the scope to the property and the clean.',
}

export default function EpsomServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Epsom',
        heroTitle: 'Careful home cleaning for established Epsom properties.',
        heroSubtitle:
          'From regular upkeep to deeper move-in and move-out cleans, Sano helps Epsom households keep homes, townhouses, apartments, and rentals looking properly cared for.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'From regular upkeep to deep cleans and end-of-tenancy work, Sano cleans established homes, townhouses, apartments, and rentals across Epsom. Some are regular bookings, while others are one-off cleans before a move, handover, sale, or new tenancy.',
          'From the first quote we keep it simple, work around access and timing where a property needs it, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A residential Auckland home cared for by Sano',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Epsom. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Established homes',
            body: 'Regular upkeep, detailed dusting, skirting boards, bathrooms, kitchens, and the surfaces that show everyday use.',
            icon: Home,
          },
          {
            title: 'Townhouses',
            body: 'Multi-level cleaning where stairs, bathrooms, floors, and access timing need to be planned properly.',
            icon: Layers,
          },
          {
            title: 'Apartments',
            body: 'Compact layouts, lift access, kitchens, bathrooms, glass, and shared-building timing where required.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleaning with a clear scope, practical timing, and attention to the areas owners or property managers usually check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Epsom: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
        ],
      }}
    />
  )
}
