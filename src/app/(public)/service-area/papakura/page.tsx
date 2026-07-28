import type { Metadata } from 'next'
import { Home, Building2, Sofa, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Papakura Cleaning Services | Sano',
  description:
    'Cleaning for Papakura homes, new builds, townhouses, and rentals: regular upkeep, deep cleans, end of tenancy, carpet, and window cleaning.',
}

export default function PapakuraServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Papakura',
        heroTitle: 'Professional cleaning for Papakura homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and end-of-tenancy resets, Sano helps Papakura households keep homes and rentals properly looked after.',
        heroImage: '/images/heroes/regular-house-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans family homes, newer builds, townhouses, and rentals across Papakura, from regular upkeep to deeper cleans and move-in or move-out work.',
          'A regular clean is an easy place to start for a Papakura home, with a deeper reset added when it is needed. Bookings hold to a steady day and time, and the scope stays matched to how the home is actually used.',
        ],
        introImage: '/images/deep-cleaning.jpg',
        introImageAlt: 'A thoroughly cleaned home interior in Auckland',
        servicesLead:
          'Regular home upkeep, deep cleans, move cleans, carpets, and windows are all available across Papakura, whether you need one visit or an ongoing schedule. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes and new builds',
            body: 'Ongoing upkeep on a steady schedule, with kitchens, bathrooms, and high-traffic floors kept on top of visit to visit.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'A cleaning plan built around stairs, tighter footprints, and shared entries, so multi-level homes stay easy to keep up.',
            icon: Building2,
          },
          {
            title: 'Carpets and soft furnishings',
            body: 'Deeper carpet and upholstery work when regular vacuuming has stopped shifting the marks, ground-in dirt, and lingering smells.',
            icon: Sofa,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans timed to the handover date and worked to the checklist owners and property managers inspect against.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Papakura: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
        nearby: [
          { name: 'Manukau', href: '/service-area/manukau' },
          { name: 'Ellerslie', href: '/service-area/ellerslie' },
          { name: 'Onehunga', href: '/service-area/onehunga' },
        ],
      }}
    />
  )
}
