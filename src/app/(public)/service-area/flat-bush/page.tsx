import type { Metadata } from 'next'
import { Home, Building2, Sofa, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Flat Bush Cleaning Services | Sano',
  description:
    'Cleaning for Flat Bush homes, new builds, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function FlatBushServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Flat Bush',
        heroTitle: 'Professional cleaning for Flat Bush homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Flat Bush households keep homes and rentals properly looked after.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, newer builds, townhouses, and rentals across Flat Bush, from regular upkeep to deeper cleans and move-in or move-out work.',
          'We sort the details before the first visit, work around each property’s layout and timing, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'A home cleaned and ready for handover in Auckland',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, carpets, and windows, the full range of Sano services is available across Flat Bush. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes and new builds',
            body: 'Regular and deep cleaning for houses of all sizes, keeping finishes, kitchens, and bathrooms consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning scoped to multi-level layouts and shared access, with kitchens, bathrooms, and glass a regular focus.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning to lift built-up dirt, marks, and odours between deeper household cleans.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Flat Bush: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Botany Downs', href: '/service-area/botany-downs' },
          { name: 'Howick', href: '/service-area/howick' },
          { name: 'Pakuranga', href: '/service-area/pakuranga' },
        ],
      }}
    />
  )
}
