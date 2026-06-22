import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Briefcase, Hammer, Home, Store } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { WhatWeCoverSection } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'

/**
 * Manukau service-area page — Sano's third suburb page.
 *
 * Spec: docs/superpowers/specs/2026-05-26-manukau-suburb.md
 * Builds on: Takapuna spec (closest structural template — property +
 * workplace-led grouping) + Mount Eden pilot spec §11 (canonical pattern).
 *
 * Manukau tests whether the pattern flexes for a commercial-foregrounded
 * mix in a third region (South Auckland). Manukau is South Auckland's
 * commercial and civic centre rather than a conventional residential
 * suburb, so commercial and office cleaning leads the service emphasis,
 * post-construction is meaningfully weighted, and residential is genuinely
 * secondary — without overclaiming commercial dominance or asserting any
 * Manukau-specific history.
 *
 * Decisions locked by the spec (do not change without going back to Mike):
 *   - Route: /service-area/manukau (Manukau SUBURB, postcode 2104 — NOT
 *     the wider Manukau region / South Auckland)
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - Hero strings (eyebrow / title / suburb-free subtitle) per spec §3
 *   - Service grouping order: Property + workplace LEADS (matches Takapuna)
 *   - Property-type cards: Offices and workplaces / Retail and customer-
 *     facing spaces / Family homes and rentals / Post-construction and
 *     fit-outs (Retail + Post-construction are new vs Mount Eden / Takapuna)
 *   - SuburbChecker NOT mounted; closing trust strip has three text links:
 *     Check another suburb · Our guarantee · FAQ
 *   - Nearby-suburb links DEFERRED (first South Auckland page; retrofit
 *     when ≥3 sibling pages exist)
 *   - Hero image: /images/heroes/commercial-office-cleaning-hero.jpg
 *     (commercial-led swap so the page's visual identity matches its lead)
 *   - Intro image: /images/sano-commercial-clean-auckland.jpeg
 *     (commercial-flavoured Auckland shot — better fit than the residential
 *     default used on Mount Eden + Takapuna)
 *   - Meta description uses the trimmed under-155-char variant from spec §3
 *
 * No Manukau-specific local claims beyond Mike's confirmed operational-
 * truth + property-mix sentences. No demographic / socioeconomic / property-
 * value framing ("affordable", "growing area", "family-focused community").
 * No "South Auckland specialist", "second CBD", airport-proximity, or
 * retail / hospitality specialism framing. No named landmarks as proof.
 */

export const metadata: Metadata = {
  title: 'Manukau Cleaning Services | Sano',
  description:
    'Cleaning for Manukau offices, homes, rentals, and commercial spaces. Sano matches the scope to workplaces, handovers, and regular upkeep.',
}

export default function ManukauServiceAreaPage() {
  return (
    <>
      {/* Hero — approved §3 strings, suburb-free title + subtitle.
          Eyebrow carries the suburb signal. Commercial-office hero
          image so the visual identity matches the commercial lead. */}
      <SubpageHero
        eyebrow="Manukau cleaning services"
        title="Cleaning for offices, homes, and workplaces."
        subtitle="From offices and family homes to retail spaces, rentals, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean."
        imageSrc="/images/heroes/commercial-office-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant built
          inline (Mount Eden v5 / Takapuna pattern). One image, same
          sizing/proportion/treatment as the shared ServiceInformation
          component. Commercial-flavoured intro image to match the lead.
          Two paragraphs verbatim from Mike-confirmed spec §5 row 2:
          property-mix sentence first, operational-truth sentence second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">Cleaning across Manukau</h2>
              <div className="body-text space-y-4">
                <p>
                  Manukau has a mix of offices, retail spaces, commercial premises, family homes, rentals, and properties being prepared for handover, so cleaning needs can range from workplace presentation and post-construction through to regular upkeep and inspection-ready cleans.
                </p>
                <p>
                  Manukau is within Sano&apos;s Auckland service area, with the same careful cleaners, clear scopes, and practical quote process available across the wider city.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/sano-commercial-clean-auckland.jpeg"
                alt="Sano commercial cleaning across Auckland workplaces"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — same 4 cards as Mount Eden v5 / Takapuna. No
          Manukau mentions in any card. 2x2 grid on desktop. */}
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

      {/* 3. Services available in Manukau — three labelled groups
          covering all seven Sano services. PROPERTY + WORKPLACE LEADS
          the order per Mike's smaller-call lock (matches Takapuna,
          warranted further by Manukau's commercial weighting). Inline
          link lists (not card grids). */}
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
              Services available in <span className="text-sage-500">Manukau</span>
            </h2>
            <p className="mt-3 body-text">
              From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-6">
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

      {/* 4. Cleaning needs vary by property type — four Manukau-specific
          cards reflecting the commercial-heavy mix. Offices promoted to
          card #1; Retail and Post-construction are new vs Mount Eden +
          Takapuna; Family homes + rentals combined into one card. Wording
          is cautious + supply-side; no claims about Sano's specific
          Manukau history with these property types, and no retail /
          hospitality specialism claim. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Offices and workplaces',
            body: 'Regular presentation, shared amenities, touchpoints, and cleaning that works around the business.',
            icon: Briefcase,
          },
          {
            title: 'Retail and customer-facing spaces',
            body: 'Front-of-house finish, frequent touchpoints, and timing that fits around customers and trading hours.',
            icon: Store,
          },
          {
            title: 'Family homes and rentals',
            body: 'Regular upkeep, inspection-ready handovers, and finishing details that help maintain a household standard.',
            icon: Home,
          },
          {
            title: 'Post-construction and fit-outs',
            body: 'Builders dust, fine surfaces, glass, and the final detail pass before a space opens or hands back.',
            icon: Hammer,
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
          level City areaServed, no suburb-level Place. Description leads
          with commercial + post-construction per the lead-service order. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Manukau Cleaning Services',
            description:
              'Cleaning services across Manukau: commercial, post-construction, end of tenancy, window, regular, deep, and carpet.',
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

      {/* Closing trust strip — three text links per Mount Eden v3 final +
          Takapuna spec §7 lock. SuburbChecker intentionally omitted per
          pilot decision. Sits on cream to soften the transition from the
          dark CtaBanner. */}
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
