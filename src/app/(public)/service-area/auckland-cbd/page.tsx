import type { Metadata } from 'next'
import { Briefcase, Building2, Store, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Auckland CBD Cleaning Services | Sano',
  description:
    'Cleaning for Auckland CBD offices, commercial spaces, apartments, and rentals: workplace cleaning, regular upkeep, and end-of-tenancy resets.',
}

export default function AucklandCbdServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Auckland CBD',
        heroTitle: 'Professional cleaning for Auckland CBD workplaces and apartments.',
        heroSubtitle:
          'From offices and commercial spaces to apartments and rentals, Sano keeps CBD workplaces and homes consistently clean and presentable.',
        heroImage: '/images/heroes/commercial-office-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans workplaces and homes across the Auckland CBD, including offices, commercial spaces, apartments, and rentals. The work ranges from regular workplace presentation and ongoing upkeep to deeper cleans and move-out jobs.',
          'We agree the job before we start, schedule around trading and building hours, and leave the workplace or apartment clean, presentable, and ready to use.',
        ],
        introImage: '/images/sano-commercial-clean-auckland.jpeg',
        introImageAlt: 'A clean, presentable Auckland city workplace',
        whyChooseSubtitle:
          'What to expect from Sano on any clean, whether it’s a workplace, an apartment, or a rental.',
        servicesLead:
          'Office and commercial cleaning, regular and deep home cleaning, end-of-tenancy resets, carpets, and windows are all available across the Auckland CBD. Pick a service to read its full scope.',
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
            body: 'Regular and deep cleaning scoped to apartment layouts and shared building access, with kitchens, bathrooms, and glass a regular focus.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across the Auckland CBD: commercial and office, regular, deep, end of tenancy, carpet, window, and post-construction.',
        nearby: [
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
          { name: 'Parnell', href: '/service-area/parnell' },
          { name: 'Newmarket', href: '/service-area/newmarket' },
        ],
      }}
    />
  )
}
