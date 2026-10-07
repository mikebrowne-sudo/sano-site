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
          'From family homes and newer builds to townhouses and rentals, Sano covers cleaning right across Flat Bush, whether that’s regular upkeep, a deeper one-off clean, or move-in and move-out work.',
          'For larger or newer Flat Bush homes, a deep clean is a good way to reset the detail across skirtings, glass, wet areas, and edges, with regular visits after to keep it there.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'A home cleaned and ready for handover in Auckland',
        servicesLead:
          'Deep cleans and detailed resets are available across Flat Bush, along with regular upkeep, move cleans, carpets, and windows. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes and new builds',
            body: 'A full deep clean that gets larger homes back to detail across edges, skirtings, and wet areas, then regular visits to hold the standard.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning worked around stairs and multiple levels, with glass, kitchens, and bathrooms given the extra attention they need.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning folded into a deeper reset, lifting the dirt and odours a surface clean leaves behind.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-out cleans that take a lived-in home back to handover condition, scoped to what owners and property managers sign off on.',
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
