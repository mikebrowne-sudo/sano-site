import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Home, KeyRound, Trees } from 'lucide-react'
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
 * Titirangi service-area page — West Auckland cluster. Residential, and the
 * most physically distinct page in the set: bush-set homes in the Waitakere
 * foothills, where timber, decks, glass, and steeper access genuinely change
 * how a clean runs. Commercial stays a light secondary thread (small village
 * only); the hero is homes-and-rentals.
 *
 * Traps held: no prestige / "architectural gems" / "sought-after" / lifestyle
 * / bohemian / artistic framing (Titirangi attracts all of these in lazy
 * copy); bush, timber, decks, and glass named only as plain property
 * features; Waitakere Ranges named only as plain location, not as
 * landmark-as-proof; no "careful" lead; no demographics.
 *
 * Built on the shared system. Nearby-suburb links to the West cluster
 * (Henderson, New Lynn, Te Atatu Peninsula).
 */

export const metadata: Metadata = {
  title: 'Titirangi Cleaning Services | Sano',
  description:
    'Cleaning for Titirangi bush-set homes, timber houses, and rentals: regular upkeep, deep cleans, move-in and move-out, glass, and specialist surfaces.',
}

export default function TitirangiServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="Titirangi cleaning services"
        title="Professional cleaning for Titirangi homes and rentals."
        subtitle="Sano cleans across Titirangi's bush-set homes, timber houses, and rentals, from regular upkeep to deeper resets and move-in and move-out cleans."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Titirangi</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Sano provides regular, deep, and move-related cleaning across Titirangi, including timber and glass homes, bush-set houses, and rentals. Some need ongoing upkeep and others a more detailed clean before a move, and with the decks, big windows, and leaf-fall these homes bring, the glass and outdoor areas often need as much attention as the rooms inside.
                </p>
                <p>
                  We keep the process clear from the start, allow for the access and the extra glass these homes tend to have, and focus on leaving the home clean, presentable, and properly looked after.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A timber home set among trees in West Auckland"
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
        suburb="Titirangi"
        lead="From regular home cleaning and deeper resets to move cleans, glass, and specialist surfaces, the full range of Sano services is available across Titirangi. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Bush-set homes',
            body: 'Bush-set homes where decks, large windows, and the dust and leaf-fall that come with the setting mean glass and outdoor areas often need as much attention as the rooms inside.',
            icon: Trees,
          },
          {
            title: 'Timber and glass homes',
            body: 'Houses with a lot of timber, glass, and open living, where the clean covers the extra surfaces and angles these homes bring, not just the standard rooms.',
            icon: Home,
          },
          {
            title: 'Renovated and extended homes',
            body: 'Homes that have been updated or added to, where the clean works consistently across the new and original spaces so the whole house reads as finished.',
            icon: BadgeCheck,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleans booked to the handover and scoped around the areas an owner or property manager checks before a new tenancy.',
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
            name: 'Titirangi Cleaning Services',
            description:
              'Cleaning services across Titirangi: regular, deep, end of tenancy, window, carpet, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <NearbySuburbsSection
        suburbs={[
          { name: 'Henderson', href: '/service-area/henderson' },
          { name: 'New Lynn', href: '/service-area/new-lynn' },
          { name: 'Te Atatū Peninsula', href: '/service-area/te-atatu-peninsula' },
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
