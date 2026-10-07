import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Mount Albert Cleaning Services | Sano',
  description:
    'Cleaning for Mount Albert homes, townhouses, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and specialist surfaces.',
}

export default function MountAlbertServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Mount Albert',
        heroTitle: 'Professional cleaning for Mount Albert homes and workplaces.',
        heroSubtitle:
          'From homes and townhouses to rentals and workplaces, Sano matches the clean to the property across Mount Albert.',
        heroImage: '/images/heroes/carpet-upholstery-cleaning-hero.jpg',
        introParagraphs: [
          'Across Mount Albert, Sano cleans family homes, units, rentals, and smaller workplaces. Some are booked as ongoing upkeep, others as a one-off deep clean or a full end-of-tenancy reset ahead of a new tenancy.',
          'The scope is agreed up front, the clean is worked around each property’s layout and preferred timing, and the home is left settled and ready.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A clean, well-kept Auckland home',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Mount Albert. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning scoped to multi-level layouts and shared access, with kitchens, bathrooms, and glass a regular focus.',
            icon: Building2,
          },
          {
            title: 'Small offices and workplaces',
            body: 'Consistent workplace cleaning scheduled around business hours so the space stays presentable.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Mount Albert: regular, deep, end of tenancy, commercial, carpet, window, and post-construction.',
        nearby: [
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
        ],
      }}
    />
  )
}
