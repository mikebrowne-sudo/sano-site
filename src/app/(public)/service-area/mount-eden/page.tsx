import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { WhatWeCoverSection } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'

/**
 * Mount Eden service-area page — Sano's first suburb pilot.
 *
 * Spec: docs/superpowers/specs/2026-05-25-mount-eden-suburb-pilot.md
 *
 * v3 (second visual-review pass):
 *   - Reworked around property mix + cleaning needs, not just suburb name
 *   - Hero use-case-led ("homes, rentals, and workplaces"); no suburb
 *     name in title or subtitle
 *   - Intro replaced with cautious property-context paragraph
 *     ("homes, rentals, apartments, and small commercial properties")
 *   - Why Sano moved earlier (now section 3, before services)
 *   - Services grouped into Home / Property + Workplace / Specialist
 *     (all 7 services linked, no implication of only 3)
 *   - NEW property-type cards section (Character homes / Apartments /
 *     Rentals / Workplaces) using existing WhatWeCoverSection
 *   - CTA + Booking unchanged in voice; suburb-light
 *
 * v4 (post-merge visual tweak):
 *   - Intro section uses ONE smaller image instead of the shared
 *     ServiceInformation component's dual-stacked images. Built inline
 *     to keep the shared component (and the six service pages that
 *     use it) untouched. Suburb-pattern decision per Mike.
 *
 * Decisions locked by the spec (do not change without going back to Mike):
 *   - Route: /service-area/mount-eden
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - SuburbChecker NOT mounted; closing text link "Check another
 *     suburb" routes back to /service-area
 *   - Nearby-suburb links deferred until >= 3 sibling pages exist
 *   - No Mount-Eden-specific local claims beyond "within Sano's
 *     Auckland service area" and cautious property-mix wording
 *     ("homes, rentals, apartments, and small commercial properties")
 */

export const metadata: Metadata = {
  title: 'Mount Eden Cleaning Services | Sano',
  description:
    'Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals. Sano helps prepare properties for everyday living, inspections, and handovers.',
}

export default function MountEdenServiceAreaPage() {
  return (
    <>
      {/* Hero — use-case-led title, no suburb name in title/subtitle.
          Eyebrow carries the suburb signal. */}
      <SubpageHero
        eyebrow="Mount Eden cleaning services"
        title="Cleaning for homes, rentals, and workplaces."
        subtitle="From older homes and apartments to rentals, offices, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant
          built inline (not via the shared ServiceInformation
          component). Suburb pages use one smaller image so the
          body text reads as the primary content; the existing six
          service pages keep their dual-image render. Same overall
          look (white band, H2 with sage-100 underline, body-text
          paragraphs, 4:3 rounded image) so the section still feels
          part of the family. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Service Information</h2>
              <div className="body-text space-y-4">
                <p>
                  Mount Eden has a mix of homes, rentals, apartments, and small commercial properties, so cleaning needs can vary. Some properties need regular upkeep, others need a deeper reset, and some need to be ready for inspection, handover, or daily presentation.
                </p>
                <p>
                  Sano helps keep that process simple with clear scopes, careful cleaners, and a quote process that matches the clean to the property.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A residential Auckland home cared for by Sano"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 320px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — moved earlier per Mike's brief. Tightened to
          four cards (2x2 on desktop). Covers Mike's five focus areas:
          clear scopes + simple quote merged into one card; careful
          cleaners; insured and vetted; follow-up if needed. No
          Mount Eden mentions in any card. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={[
          {
            title: 'Clear scopes and simple quotes',
            body: 'Scope and pricing agreed upfront. Send through the property details and the service you need, and we come back with a clear, practical quote.',
          },
          {
            title: 'Careful cleaners',
            body: 'Methodical work with detail-focused finishing on touchpoints, skirting boards, and the obvious surfaces.',
          },
          {
            title: 'Insured and vetted teams',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Follow-up if needed',
            body: 'If something is missed, let us know and we will make it right where reasonable.',
          },
        ]}
      />

      {/* 3. Services available in Mount Eden — three labelled groups
          covering all seven Sano services. Inline link lists (not
          card grids) so the page doesn't implicitly weight any
          subset above the others. */}
      <section className="section-padding bg-[#faf9f6] py-10 lg:py-12">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
              WHAT WE COVER
            </p>
            <h2
              className="mt-2 font-display font-bold text-sage-800"
              style={{
                fontSize: 'clamp(1.5rem, 2.25vw, 1.875rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
              }}
            >
              Services available in <span className="text-sage-500">Mount Eden</span>
            </h2>
            <p className="mt-3 body-text">
              From everyday home cleaning to specialist surfaces and commercial spaces, every Sano service is available here. Pick one to read its full scope.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            <div>
              <h3 className="mb-2 text-[1rem] font-semibold text-sage-800">Home cleaning</h3>
              <p className="text-[0.9375rem] leading-relaxed text-sage-600">
                <Link
                  href="/services/regular-cleaning"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Regular house cleaning
                </Link>
                {' · '}
                <Link
                  href="/services/deep-cleaning"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Deep cleaning
                </Link>
                {' · '}
                <Link
                  href="/services/end-of-tenancy"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  End of tenancy cleaning
                </Link>
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-[1rem] font-semibold text-sage-800">
                Property and workplace cleaning
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-sage-600">
                <Link
                  href="/services/commercial-cleaning"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Commercial and office cleaning
                </Link>
                {' · '}
                <Link
                  href="/services/post-construction"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Post-construction cleaning
                </Link>
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-[1rem] font-semibold text-sage-800">
                Specialist cleaning
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-sage-600">
                <Link
                  href="/services/carpet-upholstery"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Carpet and upholstery cleaning
                </Link>
                {' · '}
                <Link
                  href="/services/window-cleaning"
                  className="font-semibold text-sage-500 underline-offset-4 hover:underline"
                >
                  Window cleaning
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Cleaning needs vary by property type — four cards
          covering the property mix Mike noted (character homes /
          apartments / rentals / workplaces). Wording is cautious
          and supply-side; no claims about Sano's specific history
          with these property types in Mount Eden. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Older homes and detailed interiors',
            body: 'More detailed dusting, skirting boards, room-by-room work, and care around detailed surfaces.',
            icon: Home,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Compact layouts where kitchens, bathrooms, glass, floors, and access timing matter.',
            icon: Building2,
          },
          {
            title: 'Rentals and handovers',
            body: 'Clear scopes, practical timing, and attention to the areas owners or property managers are likely to check.',
            icon: KeyRound,
          },
          {
            title: 'Workplaces and small commercial spaces',
            body: 'Regular presentation, shared amenities, touchpoints, and cleaning that works around the business.',
            icon: Briefcase,
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

      {/* Schema.org — matches sibling service-page convention.
          Auckland-level City areaServed, no suburb-level Place. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Mount Eden Cleaning Services',
            description:
              'Cleaning services across Mount Eden: regular, deep, end of tenancy, commercial, carpet, window, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* CTA — single quote action, no suburb mention. */}
      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

      {/* "Check another suburb" + always-on trust links (per spec §7).
          SuburbChecker intentionally omitted on the pilot per spec §5.
          Sits on cream to soften the transition from the dark
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
