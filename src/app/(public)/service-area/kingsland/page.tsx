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
 * Kingsland service-area page — Sano's seventh suburb page, completing the
 * Stage 2 Central cluster (Grey Lynn → Ponsonby → Kingsland).
 *
 * Built on the current suburb-page system: shared Why Sano constant
 * (SUBURB_WHY_SANO_ITEMS) and the shared SuburbServicesSection card grid
 * (green suburb name in the heading, per-page group order). Residential-led
 * (Home cleaning leads the services order). Content logic is "local
 * situation first, then outcome" — the intro describes Kingsland's compact,
 * varied housing mix and the four property-type cards talk about the
 * cleaning situation and how the home should feel afterwards, not surface
 * checklists. Intro paragraph 2 and the cards are deliberately worded
 * distinctly from the sibling Central pages to avoid near-duplicate copy.
 *
 * Traps held (Mike-confirmed): no "careful" as a lead adjective; no
 * upscale / trendy / affluent / prestige / heritage-value framing; no
 * hospitality / café-specialism claims (Kingsland strip stays out of the
 * copy); no demographics; no landmark-as-proof. Commercial stays a light
 * secondary thread (Property and workplace group only; hero is
 * homes-and-rentals).
 *
 * Locks: Auckland-level City areaServed; SuburbChecker not mounted; closing
 * trust strip = Check another suburb · Our guarantee · FAQ; nearby-suburb
 * links deferred to the Central cluster retrofit. Hero image:
 * regular-house-cleaning-hero.jpg; intro image: herne-bay-residential.jpg
 * (residential defaults; intro alt varied).
 */

export const metadata: Metadata = {
  title: 'Kingsland Cleaning Services | Sano',
  description:
    'Cleaning for Kingsland character homes, townhouses, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function KingslandServiceAreaPage() {
  return (
    <>
      {/* Hero — residential-led, homes-and-rentals only (no commercial
          surfacing). Title carries the suburb name; eyebrow carries the
          suburb signal. Residential hero image. */}
      <SubpageHero
        eyebrow="Kingsland cleaning services"
        title="Professional cleaning for Kingsland homes and rentals."
        subtitle="From regular upkeep to deeper move-in and move-out cleans, Sano keeps Kingsland's compact mix of homes, townhouses, apartments, and rentals looking properly cared for."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant. Two
          paragraphs: property-and-need angle first, how-Sano-approaches-it
          second. Worded distinctly from Grey Lynn / Ponsonby. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Kingsland</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Kingsland fits a lot of housing variety into a compact area, from character homes and renovated family homes through to townhouses, apartments, and rentals. The right scope for each property comes down to its layout, its access, and whether the job is regular upkeep, a deeper reset, or a move-related clean.
                </p>
                <p>
                  Because Kingsland sits on such a compact footprint, timing and access are often part of the plan, so Sano agrees the scope upfront and leaves the home feeling presentable, settled, and properly looked after.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A tidy, well-kept Auckland home"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — shared constant (suburb-agnostic). */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Kingsland — shared card grid. Residential-
          led order (Home cleaning first); commercial stays secondary in the
          Property and workplace card. */}
      <SuburbServicesSection
        suburb="Kingsland"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Kingsland. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four cards matching
          Kingsland's mix (Character homes / Renovated homes and extensions /
          Apartments and townhouses / Rentals and move cleans). Situation +
          outcome wording; no "careful" lead, no prestige / heritage framing. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Character homes',
            body: 'Older homes with detailed finishes and timber floors, where an unhurried, considered clean brings out the detail and leaves the place feeling properly cared for.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Renovated and extended homes where an even, thorough finish across the new and existing spaces helps the whole place feel complete and ready to live in.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Townhouses and apartments bring their own access and timing, from shared entrances and stairs to building schedules, so the clean is planned to fit the building as much as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans built around the handover, timed to fit between tenancies, and focused on what an owner or property manager will check at inspection.',
            icon: KeyRound,
          },
        ]}
      />

      {/* 5. How it works — generic three-step booking. */}
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

      {/* Schema.org — Auckland-level City areaServed, no suburb-level Place.
          Residential-led service order (commercial + post-construction last). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Kingsland Cleaning Services',
            description:
              'Cleaning services across Kingsland: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* Nearby areas — internal links to the nearest Central suburb pages. */}
      <NearbySuburbsSection
        suburbs={[
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
        ]}
      />

      {/* CTA — single quote action, no suburb mention. */}
      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

      {/* Closing trust strip — three text links (sibling lock). SuburbChecker
          omitted. Sits on cream to soften the transition from the dark
          CtaBanner. */}
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
