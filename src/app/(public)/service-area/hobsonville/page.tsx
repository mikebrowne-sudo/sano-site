import type { Metadata } from 'next'
import { Home, Building2, Sofa, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Hobsonville Cleaning Services | Sano',
  description:
    'Cleaning for Hobsonville homes, new builds, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function HobsonvilleServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Hobsonville',
        heroTitle: 'Professional cleaning for Hobsonville homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Hobsonville households keep homes and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, newer builds, townhouses, and rentals across Hobsonville, from regular upkeep to deeper cleans and move-in or move-out work.',
          'We sort the details before the first visit, work around each property’s layout and timing, and leave the home clean, presentable, and ready.',
        ],
        introImage: '/images/sano-auckland-team.jpeg',
        introImageAlt: 'A Sano cleaner at work in an Auckland home',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, carpets, and windows, the full range of Sano services is available across Hobsonville. Pick a service to read its full scope.',
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
          'Cleaning services across Hobsonville: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Henderson', href: '/service-area/henderson' },
        ],
      }}
    />
  )
}
