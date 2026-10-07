import type { Metadata } from 'next'
import { Briefcase, Store, Building2, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Newmarket Cleaning Services | Sano',
  description:
    'Cleaning for Newmarket offices, retail and commercial spaces, apartments, and rentals: workplace cleaning, regular upkeep, and end-of-tenancy resets.',
}

export default function NewmarketServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Newmarket',
        heroTitle: 'Professional cleaning for Newmarket workplaces and homes.',
        heroSubtitle:
          'From offices and commercial spaces to apartments and rentals, Sano keeps Newmarket workplaces and homes consistently clean and presentable.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Across Newmarket, Sano cleans offices, retail and commercial spaces, apartments, and rentals. Jobs span ongoing upkeep, workplace presentation, deeper one-off cleans, and move-out work.',
          'Cleans are scheduled around trading and business hours so they don’t get in the way, with the job agreed in advance and the workplace or home left presentable and ready to use.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'A clean, presentable Auckland workplace',
        whyChooseSubtitle:
          'What to expect from Sano on any clean, whether it’s a workplace, an apartment, or a rental.',
        servicesLead:
          'Office and commercial cleaning, regular and deep home cleaning, end-of-tenancy resets, carpets, and windows are all available across Newmarket. Pick a service to read its full scope.',
        serviceGroups: [PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Offices and workplaces',
            body: 'Consistent office cleaning scheduled around business hours, keeping desks, kitchens, and shared areas presentable.',
            icon: Briefcase,
          },
          {
            title: 'Retail and commercial spaces',
            body: 'Commercial cleaning worked around trading hours so customer-facing spaces stay clean and tidy.',
            icon: Store,
          },
          {
            title: 'Apartments',
            body: 'Regular and deep cleaning scoped to apartment layouts and shared access, with kitchens, bathrooms, and glass a regular focus.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Newmarket: commercial and office, regular, deep, end of tenancy, carpet, window, and post-construction.',
        nearby: [
          { name: 'Parnell', href: '/service-area/parnell' },
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
        ],
      }}
    />
  )
}
