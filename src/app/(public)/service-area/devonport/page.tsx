import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Building2, Home, KeyRound } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { WhatWeCoverSection } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'
import { SUBURB_WHY_SANO_ITEMS } from '@/lib/suburb-why-sano'
import {
  SuburbServicesSection,
  HOME_CLEANING_GROUP,
  PROPERTY_WORKPLACE_GROUP,
  SPECIALIST_GROUP,
} from '../_components/SuburbServicesSection'

/**
 * Devonport service-area page — Stage 3, second North Shore page (after
 * Takapuna). Residential-led: Devonport is an older seaside residential
 * area with only a small village of shops, so commercial stays a light
 * secondary thread (services group only) and the hero is homes-and-rentals.
 *
 * Highest heritage / prestige risk so far. Traps held (do not relax):
 * no "heritage" / "historic" / "charm" / period-VALUE framing (villas,
 * weatherboard, sash windows named only as property features, never as
 * prestige); no naval / military references; no affluent / sought-after /
 * beach-lifestyle framing; no "careful" lead; no landmark-as-proof.
 *
 * Built on the shared system (SUBURB_WHY_SANO_ITEMS + SuburbServicesSection +
 * green intro suburb name). NO nearby-suburb links — Takapuna is the only
 * other North Shore page (below the >=3-sibling retrofit threshold).
 */

export const metadata: Metadata = {
  title: 'Devonport Cleaning Services | Sano',
  description:
    'Cleaning for Devonport villas, character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function DevonportServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="Devonport cleaning services"
        title="Professional cleaning for Devonport homes and rentals."
        subtitle="Sano cleans across Devonport's older villas, character homes, townhouses, apartments, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Devonport</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Across Devonport, Sano cleans character homes, family homes, townhouses, apartments, and rentals, from regular upkeep to a deeper clean, or a full move-out at the end of a tenancy.
                </p>
                <p>
                  We set out a clear plan from the start, work around the layout and access of each property, and leave the place clean, settled, and properly looked after.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="An older weatherboard home in Devonport"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      <SuburbServicesSection
        suburb="Devonport"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Devonport. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Villas and character homes',
            body: 'Older villas and weatherboard homes where the original joinery, sash windows, and timber floors take a thorough clean that works through each room properly.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Updated homes and open-plan additions where the aim is an even, finished result that leaves the renovation properly clean and ready to live in.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartments and townhouses where lifts, stairs, and shared-building timing shape the job, so the clean is planned to suit the building as well as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans planned around the handover, timed between tenancies, and focused on the areas an owner or property manager checks.',
            icon: KeyRound,
          },
        ]}
      />

      <BookingStepsSection
        heading="Book your clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Share the property details and the service you need.',
          },
          {
            title: 'We arrange a time',
            body: 'A clear quote and a time that fits your schedule.',
          },
          {
            title: 'Clean done properly',
            body: 'The team arrives prepared and works through the agreed scope.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Devonport Cleaning Services',
            description:
              'Cleaning services across Devonport: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

      <section className="bg-[#faf9f6] py-6 text-center">
        <p className="text-[0.875rem] text-sage-600">
          <Link
            href="/service-area"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            Check another suburb
          </Link>
          {' · '}
          <Link
            href="/guarantee"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            Our guarantee
          </Link>
          {' · '}
          <Link
            href="/faq"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            FAQ
          </Link>
        </p>
      </section>
    </>
  )
}
