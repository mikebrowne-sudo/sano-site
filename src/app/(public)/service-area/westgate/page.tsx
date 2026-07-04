import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Store } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Westgate — wave 4 (brief 2026-07-04, Mike-confirmed). Commercial-aware:
 * large-format retail/commercial alongside new residential subdivisions.
 * Property + workplace LEADS (lighter commercial lean than Manukau, heavier
 * residential weight than Henderson). Traps: no growth-node / "new
 * development" hype language despite the area's build-out; no mall-as-proof;
 * no retail-specialism overclaims; no post-construction card (Manukau owns
 * that specialism).
 */

export const metadata: Metadata = {
  title: 'Westgate Cleaning Services | Sano',
  description:
    'Cleaning for Westgate homes, townhouses, and workplaces: regular upkeep, deep cleans, end of tenancy, and commercial cleaning across the area.',
}

export default function WestgateServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Westgate',
        heroTitle: 'Professional cleaning for Westgate homes, townhouses, and workplaces.',
        heroSubtitle:
          'From regular upkeep and end-of-tenancy resets to keeping commercial spaces presentable, Sano covers homes and workplaces across Westgate.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans across Westgate, covering new-build homes, townhouses, and rental properties as well as retail and commercial premises in the area. The work runs from regular upkeep and deep cleans to move-outs and handovers.',
          'We confirm the scope and timing before arriving, work around access and trading hours on commercial jobs, and leave each home or workplace properly done.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'Sano cleaning Auckland homes and commercial spaces',
        servicesLead:
          'Whether it’s a workplace that needs to stay presentable or a new-build home settling into a routine, the full range of Sano services is available across Westgate. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'New builds and townhouses',
            body: 'New-build homes and townhouses with modern finishes that stay sharp on a consistent cleaning cycle across kitchens, bathrooms, and glass.',
            icon: Building2,
          },
          {
            title: 'Family homes',
            body: 'Standalone houses in the residential streets, with regular upkeep and deeper cleans keeping a household standard through the year.',
            icon: Home,
          },
          {
            title: 'Retail and commercial premises',
            body: 'Retail units and commercial spaces cleaned to a presentation standard, scheduled around trading hours and staff access.',
            icon: Store,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and handover cleans for the area’s rental stock, scoped to what property managers and owners need to sign off.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Westgate: regular, deep, end of tenancy, commercial, carpet, and window.',
        nearby: [
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'Hobsonville', href: '/service-area/hobsonville' },
          { name: 'Massey', href: '/service-area/massey' },
        ],
      }}
    />
  )
}
