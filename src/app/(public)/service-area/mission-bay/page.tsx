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

/**
 * Mission Bay service-area page — Stage 3, first East Auckland page.
 * Residential-led with a notable apartment / townhouse density near the
 * waterfront; commercial stays a light secondary thread (small village
 * strip) and the hero is homes-and-rentals.
 *
 * Eastern-bays prestige risk. Traps held: no affluent / sought-after /
 * luxury / beach-lifestyle framing; "near the bay" / "waterfront" used only
 * as plain location, never as prestige; no hospitality / café-specialism
 * claims; no demographics; no "careful" lead; no landmark-as-proof.
 *
 * Built on the shared system. NO nearby-suburb links — first East Auckland
 * page, no regional siblings yet.
 */

export const metadata: Metadata = {
  title: 'Mission Bay Cleaning Services | Sano',
  description:
    'Cleaning for Mission Bay apartments, townhouses, family homes, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function MissionBayServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="Mission Bay cleaning services"
        title="Professional cleaning for Mission Bay homes and rentals."
        subtitle="From regular upkeep to deeper move-in and move-out cleans, Sano keeps Mission Bay's apartments, townhouses, family homes, and rentals looking properly cared for."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Mission Bay</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  For apartments, townhouses, family homes, and rentals across Mission Bay, Sano covers regular upkeep, deeper one-off cleans, and move-in or move-out work.
                </p>
                <p>
                  We talk through what&apos;s needed before booking, plan around lifts, shared access, and timing for apartments, and leave the home clean and ready.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A well-kept residential Auckland home"
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
        suburb="Mission Bay"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Mission Bay. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Apartments near the bay',
            body: 'Apartments where the day-to-day is shaped by lift access, shared lobbies, and the building’s own rules on timing and parking, so the clean is booked to suit the block.',
            icon: Building2,
          },
          {
            title: 'Townhouses',
            body: 'Multi-level townhouses where each floor adds its own stairs, bathrooms, and glass, so the clean is worked through level by level rather than treated as one space.',
            icon: Layers,
          },
          {
            title: 'Family homes',
            body: 'Standalone family homes set back from the bay, where steady weekly or fortnightly upkeep keeps living areas, kitchens, and bathrooms from getting away on a busy household.',
            icon: Home,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and move cleans booked to the handover date and scoped around the checks a landlord or property manager runs before the next tenancy.',
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
            name: 'Mission Bay Cleaning Services',
            description:
              'Cleaning services across Mission Bay: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
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
