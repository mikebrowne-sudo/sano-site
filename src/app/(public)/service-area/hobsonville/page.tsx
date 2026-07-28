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
          'Move-in and move-out cleans are available across Hobsonville, handing a home over spotless for the next occupants, with regular and deep cleaning to keep it that way once settled.',
        ],
        introImage: '/images/sano-auckland-team.jpeg',
        introImageAlt: 'A Sano cleaner at work in an Auckland home',
        servicesLead:
          'Move cleans and end-of-tenancy resets are available across Hobsonville, together with regular upkeep, deep cleans, carpets, and windows. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes and new builds',
            body: 'A clean handover for a new home, then regular or deep cleaning once you’re in, keeping kitchens and bathrooms on track.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Move and upkeep cleans suited to multi-level layouts and shared entries, with glass and wet areas a standing focus.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Carpet and upholstery cleaning at changeover or between cleans, clearing built-up dirt and odours before the next occupant.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans timed to the handover and worked to the standard owners and property managers expect at inspection.',
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
