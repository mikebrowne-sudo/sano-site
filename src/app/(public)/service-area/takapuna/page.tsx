import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
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
 * Takapuna service-area page — Sano's second suburb page.
 *
 * Spec: docs/superpowers/specs/2026-05-25-takapuna-suburb.md
 * Builds on: Mount Eden pilot spec §11 (canonical structural reference).
 *
 * This page deliberately tests pattern flexibility: property + workplace
 * cleaning LEADS the services grouping rather than residential (Mount
 * Eden's order). If the deploy preview reads naturally with property +
 * workplace first, the suburb-page pattern is proven across two
 * materially different mixes.
 *
 * Decisions locked by the spec (do not change without going back to Mike):
 *   - Route: /service-area/takapuna
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - Hero strings (eyebrow / title / suburb-free subtitle — no
 *     "beachfront" framing)
 *   - Service grouping order: Property + workplace LEADS
 *   - Property-type cards: Apartments / Family homes / Rentals /
 *     Offices (Family homes replaces Mount Eden's "Older homes")
 *   - SuburbChecker NOT mounted; closing trust strip has three text
 *     links: Check another suburb · Our guarantee · FAQ
 *   - Nearby-suburb links DEFERRED (first North Shore page; retrofit
 *     when ≥3 sibling pages exist)
 *   - Hero image: /images/heroes/regular-house-cleaning-hero.jpg
 *     (reused from Mount Eden default)
 *   - Intro image: /images/herne-bay-residential.jpg (reused from
 *     Mount Eden default)
 *   - Meta description uses the trimmed under-155-char variant from
 *     spec §3
 *
 * No Takapuna-specific local claims beyond Mike's confirmed
 * operational truth + property-mix sentences. No luxury / beachfront-
 * lifestyle / Airbnb / "salt-air specialist" / "coastal window
 * expert" / CBD-corporate framing.
 */

export const metadata: Metadata = {
  title: 'Takapuna Cleaning Services | Sano',
  description:
    'Cleaning for Takapuna apartments, homes, offices, and rentals: regular upkeep, handovers, workplace presentation, and specialist surfaces.',
}

export default function TakapunaServiceAreaPage() {
  return (
    <>
      {/* Hero — approved §3 strings, suburb-free title + subtitle.
          Eyebrow carries the suburb signal. Image reused from
          Mount Eden default. */}
      <SubpageHero
        eyebrow="Takapuna cleaning services"
        title="Cleaning for apartments, homes, and workplaces."
        subtitle="From apartments and family homes to offices and rentals, Sano helps match the cleaning scope to the property and the reason for the clean."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant
          built inline (Mount Eden v5 pattern). One image, same
          sizing/proportion/treatment as the shared ServiceInformation
          component. Two paragraphs verbatim from Mike-confirmed
          spec §5 row 2: property-mix sentence first (Takapuna-
          specific), operational-truth sentence second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Cleaning across <span className="text-sage-500">Takapuna</span></h2>
              <div className="body-text space-y-4">
                <p>
                  Sano cleans homes and workplaces across Takapuna, including apartments, family homes, townhouses, offices, and rentals. The work ranges from regular upkeep and workplace presentation to deeper cleans and move-out or handover jobs.
                </p>
                <p>
                  We confirm the job before we start, fit around building access and trading hours where needed, and leave the home or workplace clean, presentable, and ready.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A residential Auckland home cared for by Sano"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — same 4 cards as Mount Eden v5. No Takapuna
          mentions in any card. 2x2 grid on desktop. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Takapuna — three labelled groups
          covering all seven Sano services. PROPERTY + WORKPLACE
          LEADS the order per Mike's smaller-call lock — this is the
          pattern-flex test vs Mount Eden's residential-led order.
          Inline link lists (not card grids). */}
      <SuburbServicesSection
        suburb="Takapuna"
        lead="From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope."
        groups={[PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four Takapuna-
          specific cards. Card 2 is "Family homes" (replaces Mount
          Eden's "Older homes and detailed interiors" per Mike's
          smaller-call lock). Card 4 renamed to "Offices and small
          commercial spaces" to lean into Takapuna's office mix.
          Wording is cautious + supply-side; no claims about Sano's
          specific Takapuna history with these property types. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Apartments and townhouses',
            body: 'Compact layouts where kitchens, bathrooms, glass, floors, and access timing matter.',
            icon: Building2,
          },
          {
            title: 'Family homes',
            body: 'Regular upkeep across living areas, kitchens, bathrooms, and finishing details that help maintain a household standard.',
            icon: Home,
          },
          {
            title: 'Rentals and handovers',
            body: 'Clear scopes, practical timing, and attention to the areas owners or property managers are likely to check.',
            icon: KeyRound,
          },
          {
            title: 'Offices and small commercial spaces',
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
          Auckland-level City areaServed, no suburb-level Place.
          Description leads with "commercial" per the property +
          workplace orientation of this page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Takapuna Cleaning Services',
            description:
              'Cleaning services across Takapuna: commercial, regular, end of tenancy, window, deep, carpet, and post-construction.',
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

      {/* Closing trust strip — three text links per Mount Eden v3
          final + Takapuna spec §7 lock. /guarantee + /faq included
          from v1 this time (Mount Eden lesson). SuburbChecker
          intentionally omitted per pilot decision. Sits on cream
          to soften the transition from the dark CtaBanner. */}
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
