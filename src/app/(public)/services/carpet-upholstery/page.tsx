import type { Metadata } from 'next'
import { Armchair, Brush, Droplet, Footprints, PlusCircle, Sofa, Sparkles, Square, Wind } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { AreasWeServeSection } from '../_components/AreasWeServeSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhatWeCoverSection } from '../_components/WhatWeCoverSection'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'Carpet & Upholstery Cleaning Auckland | Sano',
  description:
    'Professional carpet and upholstery cleaning in Auckland. Remove built-up dirt, stains, and odours from carpets and furniture. Free quote from Sano.',
}

export default function CarpetUpholsteryPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #174 rollout. */}
      <SubpageHero
        eyebrow="CARPET & UPHOLSTERY CLEANING"
        title="Carpet and upholstery cleaning across Auckland"
        subtitle="Freshen up carpets, rugs, sofas, and fabric surfaces with careful cleaning from the Sano team."
        imageSrc="/images/heroes/carpet-upholstery-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano carpet and upholstery cleaning refreshes the soft surfaces that everyday cleaning struggles with — carpets, rugs, sofas, chairs, and other fabric furniture across Auckland homes and workplaces.',
          'We treat each surface based on the material and the level of wear. Build-up, common stains, and high-traffic areas all get focused attention, with care taken around colours and finishes.',
          'The result is a more even, refreshed finish that helps your carpets and furniture look and feel like themselves again, without the cost of replacement.',
        ]}
        primaryImage={{
          src: '/images/carpet-upholstery.jpg',
          alt: 'Carpet cleaning in progress in an Auckland home',
        }}
        secondaryImage={{
          src: '/images/cleaned-by-sano.jpg',
          alt: 'A living space refreshed by Sano carpet and upholstery cleaning',
        }}
      />

      {/* 3. Why Choose Sano (no checklist on this page — sits directly
          after Service Information). */}
      <WhyChooseSection
        heading="Why choose Sano for carpet and upholstery cleaning"
        headingHighlight="carpet and upholstery cleaning"
        subtitle="Careful methods, considered timing, and a refreshed finish across soft surfaces."
        items={[
          {
            title: 'Careful with fabrics',
            body: 'Methods chosen to suit the material and finish.',
          },
          {
            title: 'Stain treatment',
            body: 'Common stains and high-use areas addressed with focused attention.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Refresh without replacement',
            body: 'Extends the life of carpets and furniture without the cost of new.',
          },
          {
            title: 'Auckland-wide service',
            body: 'Residential and commercial spaces covered across the city.',
          },
          {
            title: 'Practical timing',
            body: 'Drying time considered around your day, not the other way around.',
          },
        ]}
      />

      {/* 4. What We Cover — only on non-checklist service pages. */}
      <WhatWeCoverSection
        subtitle="Soft surfaces and detail areas that everyday cleaning struggles with."
        items={[
          {
            title: 'Carpets',
            body: 'Whole-room and high-traffic carpet cleaning across the home.',
            icon: Footprints,
          },
          {
            title: 'Rugs',
            body: 'Loose rugs handled carefully on-site with care for fibres.',
            icon: Square,
          },
          {
            title: 'Sofas and lounges',
            body: 'Fabric upholstery refreshed across cushions, backs, and arms.',
            icon: Sofa,
          },
          {
            title: 'Chairs and stools',
            body: 'Fabric seating, dining chairs, and back panels detailed.',
            icon: Armchair,
          },
          {
            title: 'Stain treatment',
            body: 'Treatment of common stains and marks where practical.',
            icon: Droplet,
          },
          {
            title: 'Odour reduction',
            body: 'Trapped odours addressed where possible during cleaning.',
            icon: Wind,
          },
          {
            title: 'High-traffic areas',
            body: 'Concentrated treatment where wear and build-up show.',
            icon: Sparkles,
          },
          {
            title: 'Edge and corner detail',
            body: 'Areas that regular cleaning routines tend to miss.',
            icon: Brush,
          },
          {
            title: 'Tailored scope',
            body: 'Specific surfaces and requirements on request, agreed upfront.',
            icon: PlusCircle,
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your carpet and upholstery clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Tell us what needs cleaning and when it suits you.',
          },
          {
            title: 'We arrange a time',
            body: 'Scheduled at a time that works around your day.',
          },
          {
            title: 'Refreshed result',
            body: 'Carpets and fabrics cleaned and finished — spaces feel cared for again.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Carpet & Upholstery Cleaning',
            description:
              'Carpet and upholstery cleaning in Auckland. Careful cleaning for carpets, rugs, sofas, and fabric surfaces.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <AreasWeServeSection />
      <CtaBanner
        headline="Ready to refresh your soft surfaces?"
        subtext="Get in touch with what needs cleaning and we'll come back with a clear, practical quote."
      />
    </>
  )
}
