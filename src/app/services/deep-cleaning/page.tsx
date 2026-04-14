import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Deep Cleaning Services Auckland | Sano',
  description: 'Professional deep cleaning in Auckland. A full top-to-bottom clean that tackles build-up and the areas most people miss. Get a free quote from Sano.',
}

const includes = [
  'Kitchens cleaned thoroughly, including surfaces and key touchpoints',
  'Bathrooms fully cleaned and sanitised',
  'Floors vacuumed and mopped throughout',
  'Dusting of all surfaces, including harder-to-reach areas',
  'Skirting boards, switches, and detailed touchpoints',
  'Built-up grime and overlooked areas addressed',
]

const whenNeeded = [
  'Moving into a new home',
  'Preparing for guests or an event',
  'After a period without regular cleaning',
  'Seasonal resets or spring cleaning',
  'Bringing a space back under control',
]

const whoItSuits = [
  'Homes that need a full reset',
  'People who haven\'t had a professional clean in a while',
  'Anyone wanting a higher standard than a regular clean',
]

const steps = [
  'Get in touch for a quote',
  'We organise a time that suits you',
  'We carry out a full, detailed deep clean',
]

const faqs = [
  {
    q: 'How is a deep clean different from regular cleaning?',
    a: 'A deep clean goes further into detail, focusing on build-up and areas that aren\'t covered in regular maintenance cleaning.',
  },
  {
    q: 'How long does a deep clean take?',
    a: 'It depends on the size and condition of the space. We\'ll give you a clear idea when quoting.',
  },
  {
    q: 'Do I need to prepare anything beforehand?',
    a: 'General tidying helps, but we\'ll guide you if anything specific is needed.',
  },
  {
    q: 'Do you bring your own equipment and products?',
    a: 'Yes, we come fully equipped with everything required.',
  },
]

const related = getRelatedServices(['regular-cleaning', 'end-of-tenancy', 'post-construction'])

export default function DeepCleaningPage() {
  return (
    <>
      <HeroSection
        headline="Deep Cleaning Services in Auckland"
        subtext="A full top-to-bottom clean that resets your space and tackles the areas most people miss."
        imageUrl="/images/deep-cleaning.jpg"
        imageAlt="Deep cleaning in progress"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/deep-cleaning.jpg"
                  alt="Deep cleaning in progress"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Deep cleaning</p>
              <h2 className="mb-6">A proper reset for your space.</h2>
              <div className="body-text space-y-4">
                <p>Sometimes a regular clean isn&apos;t enough. Over time, dust, grime, and build-up settle into the areas that don&apos;t get done day-to-day.</p>
                <p>A deep clean is a full reset. We take the time to work through the details properly, leaving your space feeling fresh, clean, and brought back to a better standard.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* What's included + image */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn>
              <h2 className="mb-8">What&apos;s included in a deep clean</h2>
              <Stagger staggerDelay={0.07}>
                <ul className="space-y-4">
                  {includes.map((item) => (
                    <StaggerItem key={item}>
                      <li className="flex items-start gap-3 body-text">
                        <span className="mt-[0.45rem] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                        {item}
                      </li>
                    </StaggerItem>
                  ))}
                </ul>
              </Stagger>
            </FadeIn>
            <FadeIn delay={0.15} direction="right">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/cleaning-shot-2.jpeg"
                  alt="Sano cleaner performing a thorough deep clean"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* When needed + Who it suits */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            <FadeIn>
              <h2 className="mb-6">When a deep clean makes sense</h2>
              <ul className="space-y-4">
                {whenNeeded.map((item) => (
                  <li key={item} className="flex items-start gap-3 body-text">
                    <span className="mt-[0.45rem] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Who this service suits</h2>
              <ul className="space-y-5">
                {whoItSuits.map((item) => (
                  <li key={item} className="flex items-start gap-3 body-text">
                    <span className="mt-[0.45rem] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Why Sano */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/sano-auckland-team.jpeg"
                  alt="The Sano team — professional cleaners based in Auckland"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Done properly, not rushed</h2>
              <div className="body-text space-y-4">
                <p>A deep clean only works if it&apos;s thorough.</p>
                <p>We don&apos;t rush through jobs or skip over the difficult areas. We work methodically through the space, focusing on the details that make the biggest difference.</p>
                <p>The result is a home that feels properly reset, not just quickly cleaned.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Process + FAQ */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            <FadeIn>
              <h2 className="mb-8">Simple to get started</h2>
              <ol className="space-y-6">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center text-sm font-semibold text-sage-600">
                      {i + 1}
                    </span>
                    <p className="body-text pt-1.5">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-10">
                <QuoteButton label="Get a Quote" />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-8">Common questions</h2>
              <div className="space-y-7">
                {faqs.map((faq) => (
                  <div key={faq.q} className="border-b border-sage-100 pb-7 last:border-0 last:pb-0">
                    <h3 className="mb-2">{faq.q}</h3>
                    <p className="body-text">{faq.a}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="section-padding section-y bg-[#faf9f6]">
          <div className="container-max">
            <FadeIn>
              <h2 className="mb-10">You might also need</h2>
            </FadeIn>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((s) => (
                <li key={s.slug}>
                  <ServiceCard service={s} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Deep Cleaning',
            description: 'Professional deep cleaning in Auckland. A full top-to-bottom clean tackling build-up and overlooked areas.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to reset your space?"
        subtext="If your home needs a proper deep clean, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
