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
          'For family homes, apartments, and rentals in Browns Bay, Sano covers regular upkeep alongside deeper one-off cleans and move-in or move-out work.',
          'Window and glass cleaning is available across Browns Bay for clear, streak-free views inside and out, worked in alongside regular home cleaning and deeper resets.',
        ],
        introImage: '/images/window-cleaning.jpg',
        introImageAlt: 'Clean, streak-free windows in an Auckland home',
        servicesLead:
          'Window and glass cleaning is one of the services Sano offers in Browns Bay, alongside regular upkeep, deep cleans, move cleans, and carpets. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning through the living areas, kitchens, and bathrooms, with interior glass kept clear as part of the visit.',
            icon: Home,
          },
          {
            title: 'Apartments and units',
            body: 'Cleaning suited to apartment layouts and shared access, keeping wet areas, floors, and windows on a steady footing.',
            icon: Building2,
          },
          {
            title: 'Glass and windows',
            body: 'Interior and exterior window cleaning for clear, streak-free glass, booked on its own or added onto a regular or deep clean.',
            icon: Sparkles,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans set to the handover, with glass and wet areas taken to the standard inspections look for.',
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
