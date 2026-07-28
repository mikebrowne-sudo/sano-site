import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Takapuna — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with spec-approved copy preserved verbatim. Property + workplace LEADS
 * the services grouping (the original pattern-flex test vs Mount Eden).
 * Traps held: no luxury / beachfront-lifestyle / Airbnb / "salt-air
 * specialist" / CBD-corporate framing. Nearby links added — the North
 * Shore cluster now clears the >=3-sibling retrofit threshold.
 * Spec: docs/superpowers/specs/2026-05-25-takapuna-suburb.md
 */

export const metadata: Metadata = {
  title: 'Takapuna Cleaning Services | Sano',
  description:
    'Cleaning for Takapuna apartments, homes, offices, and rentals: regular upkeep, handovers, workplace presentation, and specialist surfaces.',
}

export default function TakapunaServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Takapuna',
        heroTitle: 'Cleaning for apartments, homes, and workplaces.',
        heroSubtitle:
          'From apartments and family homes to offices and rentals, Sano helps match the cleaning scope to the property and the reason for the clean.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans apartments, family homes, townhouses, offices, and rentals throughout Takapuna, with options that cover everyday upkeep, keeping a workplace presentable, one-off deep cleans, and end-of-lease changeovers.',
          'We confirm the job before we start, fit around building access and trading hours where needed, and leave the home or workplace clean, presentable, and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A residential Auckland home cared for by Sano',
        servicesLead:
          'From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Apartments and townhouses',
            body: 'Compact layouts where kitchens, bathrooms, glass, floors, and access timing matter.',
            icon: Building2,
          },
          {
            title: 'Family homes',
            body: 'Regular upkeep across living areas, kitchens, bathrooms, and finishing details that help maintain a household standard.',
            icon: Home,
          },
          {
            title: 'Rentals and handovers',
            body: 'Clear scopes, practical timing, and attention to the areas owners or property managers are likely to check.',
            icon: KeyRound,
          },
          {
            title: 'Offices and small commercial spaces',
            body: 'Regular presentation, shared amenities, touchpoints, and cleaning that works around the business.',
            icon: Briefcase,
          },
        ],
        schemaDescription:
          'Cleaning services across Takapuna: commercial, regular, end of tenancy, window, deep, carpet, and post-construction.',
        nearby: [
          { name: 'Milford', href: '/service-area/milford' },
          { name: 'Devonport', href: '/service-area/devonport' },
          { name: 'Albany', href: '/service-area/albany' },
        ],
      }}
    />
  )
}
