import type { Metadata } from 'next'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Kingsland — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Residential-led. Traps held: no "careful"
 * lead; no upscale / trendy / prestige framing; no hospitality /
 * café-specialism claims (the Kingsland strip stays out of the copy).
 */

export const metadata: Metadata = {
  title: 'Kingsland Cleaning Services | Sano',
  description:
    'Cleaning for Kingsland character homes, townhouses, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function KingslandServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Kingsland',
        heroTitle: 'Professional cleaning for Kingsland homes and rentals.',
        heroSubtitle:
          "From regular upkeep to deeper move-in and move-out cleans, Sano keeps Kingsland's compact mix of homes, townhouses, apartments, and rentals looking properly cared for.",
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans character homes, renovated homes, townhouses, apartments, and rentals throughout Kingsland, from regular upkeep through to deeper cleans and move-out work.',
          'We confirm what needs doing upfront, allow for stairs, access, and timing where they matter, and leave the home tidy and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A tidy, well-kept Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Kingsland. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Character homes',
            body: 'Older homes with detailed finishes and timber floors, where an unhurried, considered clean brings out the detail and leaves the place feeling properly cared for.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Renovated and extended homes where an even, thorough finish across the new and existing spaces helps the whole place feel complete and ready to live in.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Townhouses and apartments bring their own access and timing, from shared entrances and stairs to building schedules, so the clean is planned to fit the building as much as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans built around the handover, timed to fit between tenancies, and focused on what an owner or property manager will check at inspection.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Kingsland: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
        ],
      }}
    />
  )
}
