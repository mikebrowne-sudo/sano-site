import type { Metadata } from 'next'
import { CtaBanner } from '@/components/CtaBanner'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { SANO_100_POINT_HOME_CLEAN } from '@/lib/checklists'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'Regular House Cleaning Auckland | Sano',
  description:
    'Reliable regular house cleaning in Auckland. We keep your home consistently clean, tidy, and easy to live in — weekly or fortnightly. Get a free quote.',
}

export default function RegularCleaningPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #170 rollout. */}
      <SubpageHero
        eyebrow="REGULAR CLEANING"
        title="Regular house cleaning in Auckland"
        subtitle="Keep your home consistently clean, tidy, and easy to live in with reliable ongoing cleaning from Sano."
        imageSrc="/images/heroes/regular-house-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano provides reliable regular house cleaning across Auckland — weekly, fortnightly, or on a schedule shaped around your home. Our team focuses on consistent, well-finished cleans that take the pressure off your weekly routine.',
          "Every visit covers kitchens, bathrooms, floors, dusting, and the touchpoints that matter most. We work methodically through your home so the standard stays the same visit to visit, without you having to follow up or re-explain priorities.",
          'Your home stays with a consistent team that knows your space. The result is a home that feels properly cared for, not just tidied.',
        ]}
        primaryImage={{
          src: '/images/cleaning-shot-2.jpeg',
          alt: 'Sano cleaner at work in an Auckland home',
        }}
        secondaryImage={{
          src: '/images/sano-auckland-team.jpeg',
          alt: 'The Sano cleaning team — Auckland locals you can trust',
        }}
      />

      {/* 2. Sano 100-Point Home Clean Checklist (existing integration
          from PR #168). Public Draft pill suppressed via
          showDraftBadge={false} while the underlying data flag
          remains as the gating signal for internal preview surfaces. */}
      <ServiceChecklist
        checklist={SANO_100_POINT_HOME_CLEAN}
        eyebrow="OUR SIGNATURE SYSTEM"
        displayHeading="The 100-Point Home Clean Checklist"
        headingHighlight="100-Point Home Clean"
        intro="See exactly what's included in our regular home cleaning. The checklist gives a clear room-by-room view of how we work, while each visit is still adjusted to suit your home."
        anchorId="home-clean-checklist"
        showDraftBadge={false}
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for your home"
      />

      {/* 3. Why Choose Sano */}
      <WhyChooseSection
        heading="Why choose Sano for regular house cleaning"
        headingHighlight="regular house cleaning"
        subtitle="Reliable people, consistent systems, and cleaning that takes the pressure off your week."
        items={[
          {
            title: 'A consistent team',
            body: 'The same trusted cleaners visit your home, so the standard stays the same.',
          },
          {
            title: 'Built around your home',
            body: 'Schedules and tasks shaped to your space, not a one-size template.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Detail-focused finish',
            body: 'Touchpoints, skirting boards, and finishing details addressed every visit.',
          },
          {
            title: 'Flexible scheduling',
            body: 'Weekly, fortnightly, or a custom routine that suits your week.',
          },
          {
            title: 'Easy to deal with',
            body: 'Clear communication, a direct line, no ticket-and-wait system.',
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your regular house clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Book your clean',
            body: 'Get in touch with your home details and the schedule that suits you.',
          },
          {
            title: 'We arrange a time',
            body: 'We set up an ongoing schedule that works around your week.',
          },
          {
            title: 'Ongoing care',
            body: 'Your trusted cleaning team visits on the agreed schedule, every time.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Regular House Cleaning',
            description:
              'Reliable regular house cleaning in Auckland. Weekly or fortnightly visits by vetted cleaners.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to make things easier?"
        subtext="If you're after consistent, reliable house cleaning, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
