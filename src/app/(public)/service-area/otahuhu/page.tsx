import type { Metadata } from 'next'
import { Building2, Home, KeyRound, Store } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

/**
 * Otahuhu — wave 5. South Auckland, homes + workplaces. Registry name is ASCII
 * "Otahuhu" (no macron); `suburb` must match exactly or schema/local FAQ
 * degrade. Service-led copy only: no local claims.
 */

export const metadata: Metadata = {
  title: 'Otahuhu Cleaning Services | Sano',
  description:
    'Cleaning for Otahuhu homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and commercial cleaning across the area.',
}

export default function OtahuhuServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Otahuhu',
        heroTitle: 'Professional cleaning for Otahuhu homes and workplaces.',
        heroSubtitle:
          'From end-of-tenancy resets and move cleans to regular home upkeep and workplace presentation, Sano covers homes and businesses across Otahuhu.',
        heroImage: '/images/heroes/end-of-tenancy-hero.jpg',
        introParagraphs: [
          'Move cleans and end-of-tenancy resets are available across Otahuhu, together with regular home upkeep, deep cleans, and workplace presentation for offices and commercial spaces.',
          'Access and the right hours are sorted first, whether that suits a home or a workplace, and the scope is confirmed beforehand so the space is left clean and ready to use.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'A rental cleaned to handover condition in Auckland',
        servicesLead:
          'Move cleans, end-of-tenancy resets, regular upkeep, deep cleans, workplace presentation, carpets, and windows are all available across Otahuhu. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans that take a home back to inspection-ready, scoped around what owners and property managers check off.',
            icon: KeyRound,
          },
          {
            title: 'Family homes',
            body: 'Regular upkeep and deeper cleans through kitchens, bathrooms, and living areas, kept to a schedule that suits the household.',
            icon: Home,
          },
          {
            title: 'Units and rentals',
            body: 'Cleaning suited to units and rental properties, keeping wet areas and floors done between deeper resets.',
            icon: Building2,
          },
          {
            title: 'Workplaces',
            body: 'Offices and commercial spaces cleaned to a presentation standard, scheduled around staff access and business hours.',
            icon: Store,
          },
        ],
        schemaDescription:
          'Cleaning services across Otahuhu: regular, deep, end of tenancy, commercial, carpet, and window.',
        nearby: [
          { name: 'Onehunga', href: '/service-area/onehunga' },
          { name: 'Papatoetoe', href: '/service-area/papatoetoe' },
          { name: 'Mount Wellington', href: '/service-area/mount-wellington' },
        ],
      }}
    />
  )
}
