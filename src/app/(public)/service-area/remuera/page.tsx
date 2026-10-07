import type { Metadata } from 'next'
import { Home, Building2, KeyRound, Sofa } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Remuera Cleaning Services | Sano',
  description:
    'Cleaning for Remuera homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning across Auckland.',
}

export default function RemueraServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Remuera',
        heroTitle: 'Professional cleaning for Remuera homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Remuera households keep homes, apartments, and rentals properly looked after.',
        heroImage: '/images/heroes/deep-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans standalone homes, larger family houses, apartments, and rentals across Remuera, from regular upkeep to deeper one-off cleans and end-of-tenancy resets before new tenants move in.',
          'Before the first visit the scope is set with you, then the clean is fitted around each home’s layout and the household’s timing, and the property is left clean, settled, and ready.',
        ],
        introImage: '/images/herne-bay-residential.jpg',
        introImageAlt: 'A tidy, well-kept Auckland home interior',
        servicesLead:
          'From regular home cleaning and deeper resets to end-of-tenancy cleans, carpets, and windows, the full range of Sano services is available across Remuera. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family and standalone homes',
            body: 'Regular and deep cleaning for houses of all sizes, worked room by room so kitchens, bathrooms, and living spaces stay consistently done.',
            icon: Home,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Cleaning scoped to smaller and multi-level footprints, with kitchens, bathrooms, and glass a regular focus.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning to lift built-up dirt, marks, and odours between deeper household cleans.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check before a new tenancy.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Remuera: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Newmarket', href: '/service-area/newmarket' },
          { name: 'Parnell', href: '/service-area/parnell' },
          { name: 'Mission Bay', href: '/service-area/mission-bay' },
        ],
      }}
    />
  )
}
