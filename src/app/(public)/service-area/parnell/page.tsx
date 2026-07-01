import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Parnell Cleaning Services | Sano',
  description:
    'Cleaning for Parnell homes, apartments, rentals, and small workplaces: regular upkeep, deep cleans, end of tenancy, and specialist surfaces.',
}

export default function ParnellServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Parnell',
        heroTitle: 'Professional cleaning for Parnell homes and workplaces.',
        heroSubtitle:
          'From homes and apartments to rentals and small workplaces, Sano matches the clean to the property and the reason for it across Parnell.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Sano cleans homes and workplaces across Parnell, including houses, terraces, apartments, rentals, and smaller offices. The work runs from regular upkeep to deeper cleans and move-out or handover jobs.',
          'We confirm what’s needed before we start, fit around access and the hours that suit the household or business, and leave the space clean, presentable, and ready to use.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A freshly cleaned Auckland living space',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Parnell. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Homes and terraces',
            body: 'Regular and deep cleaning worked consistently across multi-level homes and terraces, from everyday rooms to the surfaces that get missed.',
            icon: Home,
          },
          {
            title: 'Apartments',
            body: 'Cleaning scoped to apartment layouts and shared access, keeping kitchens, bathrooms, and glass on a regular footing.',
            icon: Building2,
          },
          {
            title: 'Small offices and workplaces',
            body: 'Consistent workplace cleaning scheduled around trading and business hours so the space stays presentable.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Parnell: regular, deep, end of tenancy, commercial, carpet, window, and post-construction.',
        nearby: [
          { name: 'Newmarket', href: '/service-area/newmarket' },
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
        ],
      }}
    />
  )
}
