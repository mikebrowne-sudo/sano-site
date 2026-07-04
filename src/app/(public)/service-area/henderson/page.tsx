import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Henderson — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Commercial-aware (major West Auckland
 * centre): hero names workplaces, Property + workplace LEADS the grouping,
 * one card covers offices / commercial. Residential stays the majority.
 * Traps held: no affordability / demographic / "growing area" /
 * "family-focused community" framing; no industrial-specialism claims.
 */

export const metadata: Metadata = {
  title: 'Henderson Cleaning Services | Sano',
  description:
    'Cleaning for Henderson homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, office and commercial cleaning, and specialist surfaces.',
}

export default function HendersonServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Henderson',
        heroTitle: 'Professional cleaning for Henderson homes, rentals, and businesses.',
        heroSubtitle:
          'Sano cleans homes, rentals, and business premises across Henderson, from regular upkeep and end-of-tenancy resets to keeping offices and commercial spaces looking right.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Sano works across Henderson on both homes and workplaces, from offices, retail and customer-facing spaces to family homes, townhouses, units, and rentals. The work covers everything from regular upkeep and presentation to deep cleans and move-outs.',
          'We lock in the details first, allow for opening hours and building access where needed, and leave each home or workplace presentable and ready to use.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'Sano commercial and home cleaning across West Auckland',
        servicesLead:
          'Whether it is a workplace that needs to stay presentable or a home that needs regular upkeep, the full range of Sano services is available across Henderson. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Standalone family homes where regular upkeep across living areas, kitchens, and bathrooms keeps a busy household running without the cleaning piling up.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Townhouses and units where stairs, compact layouts, and shared access shape the clean, so it is planned to suit how the property is built and used.',
            icon: Building2,
          },
          {
            title: 'Offices and commercial spaces',
            body: 'Offices, retail units, and customer-facing spaces across Henderson’s retail and commercial core, cleaned to a presentation standard and scheduled around trading hours.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Handover and end-of-tenancy cleans across the area’s units, townhouses, and rentals, booked to the turnover and scoped around what a property manager signs off.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Henderson: regular, deep, end of tenancy, commercial and office, post-construction, carpet, and window.',
        nearby: [
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
          { name: 'Titirangi', href: '/service-area/titirangi' },
        ],
      }}
    />
  )
}
