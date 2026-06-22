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
import { NearbySuburbsSection } from '../_components/NearbySuburbsSection'

/**
 * Te Atatu Peninsula service-area page — West Auckland cluster. Residential:
 * a harbour peninsula that is mostly standalone family homes, with newer
 * townhouses and subdivisions added over time, and rentals throughout.
 * Commercial is a light secondary thread (services group only); the hero is
 * homes-and-rentals.
 *
 * Traps held: no "growing area" / "up-and-coming" / affordability /
 * demographic framing; "harbour" / "waterside" used only as plain location,
 * never as prestige or lifestyle; no "careful" lead; no landmark-as-proof.
 *
 * Built on the shared system. Nearby-suburb links to the West cluster
 * (Henderson, New Lynn, Titirangi). Display name uses the macron
 * (Te Atatu Peninsula -> Te Atatū Peninsula); slug stays te-atatu-peninsula.
 */

export const metadata: Metadata = {
  title: 'Te Atatū Peninsula Cleaning Services | Sano',
  description:
    'Cleaning for Te Atatū Peninsula family homes, townhouses, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function TeAtatuPeninsulaServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="Te Atatū Peninsula cleaning services"
        title="Professional cleaning for Te Atatū Peninsula homes and rentals."
        subtitle="Sano cleans across the Peninsula's family homes, newer townhouses, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Te Atatū Peninsula</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Te Atatū Peninsula reaches out into the harbour and is almost entirely residential, from long-established family homes to newer townhouses and subdivisions, with rentals across both. The right cleaning scope comes down to the property, its age, and whether the job is regular upkeep, a deeper reset, or a clean timed to a move.
                </p>
                <p>
                  Sano agrees the scope upfront, fits the work to the size and age of each home, and leaves the place clean and tidy.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A standalone family home in West Auckland"
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
        suburb="Te Atatū Peninsula"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Te Atatū Peninsula. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Established family homes',
            body: 'Long-standing peninsula homes where regular upkeep across living areas, kitchens, bathrooms, and floors keeps a busy household running through the week.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Original peninsula homes that have been extended or opened up, where the new and older parts get the same finish so the whole house feels even.',
            icon: BadgeCheck,
          },
          {
            title: 'Townhouses and new builds',
            body: 'Newer townhouses and subdivision homes where finishing surfaces, glass, and multiple levels are the focus, often as a first clean before moving in.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover date and scoped around the areas an owner or property manager checks before a new tenancy.',
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
            name: 'Te Atatū Peninsula Cleaning Services',
            description:
              'Cleaning services across Te Atatū Peninsula: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <NearbySuburbsSection
        suburbs={[
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Titirangi', href: '/service-area/titirangi' },
        ]}
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
