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
 * Decisions locked by the spec (do not change without going back to Mike):
 *   - Route: /service-area/mount-eden
 *   - Schema: Auckland-level City areaServed (no suburb-level Place)
 *   - Component order: SubpageHero -> ServiceInformation ->
 *     WhatWeCoverSection -> WhyChooseSection -> BookingStepsSection ->
 *     CtaBanner. No new shared components on the pilot.
 *   - SuburbChecker is intentionally NOT mounted; a single text link
 *     "Check another suburb" routes back to /service-area below the CTA.
 *   - Nearby-suburb links are deferred until >= 3 sibling suburb
 *     pages exist in the same region.
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
      {/* SubpageHero — approved strings from the pilot spec (locked). */}
      <SubpageHero
        eyebrow="Mount Eden cleaning services"
        title="Mount Eden cleaning for homes, rentals, and move-outs."
        subtitle="Whether you need a recurring clean, a deeper reset, or a property prepared for handover, Sano keeps the scope clear and the process simple."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information — three paragraphs grounded only in
          Mike's operational-truth sentence. No demographics, no local
          history, no landmarks, no claimed local familiarity. */}
      <ServiceInformation
        title="Cleaning across Mount Eden"
        body={[
          "Mount Eden sits inside Sano's normal Auckland service area, so the same team and the same standards apply to a Mount Eden property as anywhere else we work.",
          'This page brings together the three Sano services covered for Mount Eden homes and rentals: regular house cleaning, one-off deep cleans, and end of tenancy cleans for handovers. Each links through to its full service page.',
          'If you want a quote for a Mount Eden property, the fastest way is to send through the details and the timing that suits you.',
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

      {/* 2. What we cover in Mount Eden — three cards in Mike's
          confirmed order: regular, deep, end-of-tenancy. The shared
          WhatWeCoverSection does not render per-card links, so a
          small inline text-link row below provides the routing the
          spec calls for without modifying the shared component. */}
      <WhatWeCoverSection
        eyebrow="WHAT WE COVER"
        heading="Three Mount Eden services"
        headingHighlight="Mount Eden"
        subtitle="The three Sano services covered for Mount Eden homes and rentals."
        items={[
          {
            title: 'Regular house cleaning',
            body: 'Weekly, fortnightly, or a schedule shaped around your home. Kitchens, bathrooms, floors, dusting, and the touchpoints that matter, on a repeat visit you can rely on.',
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

      {/* Inline router to the three service pages. Kept compact and
          on the same cream surface as WhatWeCoverSection so it reads
          as a continuation of the cards above. */}
      <section className="section-padding bg-[#faf9f6] pt-0 pb-10 lg:pb-12">
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

      {/* 3. Why Choose Sano — trust messaging matching sibling
          service pages. No Mount-Eden-specific claims beyond the
          coverage statement, which is Mike-confirmed. */}
      <WhyChooseSection
        heading="Why choose Sano for cleaning in Mount Eden"
        headingHighlight="Mount Eden"
        subtitle="Reliable people, consistent systems, and cleaning that holds the same standard across every job."
        items={[
          {
            title: 'A consistent team',
            body: 'The same trusted cleaners across visits, so the standard stays the same.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Clear quotes',
            body: 'Scope and pricing agreed upfront before the work starts.',
          },
          {
            title: 'Detail-focused finish',
            body: 'Touchpoints, skirting boards, and finishing details get the same care as the obvious surfaces.',
          },
          {
            title: 'Easy to deal with',
            body: 'A direct line for questions or changes. No ticket-and-wait system.',
          },
          {
            title: 'Auckland-wide service',
            body: 'Mount Eden sits inside our normal coverage area, so scheduling is straightforward.',
          },
        ]}
      />

      {/* 4. Booking steps — generic to all three services. */}
      <BookingStepsSection
        heading="Book a Mount Eden clean in 3 simple steps"
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
          Auckland-level areaServed, no suburb-level Place. The
          suburb signal lives in the URL slug, title tag, and H1. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Mount Eden Cleaning Services',
            description:
              'Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* Closing CTA — single Get a Free Quote, "Mount Eden" framing,
          no fake local language. */}
      <CtaBanner
        headline="Get a Mount Eden cleaning quote"
        subtext="Send through the property details and the service you need. We come back with a clear, practical quote."
      />

      {/* "Check another suburb" — the only routing affordance back to
          the parent /service-area page. SuburbChecker intentionally
          omitted on the pilot per spec §5. Sits on cream to soften
          the transition from the dark CtaBanner above. */}
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
