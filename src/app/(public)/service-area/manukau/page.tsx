import type { Metadata } from 'next'
import { Briefcase, Hammer, Home, Store } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Manukau — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with spec-approved copy preserved verbatim. Commercial-foregrounded:
 * Property + workplace LEADS the grouping; commercial-led hero + intro
 * images. Traps held: no demographic / socioeconomic / property-value
 * framing; no "South Auckland specialist" / "second CBD" / airport /
 * retail-specialism claims; no landmarks-as-proof. Nearby links added —
 * pages now exist for the surrounding area.
 * Spec: docs/superpowers/specs/2026-05-26-manukau-suburb.md
 */

export const metadata: Metadata = {
  title: 'Manukau Cleaning Services | Sano',
  description:
    'Cleaning for Manukau offices, homes, rentals, and commercial spaces. Sano matches the scope to workplaces, handovers, and regular upkeep.',
}

export default function ManukauServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Manukau',
        heroTitle: 'Cleaning for offices, homes, and workplaces.',
        heroSubtitle:
          'From offices and family homes to retail spaces, rentals, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Sano provides cleaning across Manukau for offices, retail and commercial spaces, as well as family homes and rentals. The work runs from workplace presentation and regular upkeep to deep cleans, move-outs, and handovers.',
          'We map out the job before we arrive, work around staff, customers, and business hours where needed, and leave the property clean and ready for staff and customers.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'Sano commercial cleaning across Auckland workplaces',
        servicesLead:
          'From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Offices and workplaces',
            body: 'Regular presentation, shared amenities, touchpoints, and cleaning that works around the business.',
            icon: Briefcase,
          },
          {
            title: 'Retail and customer-facing spaces',
            body: 'Front-of-house finish, frequent touchpoints, and timing that fits around customers and trading hours.',
            icon: Store,
          },
          {
            title: 'Family homes and rentals',
            body: 'Regular upkeep, inspection-ready handovers, and finishing details that help maintain a household standard.',
            icon: Home,
          },
          {
            title: 'Post-construction and fit-outs',
            body: 'Builders dust, fine surfaces, glass, and the final detail pass before a space opens or hands back.',
            icon: Hammer,
          },
        ],
        schemaDescription:
          'Cleaning services across Manukau: commercial, post-construction, end of tenancy, window, regular, deep, and carpet.',
        nearby: [
          { name: 'Flat Bush', href: '/service-area/flat-bush' },
          { name: 'Botany Downs', href: '/service-area/botany-downs' },
          { name: 'Papakura', href: '/service-area/papakura' },
        ],
      }}
    />
  )
}
