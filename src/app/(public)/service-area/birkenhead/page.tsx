import type { Metadata } from 'next'
import { Home, Building2, Sparkles, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Birkenhead Cleaning Services | Sano',
  description:
    'Cleaning for Birkenhead homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, window, and carpet cleaning on the North Shore.',
}

export default function BirkenheadServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Birkenhead',
        heroTitle: 'Professional cleaning for Birkenhead homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and move-out resets, Sano keeps Birkenhead homes, townhouses, and rentals well looked after.',
        heroImage: '/images/heroes/deep-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, townhouses, and rentals throughout Birkenhead, covering ongoing upkeep, deeper one-off cleans, and end-of-tenancy resets when a rental changes over.',
          'We sort the details before the first visit, work around each property’s layout and timing, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/deep-cleaning.jpg',
        introImageAlt: 'A thoroughly cleaned home interior in Auckland',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, windows, and carpets, the full range of Sano services is available across Birkenhead. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning scoped to multi-level layouts and shared access, with kitchens, bathrooms, and glass a regular focus.',
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
          'Cleaning services across Birkenhead: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Devonport', href: '/service-area/devonport' },
          { name: 'Milford', href: '/service-area/milford' },
        ],
      }}
    />
  )
}
