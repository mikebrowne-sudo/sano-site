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
 * Grey Lynn service-area page — Sano's fifth suburb page, first of the
 * Stage 2 Central cluster (Grey Lynn → Kingsland → Ponsonby).
 *
 * Rollout plan: docs/superpowers/specs/2026-05-25-suburb-rollout-plan.md.
 * Standard: the Epsom "stronger local angle" bar — bespoke hero line, intro,
 * services line, and sharpened property cards (no name-swap suburb copy).
 *
 * Residential-led (Home cleaning leads the grouping). Content logic is
 * "local situation first, then outcome" — the intro describes Grey Lynn's
 * property mix and the cleaning context (Mike-supplied verbatim), and the
 * four property-type card bodies talk about the cleaning SITUATION and how
 * the home should feel afterwards (presentable, settled, properly looked
 * after, ready to hand over) rather than reciting surface checklists. Card
 * titles are Mike-confirmed. Commercial stays a light, secondary reference
 * (grouped services list only).
 *
 * Deliberate departures / locks (do not change without going back to Mike):
 *   - Hero TITLE carries the suburb name ("…Grey Lynn character homes…") —
 *     an intentional, Mike-confirmed departure from the suburb-free titles on
 *     Mount Eden / Takapuna (suburb signal still also in the eyebrow).
 *   - "Character homes" is approved wording. NOT approved: "heritage homes",
 *     "villas", or any prestige / property-value / affluent / trendy /
 *     gentrified / demographic / school-zone framing, or landmarks-as-proof.
 *   - "Premium" is internal framing only and must never appear in copy.
 *   - Schema: Auckland-level City areaServed (no suburb-level Place).
 *   - SuburbChecker NOT mounted; closing trust strip: Check another suburb ·
 *     Our guarantee · FAQ.
 *   - Nearby-suburb links DEFERRED — the Central cluster retrofit happens
 *     after Kingsland + Ponsonby ship.
 *   - Hero image: /images/heroes/regular-house-cleaning-hero.jpg; intro
 *     image: /images/herne-bay-residential.jpg (residential defaults reused;
 *     intro alt text varied so the Central pages don't all share one string).
 */

export const metadata: Metadata = {
  title: 'Grey Lynn Cleaning Services | Sano',
  description:
    'Cleaning for Grey Lynn character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function GreyLynnServiceAreaPage() {
  return (
    <>
      {/* Hero — Mike-supplied strings. Title intentionally carries the
          suburb name (confirmed departure from the suburb-free titles on
          Mount Eden / Takapuna); eyebrow also carries the suburb signal.
          Residential hero image. */}
      <SubpageHero
        eyebrow="Grey Lynn cleaning services"
        title="Professional cleaning for Grey Lynn homes and rentals."
        subtitle="From regular upkeep to deeper move-in and move-out cleans, Sano helps Grey Lynn households keep homes, townhouses, apartments, and rentals looking properly cared for."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant built
          inline (Mount Eden v4 / Epsom pattern). Two paragraphs,
          Mike-supplied verbatim: property-and-need angle first,
          how-Sano-approaches-it second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Cleaning across <span className="text-sage-500">Grey Lynn</span></h2>
              <div className="body-text space-y-4">
                <p>
                  Grey Lynn has a real mix of homes, from character properties and renovated family homes through to apartments, townhouses, and rentals. That means the right cleaning scope can look different depending on the property, the access, and whether it is regular upkeep, a deeper reset, or a move-related clean.
                </p>
                <p>
                  For Sano, the focus is on agreeing the scope upfront, working around the property layout where needed, and leaving the home feeling presentable, settled, and properly looked after.
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

      {/* 2. Why Sano — same 4 cards as the sibling pages. No Grey Lynn
          mentions in any card. 2x2 grid on desktop. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Grey Lynn — three labelled groups covering
          all seven Sano services. HOME CLEANING LEADS (residential-led);
          commercial sits in the secondary "Property and workplace" group
          only. Services intro is Mike-supplied verbatim. Inline link lists. */}
      <SuburbServicesSection
        suburb="Grey Lynn"
        lead="From regular home cleaning and deeper resets to move cleans and specialist surfaces, the full range of Sano services is available across Grey Lynn. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four Mike-supplied cards
          matching Grey Lynn's mix (Character homes / Renovated homes and
          extensions / Apartments and townhouses / Rentals and move cleans).
          "Renovated homes and extensions" is new vs the sibling pages.
          Cautious, supply-side wording; no Sano-specific local history, no
          heritage / villa / prestige framing. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Character homes',
            body: 'Older homes that reward an unhurried, considered clean, so the detail is respected and the place is left feeling settled and properly looked after.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Newer finishes and open-plan spaces where the aim is a clean, finished result that lets the renovation feel complete and ready to enjoy.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartments and townhouses come with their own access and timing, from lifts and stairs to building schedules, so the clean is planned to fit the building as much as the home.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Move and turnover cleans planned around the handover, timed to fit between tenancies and focused on what an owner or property manager will be looking for.',
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

      {/* Schema.org — matches sibling service-page convention. Auckland-level
          City areaServed, no suburb-level Place. Residential-led service
          order (commercial + post-construction last). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Grey Lynn Cleaning Services',
            description:
              'Cleaning services across Grey Lynn: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* Nearby areas — internal links to the nearest Central suburb pages. */}
      <NearbySuburbsSection
        suburbs={[
          { name: 'Ponsonby', href: '/service-area/ponsonby' },
          { name: 'Kingsland', href: '/service-area/kingsland' },
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
