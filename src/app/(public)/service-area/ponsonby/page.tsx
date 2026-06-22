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
 * Ponsonby service-area page — Sano's sixth suburb page, third of the
 * Stage 2 Central cluster (Grey Lynn → Kingsland → Ponsonby).
 *
 * Rollout plan: docs/superpowers/specs/2026-05-25-suburb-rollout-plan.md.
 * Standard: the Grey Lynn "local situation first, then outcome" bar — bespoke
 * hero line, intro, services line, and situation+outcome property cards (no
 * name-swap suburb copy, no surface checklists).
 *
 * Residential-led (Home cleaning leads the grouping), Mike-confirmed. Ponsonby
 * is the most commercial-AWARE of the Central pages, but commercial stays a
 * light secondary thread only: the services intro names workplace cleaning and
 * the grouped list keeps the "Property and workplace" group second — the hero,
 * intro, and cards stay residential. Hero deliberately does NOT surface
 * boutique/commercial ("homes and rentals", not "homes, rentals, and boutique
 * spaces") — Mike's explicit call so the page doesn't overreach into commercial.
 *
 * Prestige-risk is highest here. Hard traps (Mike-confirmed, do not relax):
 *   - No "careful" as a lead adjective (card 1 uses "considered" instead).
 *   - No upscale / trendy / affluent / luxury / exclusive / prestige /
 *     high-value / property-value language.
 *   - No hospitality or café-specialism claims.
 *   - No heritage-value claims, demographics, or landmark-as-proof copy.
 *   - No implied client lists.
 *
 * Deliberate departures / locks (do not change without going back to Mike):
 *   - Hero TITLE carries the suburb name — matches the Grey Lynn departure from
 *     the suburb-free titles on Mount Eden / Takapuna (suburb also in eyebrow).
 *   - "Character homes" is approved wording. NOT approved: "villas",
 *     "heritage homes", or any prestige / property-value framing.
 *   - Schema: Auckland-level City areaServed (no suburb-level Place).
 *   - SuburbChecker NOT mounted; closing trust strip: Check another suburb ·
 *     Our guarantee · FAQ.
 *   - Nearby-suburb links DEFERRED — the Central cluster retrofit happens once
 *     the cluster reaches the threshold.
 *   - Hero image: /images/heroes/regular-house-cleaning-hero.jpg; intro image:
 *     /images/herne-bay-residential.jpg (residential defaults reused; intro alt
 *     text varied so the Central pages don't all share one string).
 */

export const metadata: Metadata = {
  title: 'Ponsonby Cleaning Services | Sano',
  description:
    'Cleaning for Ponsonby character homes, apartments, and rentals: regular upkeep, deep cleans, move-in and move-out, and specialist surfaces.',
}

export default function PonsonbyServiceAreaPage() {
  return (
    <>
      {/* Hero — Mike-supplied strings. Title carries the suburb name (matches
          Grey Lynn); eyebrow also carries the suburb signal. Residential hero
          image. Hero intentionally stays homes-and-rentals only — no
          boutique/commercial surfacing (Mike's explicit call). */}
      <SubpageHero
        eyebrow="Ponsonby cleaning services"
        title="Professional cleaning for Ponsonby homes and rentals."
        subtitle="From regular upkeep to deeper move-in and move-out cleans, Sano helps Ponsonby households keep homes, townhouses, apartments, and rentals looking properly cared for."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant (Grey Lynn
          pattern). Two paragraphs, Mike-supplied verbatim: property-and-need
          angle first, how-Sano-approaches-it second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Cleaning across <span className="text-sage-500">Ponsonby</span></h2>
              <div className="body-text space-y-4">
                <p>
                  Ponsonby has a varied mix of homes, from character properties and renovated homes through to terraces, apartments, townhouses, and rentals. That means the right cleaning scope can look different depending on the property, the access, and whether it is regular upkeep, a deeper reset, or a move-related clean.
                </p>
                <p>
                  For Sano, that range is the starting point. We agree the scope upfront, plan around the access and layout each property brings, and leave the home feeling presentable, settled, and properly looked after.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/herne-bay-residential.jpg"
                alt="A well-presented residential Auckland home"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — same 4 cards as the sibling pages. No Ponsonby mentions
          in any card. 2x2 grid on desktop. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Ponsonby — three labelled groups covering all
          seven Sano services. HOME CLEANING LEADS (residential-led); commercial
          sits in the secondary "Property and workplace" group only. Services
          intro is Mike-supplied verbatim and names workplace cleaning (Ponsonby
          is the most commercial-aware Central page), but the grouping order
          keeps it secondary. Inline link lists. */}
      <SuburbServicesSection
        suburb="Ponsonby"
        lead="From regular home cleaning and deeper resets to move cleans, workplace cleaning, and specialist surfaces, the full range of Sano services is available across Ponsonby. Pick a service to read its full scope."
        groups={[HOME_CLEANING_GROUP, PROPERTY_WORKPLACE_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four Mike-supplied cards
          matching Ponsonby's mix (Character homes / Renovated homes and
          extensions / Apartments and townhouses / Rentals and move cleans).
          Situation+outcome wording; no surface checklists, no "careful" lead
          (card 1 uses "considered"), no heritage / villa / prestige framing. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Character homes',
            body: 'A considered clean for established homes where presentation, layout, and a properly finished result matter.',
            icon: Home,
          },
          {
            title: 'Renovated homes and extensions',
            body: 'Cleaning suited to updated homes, open-plan areas, and spaces that need to feel settled, tidy, and ready to use.',
            icon: BadgeCheck,
          },
          {
            title: 'Apartments and townhouses',
            body: 'Apartment and townhouse cleans are planned around the building as much as the home, working in with lift access, stair access, and the times the building allows.',
            icon: Building2,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Turnover and move cleans built around the handover date, slotted in between tenancies, and aimed at what an owner or property manager checks on inspection.',
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
          City areaServed, no suburb-level Place. Residential-led service order
          (commercial + post-construction last). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Ponsonby Cleaning Services',
            description:
              'Cleaning services across Ponsonby: regular, deep, end of tenancy, carpet, window, commercial, and post-construction.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* Nearby areas — internal links to the nearest Central suburb pages. */}
      <NearbySuburbsSection
        suburbs={[
          { name: 'Grey Lynn', href: '/service-area/grey-lynn' },
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
