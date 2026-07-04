import type { Metadata } from 'next'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Onehunga — migrated onto the shared SuburbLandingTemplate (parity sweep)
 * with copy preserved verbatim. Commercial-aware lean (genuine working town
 * centre): Property + workplace LEADS the grouping; residential stays the
 * majority (three of four cards). Traps held: no "careful" lead; no
 * affordability / demographic / "growing area" framing; no port /
 * industrial-specialism claims; no villa-heritage-value framing. Nearby
 * links added — pages now exist for the surrounding area.
 */

export const metadata: Metadata = {
  title: 'Onehunga Cleaning Services | Sano',
  description:
    'Cleaning for Onehunga homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, office and town-centre cleaning, and specialist surfaces.',
}

export default function OnehungaServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Onehunga',
        heroTitle: 'Professional cleaning for Onehunga homes, rentals, and workplaces.',
        heroSubtitle:
          'From regular upkeep and office presentation to deeper resets and end-of-tenancy cleans, Sano matches the scope to the property and the reason for the clean.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Sano provides regular, deep, commercial, and move-related cleaning across Onehunga, covering offices, retail and workplaces alongside character homes, townhouses, apartments, and rentals. The work runs from ongoing upkeep to deeper cleans, handovers, and workplace presentation.',
          'We talk it through before the first clean, plan around access and trading hours where it matters, and leave each home or workplace clean, presentable, and properly looked after.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'Sano cleaning across Auckland homes and workplaces',
        servicesLead:
          'From office and workplace presentation to regular home cleaning, deeper resets, and specialist surfaces, the full range of Sano services is available across Onehunga. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Character and villa homes',
            body: 'Older villas and character homes where original joinery, timber floors, and detailed surfaces take an unhurried clean that works through each room rather than rushing it.',
            icon: Home,
          },
          {
            title: 'Townhouses and apartments',
            body: 'Town-centre townhouses and apartments often come with shared entrances, limited parking, and set building hours, so the clean is booked and planned to work in with the building.',
            icon: Building2,
          },
          {
            title: 'Offices and town-centre workplaces',
            body: 'Offices, retail, and customer-facing spaces around the town centre, cleaned for presentation and worked in around trading hours and the business day.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and handover cleans timed to the vacancy window, with the scope agreed against what an owner or property manager checks, so nothing gets flagged at inspection.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Onehunga: regular, deep, end of tenancy, commercial and office, post-construction, carpet, and window.',
        nearby: [
          { name: 'Royal Oak', href: '/service-area/royal-oak' },
          { name: 'Ellerslie', href: '/service-area/ellerslie' },
          { name: 'Mount Wellington', href: '/service-area/mount-wellington' },
        ],
      }}
    />
  )
}
