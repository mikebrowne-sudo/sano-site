import type { Metadata } from 'next'
import { Bath, BadgeCheck, ChefHat, Footprints, HardHat, PaintRoller, PanelTop, PlusCircle, Trash2 } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhatWeCoverSection } from '../_components/WhatWeCoverSection'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'Post-Construction Cleaning Auckland | Sano',
  description:
    'Post-construction cleaning in Auckland. We clear dust, debris, and residue so your space is clean, safe, and ready to use. Free quote from Sano.',
}

export default function PostConstructionPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #174 rollout. */}
      <SubpageHero
        eyebrow="POST-CONSTRUCTION CLEANING"
        title="Post-construction cleaning for finished spaces"
        subtitle="Detailed cleaning for renovations, new builds, and handovers, helping spaces feel ready to use."
        imageSrc="/images/heroes/post-construction-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano post-construction cleaning handles the final clean after renovations, new builds, fit-outs, and trade work across Auckland. We clear dust, debris, and residue from every surface so the space is ready for handover, photography, or move-in.',
          'Each project is shaped to its own scope — the volume of dust, the trades involved, and the deadline you are working to. Floors, glass, kitchens, bathrooms, skirting, and detail areas are all addressed in a methodical pass through the space.',
          'For builders and developers, the goal is an inspection-ready finish that lifts the impression of the finished work. For homeowners completing a renovation, it is a clean reset before you live in the space.',
        ]}
        primaryImage={{
          src: '/images/post-construction.jpg',
          alt: 'A space being detail-cleaned after construction work',
        }}
        secondaryImage={{
          src: '/images/cleaned-by-sano.jpg',
          alt: 'A finished space ready for handover after Sano post-construction cleaning',
        }}
      />

      {/* 3. Why Choose Sano */}
      <WhyChooseSection
        heading="Why choose Sano for post-construction cleaning"
        headingHighlight="post-construction cleaning"
        subtitle="Builder-friendly scheduling, heavy-duty cleaning, and an inspection-ready finish."
        items={[
          {
            title: 'Builder-friendly',
            body: 'Reliable for handover deadlines and tight project timelines.',
          },
          {
            title: 'Heavy-duty cleaning',
            body: 'Dust, debris, and residue removed properly, not just surface-wiped.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Detail across surfaces',
            body: 'Floors, internal glass, kitchens, bathrooms, and detail areas all covered.',
          },
          {
            title: 'Inspection-ready finish',
            body: 'Spaces prepared for handover, photography, or first occupation.',
          },
          {
            title: 'Tailored to project scope',
            body: 'Big or small, full builds or single renovations — agreed upfront.',
          },
        ]}
      />

      {/* 4. What We Cover */}
      <WhatWeCoverSection
        subtitle="The final detail pass — from dust removal to inspection-ready finish."
        items={[
          {
            title: 'Dust removal',
            body: 'From every surface, including hard-to-reach areas and detail edges.',
            icon: HardHat,
          },
          {
            title: 'Floor finishing',
            body: 'Vacuumed, mopped, and detailed across hard and soft surfaces.',
            icon: PaintRoller,
          },
          {
            title: 'Internal glass',
            body: 'Windows, doors, partitions cleaned both sides where accessible.',
            icon: PanelTop,
          },
          {
            title: 'Kitchen surfaces',
            body: 'Benchtops, cupboards, appliances and finishes cleaned.',
            icon: ChefHat,
          },
          {
            title: 'Bathroom surfaces',
            body: 'Tapware, glass, fixtures, and floors sanitised and finished.',
            icon: Bath,
          },
          {
            title: 'Skirting and trim',
            body: 'Detailed touchpoint cleaning across edges and trim.',
            icon: Footprints,
          },
          {
            title: 'Debris removal',
            body: 'General build-site residue and packaging cleared.',
            icon: Trash2,
          },
          {
            title: 'Inspection-ready finish',
            body: 'Space prepared for handover, photography, or first occupation.',
            icon: BadgeCheck,
          },
          {
            title: 'Tailored scope',
            body: 'Specific project requirements built into your quote.',
            icon: PlusCircle,
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your post-construction clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Share the project details, scope, and handover date.',
          },
          {
            title: 'We arrange a time',
            body: 'Scheduled around your build timeline and inspection deadlines.',
          },
          {
            title: 'Handover-ready',
            body: 'Space cleaned, finished, and ready to use or hand over.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Post-Construction Cleaning',
            description:
              'Post-construction cleaning in Auckland. Detailed handover cleans for renovations, new builds, and fit-outs.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to finish the space properly?"
        subtext="Get in touch with project details and handover date — we'll come back with a clear, practical quote."
      />
    </>
  )
}
