import type { Metadata } from 'next'
import { Home, Building2, Sofa, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Sandringham Cleaning Services | Sano',
  description:
    'Cleaning for Sandringham homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning across Auckland.',
}

export default function SandringhamServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Sandringham',
        heroTitle: 'Professional cleaning for Sandringham homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Sandringham households keep homes, townhouses, and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'In Sandringham, Sano looks after homes, townhouses, and rentals, whether that’s a regular clean, a deeper one, or an end-of-tenancy reset before new tenants arrive.',
          'We agree what needs doing before the clean, work around each property’s layout and timing, and leave it clean, settled, and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A well-kept Auckland home interior',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, carpets, and windows, the full range of Sano services is available across Sandringham. Pick a service to read its full scope.',
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
          'Cleaning services across Sandringham: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Mount Albert', href: '/service-area/mount-albert' },
        ],
      }}
    />
  )
}
