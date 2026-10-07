import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Ellerslie Cleaning Services | Sano',
  description:
    'Cleaning for Ellerslie homes, townhouses, rentals, and small workplaces: regular upkeep, deep cleans, end of tenancy, and specialist surfaces.',
}

export default function EllerslieServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Ellerslie',
        heroTitle: 'Professional cleaning for Ellerslie homes and workplaces.',
        heroSubtitle:
          'From homes and townhouses to rentals and small workplaces, Sano matches the clean to the property across Ellerslie.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Sano cleans homes, townhouses, rentals, and smaller workplaces across Ellerslie. Bookings range from regular upkeep to a deeper one-off clean or an end-of-tenancy reset between tenants.',
          'What needs doing is agreed ahead of time, the clean fits around the layout and hours of each place, and the result is left clean, settled, and ready.',
        ],
        introImage: '/images/sano-auckland-team.jpeg',
        introImageAlt: 'A Sano cleaner at work in an Auckland property',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Ellerslie. Pick a service to read its full scope.',
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
          'Cleaning services across Ellerslie: regular, deep, end of tenancy, commercial, carpet, window, and post-construction.',
        nearby: [
          { name: 'Onehunga', href: '/service-area/onehunga' },
          { name: 'Remuera', href: '/service-area/remuera' },
          { name: 'Newmarket', href: '/service-area/newmarket' },
        ],
      }}
    />
  )
}
