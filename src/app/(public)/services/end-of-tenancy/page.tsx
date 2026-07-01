import type { Metadata } from 'next'
import { CtaBanner } from '@/components/CtaBanner'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { SANO_125_POINT_PROPERTY_RESET } from '@/lib/checklists'
import { BookingStepsSection } from '../_components/BookingStepsSection'
import { AreasWeServeSection } from '../_components/AreasWeServeSection'
import { ServiceInformation } from '../_components/ServiceInformation'
import { WhyChooseSection } from '../_components/WhyChooseSection'

export const metadata: Metadata = {
  title: 'End of Tenancy Cleaning Auckland | Sano',
  description:
    'End of tenancy cleaning in Auckland. A bond-ready clean designed to maximise your chance of bond recovery. Thorough, reliable, fully insured.',
}

export default function EndOfTenancyPage() {
  return (
    <>
      {/* SubpageHero — unchanged from #172 rollout. */}
      <SubpageHero
        eyebrow="END OF TENANCY CLEANING"
        title="End of tenancy cleaning for a proper property reset"
        subtitle="A detailed clean for move-outs, rental handovers, and homes that need to be brought back to a high standard."
        imageSrc="/images/heroes/end-of-tenancy-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information */}
      <ServiceInformation
        body={[
          'Sano end of tenancy cleaning is designed for tenants, landlords, and property managers who need a property brought back to a high standard before handover. We work methodically through the home, room by room and surface by surface, so nothing is missed in the rush of moving out.',
          'Each clean covers kitchens, bathrooms, internal windows, floors, skirting boards, switches, and the detail areas that inspections focus on. Time is allowed to address build-up and finish surfaces properly, not just wipe them down.',
          'The goal is a property that is genuinely inspection-ready. If something does get missed, let us know and we will make it right where reasonable.',
        ]}
        primaryImage={{
          src: '/images/end-of-tenancy.jpg',
          alt: 'A property cleaned and ready for end-of-tenancy handover',
        }}
        secondaryImage={{
          src: '/images/Sano-crew-auckland.jpeg',
          alt: 'The Sano cleaning crew preparing a property for handover',
        }}
      />

      {/* 2. Sano 125-Point Property Reset Checklist. Public Draft pill
          suppressed (same pattern as Regular Cleaning's 100-Point
          integration). */}
      <ServiceChecklist
        checklist={SANO_125_POINT_PROPERTY_RESET}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="The 125-Point Property Reset Checklist"
        headingHighlight="125-Point Property Reset"
        intro="Click on each area to see exactly what's covered in your end-of-tenancy clean. Inclusions depend on property size, condition, and the scope agreed in your quote."
        anchorId="property-reset-checklist"
        showDraftBadge={false}
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for end of tenancy"
      />

      {/* 3. Why Choose Sano */}
      <WhyChooseSection
        heading="Why choose Sano for end of tenancy cleaning"
        headingHighlight="end of tenancy cleaning"
        subtitle="Methodical work, careful people, and a finish that gives your handover the best chance."
        items={[
          {
            title: 'Bond-ready standard',
            body: 'Designed to maximise your chance of a clean bond return.',
          },
          {
            title: 'Property-manager friendly',
            body: 'Reliable for letting agents and landlords preparing for new tenants.',
          },
          {
            title: 'Insured and vetted',
            body: 'All cleaners background-checked, trained, and fully insured.',
          },
          {
            title: 'Methodical, room-by-room',
            body: 'Nothing missed in the move-out rush. Everything covered in order.',
          },
          {
            title: 'Final walkthrough',
            body: 'We check the property before handover, not just at the end of the job.',
          },
          {
            title: 'Reasonable rectification',
            body: "If something is missed, let us know and we'll make it right where reasonable.",
          },
        ]}
      />

      {/* 5. Booking steps */}
      <BookingStepsSection
        heading="Book your end of tenancy clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Share the property details, scope, and your move-out date.',
          },
          {
            title: 'We arrange a time',
            body: 'Scheduled before your handover so the property is ready in time.',
          },
          {
            title: 'Property ready',
            body: 'The property is cleaned and ready for the inspection or new tenants.',
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'End of Tenancy Cleaning',
            description:
              'End of tenancy cleaning in Auckland. Detailed property resets for tenants, landlords, and property managers.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <AreasWeServeSection />
      <CtaBanner
        headline="Ready to hand back the keys?"
        subtext="Get in touch with the property details and your handover date. We'll come back with a clear, practical quote."
      />
    </>
  )
}
