import type { Metadata } from 'next'
import { Home, Building2, Sparkles, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Browns Bay Cleaning Services | Sano',
  description:
    'Cleaning for Browns Bay homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, window, and carpet cleaning on the North Shore.',
}

export default function BrownsBayServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Browns Bay',
        heroTitle: 'Professional cleaning for Browns Bay homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano keeps Browns Bay homes, apartments, and rentals well looked after.',
        heroImage: '/images/heroes/window-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, apartments, and rentals across Browns Bay, from regular upkeep to deeper cleans and move-in or move-out work.',
          'We sort the details before the first visit, work around each property’s layout and timing, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/window-cleaning.jpg',
        introImageAlt: 'Clean, streak-free windows in an Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, windows, and carpets, the full range of Sano services is available across Browns Bay. Pick a service to read its full scope.',
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
          'Cleaning services across Browns Bay: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Milford', href: '/service-area/milford' },
          { name: 'Albany', href: '/service-area/albany' },
          { name: 'Takapuna', href: '/service-area/takapuna' },
        ],
      }}
    />
  )
}
