import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Pakuranga Cleaning Services | Sano',
  description:
    'Cleaning for Pakuranga homes, townhouses, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and office and commercial cleaning.',
}

export default function PakurangaServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Pakuranga',
        heroTitle: 'Professional cleaning for Pakuranga homes and workplaces.',
        heroSubtitle:
          'From family homes and townhouses to rentals and workplaces, Sano matches the clean to the property across Pakuranga.',
        heroImage: '/images/heroes/deep-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans homes and workplaces across Pakuranga, including family homes, townhouses, rentals, and offices. The work runs from regular upkeep and workplace presentation to deeper cleans and move-out or handover jobs.',
          'We confirm what’s needed before we start, fit around access and the hours that suit the home or business, and leave the space clean, presentable, and ready to use.',
        ],
        introImage: '/images/end-of-tenancy.jpg',
        introImageAlt: 'A property cleaned and ready for handover',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Pakuranga. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes',
            body: 'Regular and deep cleaning worked room by room so kitchens, bathrooms, and living areas stay consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Cleaning scoped to multi-level layouts and shared access, keeping kitchens, bathrooms, and glass on a regular footing.',
            icon: Building2,
          },
          {
            title: 'Offices and workplaces',
            body: 'Consistent office and commercial cleaning scheduled around business hours to keep workplaces presentable.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around what owners and property managers check.',
            icon: KeyRound,
          },
        ],
        schemaDescription:
          'Cleaning services across Pakuranga: regular, deep, end of tenancy, commercial and office, carpet, window, and post-construction.',
        nearby: [
          { name: 'Howick', href: '/service-area/howick' },
          { name: 'Mission Bay', href: '/service-area/mission-bay' },
          { name: 'Remuera', href: '/service-area/remuera' },
        ],
      }}
    />
  )
}
