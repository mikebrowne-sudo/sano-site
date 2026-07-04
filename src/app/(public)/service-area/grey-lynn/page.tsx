import type { Metadata } from 'next'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Grey Lynn — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with Mike-supplied copy preserved verbatim. Residential-led.
 * Traps held: "character homes" approved; NOT approved: "heritage homes",
 * "villas", or prestige / trendy / gentrified / demographic framing.
 */

export const metadata: Metadata = {
  title: 'Grey Lynn Cleaning Services | Sano',
  description:
    'Cleaning for Grey Lynn character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function GreyLynnServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Grey Lynn',
        heroTitle: 'Professional cleaning for Grey Lynn homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper move-in and move-out cleans, Sano helps Grey Lynn households keep homes, townhouses, apartments, and rentals looking properly cared for.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano provides regular, deep, and move-related cleaning across Grey Lynn, including character homes, renovated homes, apartments, townhouses, and rentals. That runs from ongoing upkeep to a deeper clean before a move, handover, or new tenancy.',
          "We keep the process clear from the start, work around the property's layout and access where needed, and leave the home clean, presentable, and properly looked after.",
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-kept residential Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Grey Lynn. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Character homes',
            body: 'Older homes that reward an unhurried, considered clean, so the detail is respected and the place is left feeling settled and properly looked after.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Newer finishes and open-plan spaces where the aim is a clean, finished result that lets the renovation feel complete and ready to enjoy.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartments and townhouses come with their own access and timing, from lifts and stairs to building schedules, so the clean is planned to fit the building as much as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans planned around the handover, timed to fit between tenancies and focused on what an owner or property manager will be looking for.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Grey Lynn: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
        ],
      }}
    />
  )
}
