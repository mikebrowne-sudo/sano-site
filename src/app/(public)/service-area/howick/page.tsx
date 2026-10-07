import type { Metadata } from 'next'
import { Home, Building2, Sofa, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Howick Cleaning Services | Sano',
  description:
    'Cleaning for Howick homes, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning in East Auckland.',
}

export default function HowickServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Howick',
        heroTitle: 'Professional cleaning for Howick homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Howick households keep homes, townhouses, and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'For family homes, townhouses, and rentals across Howick, Sano covers everything from regular upkeep to deeper one-off cleans and end-of-tenancy resets between tenancies.',
          'Each visit is planned around the household’s routine and the layout of the home, with the scope settled beforehand so the result is a place left clean and ready to enjoy.',
        ],
        introImage: '/images/cleaned-by-sano.jpg',
        introImageAlt: 'A clean, well-kept family home in Auckland',
        servicesLead:
          'From regular home cleaning and deeper resets to move cleans, carpets, and windows, the full range of Sano services is available across Howick. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning for houses of all sizes, worked room by room so the whole home stays consistently done.',
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
          'Cleaning services across Howick: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Pakuranga', href: '/service-area/pakuranga' },
          { name: 'Mission Bay', href: '/service-area/mission-bay' },
          { name: 'Remuera', href: '/service-area/remuera' },
        ],
      }}
    />
  )
}
