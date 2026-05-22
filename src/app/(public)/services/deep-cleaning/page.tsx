import type { Metadata } from 'next'
import { CtaBanner } from '@/components/CtaBanner'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { SANO_DEEP_CLEAN_DETAIL } from '@/lib/checklists'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'Deep Cleaning Services Auckland | Sano',
  description:
    'Professional deep cleaning in Auckland. A full top-to-bottom clean that tackles build-up and the areas most people miss. Get a free quote from Sano.',
}

export default function DeepCleaningPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #171 rollout. */}
      <SubpageHero
        eyebrow="DEEP CLEANING"
        title="Deep cleaning for homes that need a proper reset"
        subtitle="A more detailed clean for kitchens, bathrooms, living areas, and the spaces that need extra attention."
        imageSrc="/images/heroes/deep-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano deep cleaning is a more detailed, top-to-bottom clean for Auckland homes that need extra attention. We go further than a regular clean — addressing build-up, dust, grease, and the harder-to-reach areas that everyday cleaning misses.',
          'Each deep clean is shaped around the condition of your home and what needs the most work. Kitchens, bathrooms, living areas, skirting boards, switches, and detailed touchpoints all get focused attention, with time allowed to do the job properly.',
          "Most homes book a deep clean before guests arrive, between regular cleans, after a break in cleaning, or as a seasonal reset. Whatever the trigger, the goal is the same: a home that feels properly reset, not just tidied.",
        ]}
        primaryImage={{
          src: '/images/deep-cleaning.jpg',
          alt: 'Sano deep cleaning a kitchen surface in detail',
        }}
        secondaryImage={{
          src: '/images/cleaned-by-sano.jpg',
          alt: 'A home freshly reset by the Sano deep clean team',
        }}
      />

      {/* 2. Sano Deep Clean Checklist. Public Draft pill suppressed
          (same pattern as Regular Cleaning's 100-Point integration). */}
      <ServiceChecklist
        checklist={SANO_DEEP_CLEAN_DETAIL}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="Sano Deep Clean Checklist"
        headingHighlight="Deep Clean"
        intro="Click on each area to see exactly what's included in a Sano deep clean. The checklist is shaped to your home — your quote confirms what will be covered in your booked clean."
        anchorId="deep-clean-checklist"
        showDraftBadge={false}
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for a deep clean"
      />

      {/* 3. Why Choose Sano */}
      <WhyChooseSection
        heading="Why choose Sano for deep cleaning"
        headingHighlight="deep cleaning"
        subtitle="Detail-focused work, careful people, and a real reset for the spaces that need it most."
        items={[
          {
            title: 'Detail-focused approach',
            body: 'Build-up and overlooked areas are addressed properly, not just surface-cleaned.',
          },
          {
            title: 'Trained cleaning teams',
            body: 'Experienced with full-home resets, not just routine maintenance cleaning.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Higher standard than maintenance',
            body: 'Goes well beyond what a regular clean is scoped to cover.',
          },
          {
            title: 'Tailored scope',
            body: 'The clean is shaped to the condition of your home and the areas that need most work.',
          },
          {
            title: 'Clear, fixed quotes',
            body: 'You know what is covered and what it costs before we begin.',
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your deep clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Book your deep clean',
            body: 'Tell us about your home and the areas that need the most attention.',
          },
          {
            title: 'We arrange a time',
            body: 'Scheduled at a time that works around your week and your home.',
          },
          {
            title: 'Detailed reset',
            body: 'Our team carries out the full deep clean, with time allowed to do it properly.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Deep Cleaning',
            description:
              'Professional deep cleaning in Auckland. A full top-to-bottom clean that addresses build-up and detail.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready for a proper reset?"
        subtext="If your home needs more than a regular tidy, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
