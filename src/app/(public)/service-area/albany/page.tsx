import type { Metadata } from 'next'
import { Home, Building2, Briefcase, KeyRound } from 'lucide-react'
import { SuburbLandingTemplate } from '../_components/SuburbLandingTemplate'
import { HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP } from '../_components/SuburbServicesSection'

export const metadata: Metadata = {
  title: 'Albany Cleaning Services | Sano',
  description:
    'Cleaning for Albany homes, townhouses, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, and office and commercial cleaning.',
}

export default function AlbanyServiceAreaPage() {
  return (
    <SuburbLandingTemplate
      data={{
        suburb: 'Albany',
        heroTitle: 'Professional cleaning for Albany homes and workplaces.',
        heroSubtitle:
          'From family homes and townhouses to rentals and workplaces, Sano matches the clean to the property across Albany.',
        heroImage: '/images/heroes/carpet-upholstery-cleaning-hero.jpg',
        introParagraphs: [
          'Sano cleans both homes and workplaces across Albany, covering family homes, newer builds, townhouses, rentals, and offices. Bookings span regular upkeep, workplace presentation, deeper cleans, and move-out or handover jobs.',
          'Access and the right hours are sorted first, whether that suits a home or a workplace, and the scope is confirmed up front so the space ends up clean, presentable, and ready to use.',
        ],
        introImage: '/images/deep-cleaning.jpg',
        introImageAlt: 'A thoroughly cleaned Auckland home',
        servicesLead:
          'Regular and deep home cleaning, end-of-tenancy resets, office and commercial cleaning, carpets, and windows are all available across Albany. Pick a service to read its full scope.',
        serviceGroups: [HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP],
        cover: [
          {
            title: 'Family homes and newer builds',
            body: 'Regular and deep cleaning for houses of all sizes, keeping finishes, kitchens, and bathrooms consistently done.',
            icon: Home,
          },
          {
            title: 'Townhouses',
            body: 'Cleaning scoped to multi-level townhouse layouts and shared access, with kitchens, bathrooms, and glass a regular focus.',
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
          'Cleaning services across Albany: regular, deep, end of tenancy, commercial and office, carpet, window, and post-construction.',
        nearby: [
          { name: 'Milford', href: '/service-area/milford' },
          { name: 'Takapuna', href: '/service-area/takapuna' },
          { name: 'Devonport', href: '/service-area/devonport' },
        ],
      }}
    />
  )
}
