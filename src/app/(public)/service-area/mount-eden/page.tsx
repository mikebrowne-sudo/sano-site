import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardCheck, Home, Sparkles } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { ServiceInformation } from '../../services/_components/ServiceInformation'
import { WhatWeCoverSection } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'

/**
 * Mount Eden service-area page — Sano's first suburb pilot.
 *
 * Spec: docs/superpowers/specs/2026-05-25-mount-eden-suburb-pilot.md
 *
 * v2 (post visual review):
 *   - Reduced "Mount Eden" repetition across hero + body
 *   - Hero refined to read less suburb-name-swap-y
 *   - Services section expanded: 3 primary residential cards +
 *     "Also available" secondary inline list for commercial, carpet,
 *     window, post-construction (so we don't imply Sano only offers
 *     three services in this area)
 *   - WhyChooseSection trimmed to 4 stronger cards, no Mount Eden
 *     mentions, audience-relevant across home / rental / workplace /
 *     handover
 *   - Booking + CTA headings genericised
 *
 * Decisions locked by the spec (do not change without going back to Mike):
 *   - Route: /service-area/mount-eden
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - Component order: SubpageHero -> ServiceInformation ->
 *     WhatWeCoverSection -> WhyChooseSection -> BookingStepsSection ->
 *     CtaBanner. No new shared components.
 *   - SuburbChecker NOT mounted; closing text link "Check another
 *     suburb" routes back to /service-area.
 *   - Nearby-suburb links deferred until >= 3 sibling pages exist.
 *   - No Mount-Eden-specific local claims beyond "sits inside Sano's
 *     normal Auckland service area" (Mike's operational truth).
 */

export const metadata: Metadata = {
  title: 'Mount Eden Cleaning Services | Sano',
  description:
    'Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals. Sano helps prepare properties for everyday living, inspections, and handovers.',
}

export default function MountEdenServiceAreaPage() {
  return (
    <>
      {/* Hero — refined wording: one suburb mention in the subtitle,
          title is service-led not suburb-led. */}
      <SubpageHero
        eyebrow="Mount Eden cleaning services"
        title="Cleaning help for homes, rentals, and handovers."
        subtitle="Sano provides regular cleaning, deeper one-off cleans, and property handover cleaning across Mount Eden, with clear scopes and a simple quote process."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / Why Sano — opens with the coverage statement
          (Mike's operational truth) then pivots to how the process
          works. Two paragraphs, suburb named once. */}
      <ServiceInformation
        title="Sano in Mount Eden"
        body={[
          "Mount Eden is within Sano's Auckland service area, which means you can book the same careful cleaners, clear scopes, and practical quote process available across the wider city.",
          'Whether it is a regular home clean, a deeper reset, or a property being prepared for handover, we will help match the scope to what the property actually needs, and come back with a quote you can act on.',
        ]}
        primaryImage={{
          src: '/images/herne-bay-residential.jpg',
          alt: 'A residential Auckland home cared for by Sano',
        }}
        secondaryImage={{
          src: '/images/sano-auckland-team.jpeg',
          alt: 'The Sano cleaning team',
        }}
      />

      {/* 2. Services available in Mount Eden — three primary
          residential cards (Mike's confirmed order), followed by a
          compact "Also available" inline list for commercial,
          carpet, window, and post-construction. All seven services
          have real existing service pages — the inline list links
          to them so we don't imply Sano only offers three. */}
      <WhatWeCoverSection
        eyebrow="WHAT WE COVER"
        heading="Services available in Mount Eden"
        headingHighlight="Mount Eden"
        subtitle="For homes and rentals, three Sano services cover most needs. Other Sano services are available in the area where required."
        items={[
          {
            title: 'Regular house cleaning',
            body: 'Weekly, fortnightly, or a schedule shaped around the home. Kitchens, bathrooms, floors, dusting, and touchpoints, on a repeat visit you can rely on.',
            icon: Home,
          },
          {
            title: 'Deep cleaning',
            body: 'One-off reset with focused attention on build-up, corners, and the detail areas everyday cleaning skips.',
            icon: Sparkles,
          },
          {
            title: 'End of tenancy cleaning',
            body: 'Detailed clean for tenants, owners, or property managers preparing a property for inspection or handover.',
            icon: ClipboardCheck,
          },
        ]}
      />

      {/* Read-more router for the three primary services. Same cream
          band as WhatWeCoverSection, zero-padded on top so it reads
          as a continuation. */}
      <section className="section-padding bg-[#faf9f6] pt-0 pb-6">
        <div className="container-max text-center">
          <p className="text-[0.875rem] text-sage-600">
            Read more:{' '}
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
      </section>

      {/* "Also available" — secondary services that exist on the Sano
          site and can be booked in the area, presented as a single
          inline link list (lighter than another card grid). Sits on
          the same cream band, separated by a thin sage hairline. */}
      <section className="section-padding bg-[#faf9f6] pt-2 pb-10 lg:pb-12">
        <div className="container-max">
          <div className="mx-auto max-w-3xl border-t border-sage-100 pt-6 text-center">
            <p className="text-[0.875rem] text-sage-600">
              Also available:{' '}
              <Link
                href="/services/commercial-cleaning"
                className="font-semibold text-sage-500 underline-offset-4 hover:underline"
              >
                Commercial and office cleaning
              </Link>
              {' · '}
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
              {' · '}
              <Link
                href="/services/post-construction"
                className="font-semibold text-sage-500 underline-offset-4 hover:underline"
              >
                Post-construction cleaning
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* 3. Why choose Sano — trimmed to 4 stronger cards, no
          Mount Eden mentions, audience-relevant across home /
          rental / workplace / handover. */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="Careful people, clear scopes, and finishing details that get the same attention as the obvious surfaces."
        items={[
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Clear scopes and quotes',
            body: 'Scope and pricing agreed upfront, so the work and the price match.',
          },
          {
            title: 'Detail-focused finish',
            body: 'Touchpoints, skirting boards, and finishing details get the same care as the obvious surfaces.',
          },
          {
            title: 'Easy to deal with',
            body: 'A direct line for questions or changes. No ticket-and-wait system.',
          },
        ]}
      />

      {/* 4. Booking steps — generic to all services. */}
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
          Description updated to reflect the broader service catalogue
          surfaced on the page. */}
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

      {/* "Check another suburb" — the only routing affordance back
          to the parent /service-area page. SuburbChecker
          intentionally omitted on the pilot per spec §5. Sits on
          cream to soften the transition from the dark CtaBanner. */}
      <section className="bg-[#faf9f6] py-6 text-center">
        <p className="text-[0.875rem] text-sage-600">
          <Link
            href="/service-area"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            Check another suburb
          </Link>
        </p>
      </section>
    </>
  )
}
