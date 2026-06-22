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
 * Epsom service-area page — Sano's fourth suburb page.
 *
 * Builds on: Mount Eden pilot spec §11 (canonical residential-led pattern).
 * Rollout plan: docs/superpowers/specs/2026-05-25-suburb-rollout-plan.md (A1).
 *
 * Epsom, Central Auckland, residential-led — same template family as Mount
 * Eden, but with a stronger "local angle" copy layer (v2 direction from
 * Mike): the hero, intro, and the four property-type card bodies are
 * Mike-supplied verbatim and lean into Epsom's actual residential mix
 * (presentation, access, detail; established homes, townhouses, apartments,
 * rentals, move cleans) so the page reads specific rather than swappable.
 * Still no invention beyond Mike's confirmed wording — no school zones,
 * property values, prestige, demographics, or heritage/villa claims.
 * Commercial stays a light, secondary reference (grouped services list only),
 * so the page does not read as a commercial suburb page.
 *
 * Decisions locked (do not change without going back to Mike):
 *   - Route: /service-area/epsom (slug `epsom`, postcode 1023, Central)
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - Service grouping order: Home cleaning LEADS (matches Mount Eden)
 *   - SuburbChecker NOT mounted; closing trust strip: Check another suburb ·
 *     Our guarantee · FAQ
 *   - Nearby-suburb links DEFERRED — Mount Eden + Epsom = 2 Central pages,
 *     below the >= 3-sibling retrofit threshold (retrofit at Stage 2)
 *   - Hero image: /images/heroes/regular-house-cleaning-hero.jpg (residential
 *     default, reused from Mount Eden)
 *   - Intro image: /images/herne-bay-residential.jpg (residential default,
 *     reused from Mount Eden)
 *
 * Epsom-specific do-not-claim additions (beyond the standard list):
 *   - No school-zone / catchment framing
 *   - No "high-value suburb" / property-value / prestige angle
 *   - No villa / heritage characterisation (no confirmed reason)
 *   - No demographics or income / property-value language
 */

export const metadata: Metadata = {
  title: 'Epsom Cleaning Services | Sano',
  description:
    'Regular, deep, and end-of-tenancy cleaning for Epsom homes, apartments, and rentals. Sano matches the scope to the property and the clean.',
}

export default function EpsomServiceAreaPage() {
  return (
    <>
      {/* Hero — use-case-led title, no suburb name in title/subtitle.
          Eyebrow carries the suburb signal. Residential framing only;
          no "workplaces" in the title so the page stays residential. */}
      <SubpageHero
        eyebrow="Epsom cleaning services"
        title="Careful home cleaning for established Epsom properties."
        subtitle="From regular upkeep to deeper move-in and move-out cleans, Sano helps Epsom households keep homes, townhouses, apartments, and rentals looking properly cared for."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant built
          inline (Mount Eden v4 pattern): one image, same 1.2fr / 0.8fr
          grid, 4:3 aspect, rounded-2xl + object-cover, same sizes hint.
          Two paragraphs, Mike-confirmed verbatim: property-mix sentence
          first, operational-truth sentence second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Cleaning across <span className="text-sage-500">Epsom</span></h2>
              <div className="body-text space-y-4">
                <p>
                  Epsom cleaning often comes down to presentation, access, and detail. Some homes need regular upkeep around busy household routines, while townhouses, apartments, and rentals may need more structured deep cleans, move cleans, or clear scopes before handover.
                </p>
                <p>
                  For Epsom, that means agreeing the right scope upfront, planning around access where needed, and focusing on the areas that make the home feel properly finished: kitchens, bathrooms, floors, touchpoints, skirting boards, and visible surfaces.
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

      {/* 2. Why Sano — same 4 cards as Mount Eden v5. No Epsom mentions
          in any card. 2x2 grid on desktop. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Epsom — three labelled groups covering
          all seven Sano services. HOME CLEANING LEADS (residential-led,
          matches Mount Eden); commercial sits in the secondary
          "Property and workplace" group only. Inline link lists. */}
      <SuburbServicesSection
        suburb="Epsom"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Epsom. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four Mike-confirmed
          cards matching Epsom's residential mix (Established homes /
          Townhouses / Apartments / Rentals and move cleans). Wording is
          cautious and supply-side; no claims about Sano's specific Epsom
          history, no heritage / property-value framing. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Established homes',
            body: 'Regular upkeep, detailed dusting, skirting boards, bathrooms, kitchens, and the surfaces that show everyday use.',
            icon: Home,
          },
          {
            title: 'Townhouses',
            body: 'Multi-level cleaning where stairs, bathrooms, floors, and access timing need to be planned properly.',
            icon: Layers,
          },
          {
            title: 'Apartments',
            body: 'Compact layouts, lift access, kitchens, bathrooms, glass, and shared-building timing where required.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move-in and move-out cleaning with a clear scope, practical timing, and attention to the areas owners or property managers usually check.',
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

      {/* Schema.org — matches sibling service-page convention. Auckland-
          level City areaServed, no suburb-level Place. Residential-led
          service order (commercial + post-construction last). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Epsom Cleaning Services',
            description:
              'Cleaning services across Epsom: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* Nearby areas — internal links to the nearest Central suburb pages. */}
      <NearbySuburbsSection
        suburbs={[
          { name: 'Mount Eden', href: '/service-area/mount-eden' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
        ]}
      />

      {/* CTA — single quote action, no suburb mention. */}
      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

      {/* Closing trust strip — three text links (Mount Eden / Takapuna
          / Manukau lock). SuburbChecker omitted. Sits on cream to soften
          the transition from the dark CtaBanner. */}
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
