import type { Metadata } from 'next'
import Image from 'next/image'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Window Cleaning Auckland | Sano',
  description: 'Professional window cleaning in Auckland. Streak-free glass, frames, and sills for residential and commercial properties. Get a free quote from Sano.',
}

const includes = [
  'Interior and exterior glass cleaned',
  'Window frames and sills wiped down',
  'Sliding door tracks and glass doors included',
  'Streak-free finish throughout',
  'Residential and commercial properties covered',
]

const whenNeeded = [
  'Windows looking cloudy or streaked',
  'Build-up from weather or dust',
  'Preparing a property for sale or inspection',
  'General seasonal maintenance',
  'After construction or renovation work',
]

const whoItSuits = [
  'Residential homes wanting a clearer finish',
  'Commercial properties and office buildings',
  'Anyone looking to improve the overall look of their space',
]

const steps = [
  'Send through details of your windows and property',
  'We provide a clear quote',
  'We carry out the clean at a time that suits you',
]

const faqs = [
  {
    q: 'Do you clean both inside and outside windows?',
    a: 'Yes, we can clean both internal and external glass as required.',
  },
  {
    q: 'Do you clean window frames and sills as well?',
    a: 'Yes, these are included as part of a proper clean.',
  },
  {
    q: 'How often should windows be cleaned?',
    a: 'It depends on location and exposure, but we can recommend a schedule that suits your property.',
  },
  {
    q: 'Can this be done for commercial buildings?',
    a: 'Yes, we provide window cleaning for both residential and commercial spaces.',
  },
]

const related = getRelatedServices(['regular-cleaning', 'commercial-cleaning', 'deep-cleaning'])

export default function WindowCleaningPage() {
  return (
    <>
      {/* SubpageHero — canonical cleaning-service pattern. */}
      <SubpageHero
        eyebrow="WINDOW CLEANING"
        title="Window cleaning for clearer, brighter spaces"
        subtitle="Interior and exterior window cleaning for homes and workplaces, carried out with care and attention to detail."
        imageSrc="/images/heroes/window-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/window-cleaning.jpg"
                  alt="Window cleaning in progress"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Window cleaning</p>
              <h2 className="mb-6">A clearer finish inside and out.</h2>
              <div className="body-text space-y-4">
                <p>Dirty windows are easy to overlook, but they make a noticeable difference to how a space looks and feels — especially in good light.</p>
                <p>We clean glass, frames, and sills to leave windows streak-free and properly finished. Whether it&apos;s a single home or a larger commercial property, the result is a cleaner, brighter space.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* What's included + image */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn>
              <h2 className="mb-8">What&apos;s included in a window clean</h2>
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
                  src="/images/sano-auckland-team.jpeg"
                  alt="Sano window cleaning team on site in Auckland"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
            <FadeIn>
              <h2 className="mb-6">When a window clean makes a difference</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/cleaning-shot-2.jpeg"
                  alt="Clean result after Sano window cleaning service"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Streak-free glass, frames and sills included</h2>
              <div className="body-text space-y-4">
                <p>Clean windows change how a space feels. More light, sharper views, a property that looks properly looked-after from the street.</p>
                <p>We work through each window with care: streak-free glass, frames wiped down, sills and tracks cleared of built-up dirt and debris. Interior and exterior, residential and commercial.</p>
                <p>The finish is consistent across the whole property, not just the panes you&apos;d notice walking past.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Process + FAQ */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
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
            name: 'Window Cleaning',
            description: 'Professional window cleaning in Auckland. Streak-free glass, frames, and sills for residential and commercial properties.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready for a clearer finish?"
        subtext="If your windows need a proper clean, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
