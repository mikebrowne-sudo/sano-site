import type { Metadata } from 'next'
import { Building2, DoorOpen, Frame, Home, PanelTop, PlusCircle, Sparkles, Square, Sun } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { AreasWeServeSection } from '../_components/AreasWeServeSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhatWeCoverSection } from '../_components/WhatWeCoverSection'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'Window Cleaning Auckland | Sano',
  description:
    'Professional window cleaning in Auckland. Streak-free glass, frames, and sills for residential and commercial properties. Get a free quote from Sano.',
}

export default function WindowCleaningPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #174 rollout. */}
      <SubpageHero
        eyebrow="WINDOW CLEANING"
        title="Window cleaning for clearer, brighter spaces"
        subtitle="Interior and exterior window cleaning for homes and workplaces, carried out with care and attention to detail."
        imageSrc="/images/heroes/window-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano window cleaning covers internal and external glass across Auckland homes, offices, and commercial spaces. We work methodically through windows, frames, sills, and tracks so the whole opening is finished — not just the glass.',
          'Each clean is shaped to the property and how the windows are used. Build-up from weather, dust, and everyday wear is addressed, leaving glass with a streak-free finish that lifts the feel of the space.',
          'For commercial properties we work around your operating hours so cleaning fits around staff and customers, not the other way around.',
        ]}
        primaryImage={{
          src: '/images/window-cleaning.jpg',
          alt: 'Sano cleaner finishing exterior windows on an Auckland property',
        }}
        secondaryImage={{
          src: '/images/cleaned-by-sano.jpg',
          alt: 'A bright, naturally-lit interior after a Sano window clean',
        }}
      />

      {/* 3. Why Choose Sano */}
      <WhyChooseSection
        heading="Why choose Sano for window cleaning"
        headingHighlight="window cleaning"
        subtitle="A clean that finishes the whole window opening — glass, frame, sill, and track."
        items={[
          {
            title: 'Streak-free finish',
            body: 'Clear, even results across glass and across the whole property.',
          },
          {
            title: 'Internal and external',
            body: 'Both sides of accessible windows handled in the same visit.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Frames, sills, and tracks',
            body: 'Detail beyond just the glass, so the whole opening looks finished.',
          },
          {
            title: 'Residential and commercial',
            body: 'Homes, offices, retail, and commercial properties across Auckland.',
          },
          {
            title: 'Considered scheduling',
            body: "Cleaning planned around your day or your business's operating hours.",
          },
        ]}
      />

      {/* 4. What We Cover */}
      <WhatWeCoverSection
        subtitle="From glass and frames to tracks and partitions — the whole window opening, finished."
        items={[
          {
            title: 'Internal glass',
            body: 'Streak-free interior windows across the property.',
            icon: Home,
          },
          {
            title: 'External glass',
            body: 'Exterior windows where safely accessible.',
            icon: Sun,
          },
          {
            title: 'Sliding doors',
            body: 'Glass doors and panels cleaned both sides.',
            icon: DoorOpen,
          },
          {
            title: 'Frames',
            body: 'Window frames wiped and finished alongside the glass.',
            icon: Frame,
          },
          {
            title: 'Sills',
            body: 'Internal and external sills cleared of dust and debris.',
            icon: PanelTop,
          },
          {
            title: 'Tracks',
            body: 'Window and door tracks detailed where needed.',
            icon: Square,
          },
          {
            title: 'Internal partitions',
            body: 'Office and shared-space glass cleaned for a clear finish.',
            icon: Building2,
          },
          {
            title: 'High-traffic areas',
            body: 'Reception, entries, and most-used windows refreshed.',
            icon: Sparkles,
          },
          {
            title: 'Tailored scope',
            body: 'Specific glass surfaces or requirements on request.',
            icon: PlusCircle,
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your window clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Tell us about the property and the windows you need cleaned.',
          },
          {
            title: 'We arrange a time',
            body: 'Scheduled at a time that suits your day or your operating hours.',
          },
          {
            title: 'Clearer windows',
            body: 'Glass and frames cleaned to a streak-free, finished result.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Window Cleaning',
            description:
              'Window cleaning in Auckland. Streak-free glass, frames, sills, and tracks for residential and commercial properties.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <AreasWeServeSection />
      <CtaBanner
        headline="Ready for clearer, brighter windows?"
        subtext="Get in touch with property details and we'll come back with a clear, practical quote."
      />
    </>
  )
}
