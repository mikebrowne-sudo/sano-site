import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Botany Downs Cleaning Services | Sano',
  description:
    'Cleaning for Botany Downs homes, townhouses, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and office and commercial cleaning.',
}

export default function BotanyDownsServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Botany Downs',
        heroTitle: 'Professional cleaning for Botany Downs homes and workplaces.',
        heroSubtitle:
          'From family homes and townhouses to rentals and workplaces, Sano matches the clean to the property across Botany Downs.',
        heroImage: '/images/heroes/carpet-upholstery-cleaning-hero.jpg',
        introParagraphs: [
          'Across Botany Downs, Sano handles cleaning for family homes, townhouses, rentals, and offices alike. That covers regular home upkeep, workplace presentation, deeper cleans, and move-out or handover work.',
          'Every job is scoped up front, worked around access and hours that suit the household or workplace, and finished with the space clean, presentable, and ready to use.',
        ],
        introImage: '/images/carpet-upholstery.jpg',
        introImageAlt: 'Freshly cleaned carpet and living space in an Auckland home',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Botany Downs. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning scoped to multi-level layouts and shared access, keeping kitchens, bathrooms, and glass on a regular footing.',
            icon: Building2,
          },
          {
            title: 'Offices and workplaces',
            body: 'Consistent office and commercial cleaning scheduled around business hours to keep workplaces presentable.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Botany Downs: regular, deep, end of tenancy, commercial and office, carpet, window, and post-construction.',
        nearby: [
          { name: 'Howick', href: '/service-area/howick' },
          { name: 'Pakuranga', href: '/service-area/pakuranga' },
          { name: 'Flat Bush', href: '/service-area/flat-bush' },
        ],
      }}
    />
  )
}
