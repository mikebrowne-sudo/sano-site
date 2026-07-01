import type { Metadata } from 'next'
import { Home, Warehouse, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Mount Wellington Cleaning Services | Sano',
  description:
    'Cleaning for Mount Wellington homes, rentals, offices, and commercial spaces: regular upkeep, deep cleans, end of tenancy, and workplace cleaning.',
}

export default function MountWellingtonServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Mount Wellington',
        heroTitle: 'Professional cleaning for Mount Wellington homes and workplaces.',
        heroSubtitle:
          'From family homes and rentals to offices and commercial spaces, Sano matches the clean to the property across Mount Wellington.',
        heroImage: '/images/heroes/post-construction-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans homes and workplaces across Mount Wellington, including family homes, townhouses, rentals, offices, and commercial spaces. The work runs from regular upkeep and workplace presentation to deeper cleans and move-out or handover jobs.',
          'We confirm what’s needed before we start, fit around access and business hours, and leave the home or workplace clean, presentable, and ready to use.',
        ],
        introImage: '/images/post-construction.jpg',
        introImageAlt: 'A commercial space cleaned and ready for use',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Mount Wellington. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Offices and workplaces',
            body: 'Consistent office and commercial cleaning scheduled around business hours to keep workplaces presentable.',
            icon: Briefcase,
          },
          {
            title: 'Commercial and post-build spaces',
            body: 'Commercial cleaning and post-construction clean-ups that clear dust and residue so a space is ready to use.',
            icon: Warehouse,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Mount Wellington: regular, deep, end of tenancy, commercial and office, post-construction, carpet, and window.',
        nearby: [
          { name: 'Ellerslie', href: '/service-area/ellerslie' },
          { name: 'Onehunga', href: '/service-area/onehunga' },
          { name: 'Remuera', href: '/service-area/remuera' },
        ],
      }}
    />
  )
}
