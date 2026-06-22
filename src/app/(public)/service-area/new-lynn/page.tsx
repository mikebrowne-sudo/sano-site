import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, Home, KeyRound, Layers } from 'lucide-react'
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
 * New Lynn service-area page — West Auckland cluster. Residential-led with a
 * medium-density / apartment-forward angle: New Lynn has grown around its
 * transit-hub town centre, so apartments and townhouses near the centre sit
 * alongside family homes and units on the surrounding streets. Commercial
 * stays a light secondary thread (services group only); the hero is
 * homes-and-rentals so the page stays distinct from the commercial-aware
 * Henderson sibling.
 *
 * Traps held: no "growing area" / "up-and-coming" / affordability /
 * demographic framing (West Auckland sensitivity — New Lynn attracts this in
 * lazy SEO copy, explicitly avoided); no "careful" lead; no landmark-as-proof.
 *
 * Built on the shared system. Nearby-suburb links to the West cluster
 * (Henderson, Te Atatu Peninsula, Titirangi).
 */

export const metadata: Metadata = {
  title: 'New Lynn Cleaning Services | Sano',
  description:
    'Cleaning for New Lynn apartments, townhouses, units, and family homes: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function NewLynnServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="New Lynn cleaning services"
        title="Professional cleaning for New Lynn homes and rentals."
        subtitle="Sano cleans across New Lynn's apartments, townhouses, units, and family homes, from regular upkeep to deeper resets and move-in and move-out cleans."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">New Lynn</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  New Lynn has built up around its town centre and transport hub, so a lot of its housing is medium-density: apartments and townhouses near the centre, with family homes and units on the streets around them, and rentals throughout. The right cleaning scope depends on the property, the access, and whether the job is regular upkeep, a deeper reset, or a move-related clean.
                </p>
                <p>
                  Sano sorts the scope before we start, plans around lifts, stairs, and shared access where the property has them, and leaves the place clean and ready to use.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A tidy West Auckland family home"
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
        suburb="New Lynn"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across New Lynn. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Apartments and medium-density',
            body: 'Apartments and units near the centre where lifts, shared entrances, and building schedules set the timing, so the clean is booked to suit the block.',
            icon: Building2,
          },
          {
            title: 'Family homes',
            body: 'Standalone homes on the surrounding streets where regular weekly or fortnightly upkeep keeps living areas, kitchens, and bathrooms on top of a busy week.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Multi-level townhouses and compact units where stairs, tight layouts, and shared driveways mean the clean is planned to suit how the place is built.',
            icon: Layers,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans booked to the handover and scoped around what an owner or property manager checks before the next tenancy.',
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
            name: 'New Lynn Cleaning Services',
            description:
              'Cleaning services across New Lynn: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <NearbySuburbsSection
        suburbs={[
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
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
