import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Panmure — wave 4 (brief 2026-07-04, Mike-confirmed housing stock).
 * Residential-led: older homes + townhouses + small town-centre workplace
 * thread. End-of-tenancy hero (rental/move-clean emphasis, Direction A).
 * Traps: no "regeneration" / "growing area" / demographic framing (Tāmaki
 * corridor sensitivity); no Basin/Lagoon landmark-as-proof; no "careful"
 * lead; card titles distinct from Ellerslie/Onehunga workplace cards.
 */

export const metadata: Metadata = {
  title: 'Panmure Cleaning Services | Sano',
  description:
    'Cleaning for Panmure homes, townhouses, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and office cleaning.',
}

export default function PanmureServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Panmure',
        heroTitle: 'Professional cleaning for Panmure homes and workplaces.',
        heroSubtitle:
          'Sano cleans Panmure’s older houses, townhouses, and rentals, with office and workplace cleaning available around the town centre.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Sano covers older family houses, townhouses, rentals, and smaller workplaces across Panmure, from regular upkeep and deeper cleans to end-of-tenancy resets when a tenancy turns over.',
          'The scope is set before the first clean, with the extra time older kitchens and bathrooms need built in from the start, and the property left clean and ready.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'An empty rental cleaned for handover',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, workplace presentation, and specialist surfaces, the full range of Sano services is available across Panmure. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Older homes',
            body: 'Established houses where kitchens and bathrooms carry the most wear, cleaned room by room with the detail given time to be done properly.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Multi-level and compact layouts where kitchens, bathrooms, and windows sit on a regular cycle scoped to the building.',
            icon: Building2,
          },
          {
            title: 'Offices and local workplaces',
            body: 'The town centre keeps a working mix of offices and customer-facing businesses, and Sano cleans them on schedules that fit trading hours and staff access.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Plenty of Panmure’s rentals are older houses, so move-out cleans allow for the extra detail they take, with the scope agreed against the handover inspection.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Panmure: regular, deep, end of tenancy, commercial and office, carpet, and window.',
        nearby: [
          { name: 'Mount Wellington', href: '/service-area/mount-wellington' },
          { name: 'Ellerslie', href: '/service-area/ellerslie' },
          { name: 'Pakuranga', href: '/service-area/pakuranga' },
        ],
      }}
    />
  )
}
