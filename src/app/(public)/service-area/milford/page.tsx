import type { Metadata } from 'next'
import { Home, Building2, Sparkles, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Milford Cleaning Services | Sano',
  description:
    'Cleaning for Milford homes, apartments, and rentals: regular upkeep, deep cleans, end of tenancy, window, and carpet cleaning on the North Shore.',
}

export default function MilfordServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Milford',
        heroTitle: 'Professional cleaning for Milford homes and rentals.',
        heroSubtitle:
          'From regular upkeep to deeper cleans and move-out resets, Sano keeps Milford homes, apartments, and rentals well looked after.',
        heroImage: '/images/heroes/window-cleaning-hero.jpg',
        introParagraphs: [
          'Across Milford, Sano cleans family homes, apartments, and rentals, whether that’s ongoing upkeep, a deeper clean, or an end-of-tenancy reset before a new tenancy.',
          'Apartment upkeep and end-of-tenancy resets are both covered in Milford, with steady regular cleans and thorough move-out work that takes a unit back to inspection-ready.',
        ],
        introImage: '/images/window-cleaning.jpg',
        introImageAlt: 'Clean, streak-free windows in an Auckland home',
        servicesLead:
          'End-of-tenancy resets and regular apartment upkeep are available across Milford, as are deep cleans, carpets, and windows. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'A regular clean kept to a schedule that suits the household, with a deeper reset dropped in whenever the home needs one.',
            icon: Home,
          },
          {
            title: 'Apartments and units',
            body: 'Upkeep and changeover cleaning built for apartment living, from routine visits to a full end-of-tenancy turnaround between tenants.',
            icon: Building2,
          },
          {
            title: 'Glass and windows',
            body: 'Interior and exterior window cleaning for clear glass, booked on its own or worked into a deeper clean where it makes sense.',
            icon: Sparkles,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy cleans that take a unit back to inspection-ready, scoped around what owners and property managers check off.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Milford: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
        nearby: [
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Albany', href: '/service-area/albany' },
          { name: 'Devonport', href: '/service-area/devonport' },
        ],
      }}
    />
  )
}
