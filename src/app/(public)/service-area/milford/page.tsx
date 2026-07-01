import type { Metadata } from 'next'
import { Home, Building2, Sparkles, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Milford Cleaning Services | Sano',
  description:
    'Cleaning for Milford homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, window, and carpet cleaning on the North Shore.',
}

export default function MilfordServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Milford',
        heroTitle: 'Professional cleaning for Milford homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and move-out resets, Sano keeps Milford homes, apartments, and rentals well looked after.',
        heroImage: '/images/heroes/window-cleaning-hero.jpg',
        introParagraphs: [
          'Across Milford, Sano cleans family homes, apartments, and rentals, whether that’s ongoing upkeep, a deeper clean, or an end-of-tenancy reset before a new tenancy.',
          'We sort the details before the first visit, work around each property’s layout and timing, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/window-cleaning.jpg',
        introImageAlt: 'Clean, streak-free windows in an Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, windows, and carpets, the full range of Sano services is available across Milford. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Apartments and units',
            body: 'Cleaning scoped to apartment layouts and shared access, keeping kitchens, bathrooms, and glass on a regular footing.',
            icon: Building2,
          },
          {
            title: 'Glass and windows',
            body: 'Interior and exterior window cleaning for streak-free glass, worked in alongside a regular or deeper clean where it helps.',
            icon: Sparkles,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Milford: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Albany', href: '/service-area/albany' },
          { name: 'Devonport', href: '/service-area/devonport' },
        ],
      }}
    />
  )
}
