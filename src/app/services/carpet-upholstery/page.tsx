import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Carpet & Upholstery Cleaning Auckland | Sano',
  description: 'Professional carpet and upholstery cleaning in Auckland. Remove built-up dirt, stains, and odours from carpets and furniture. Free quote from Sano.',
}

const includes = [
  'Carpet cleaning to remove dirt and build-up',
  'Upholstery cleaning for sofas, chairs, and fabric surfaces',
  'Treatment of common stains and high-use areas',
  'Removal of trapped odours where possible',
  'A more even, refreshed finish across surfaces',
]

const whenNeeded = [
  'High-traffic areas starting to look worn',
  'Visible stains or marks',
  'Furniture needing a refresh',
  'General build-up over time',
  'Preparing a home for guests or moving',
]

const whoItSuits = [
  'Homes with carpets or fabric furniture',
  'Busy households with regular wear and tear',
  'Anyone wanting to refresh their space without replacing furniture',
]

const steps = [
  'Send through details of what needs cleaning',
  'We provide a clear quote',
  'We carry out the clean and refresh the space',
]

const faqs = [
  {
    q: 'Can you remove all stains?',
    a: 'We treat and reduce stains where possible, but results can vary depending on the material and how long the stain has been there.',
  },
  {
    q: 'How long does it take to dry?',
    a: 'Drying time depends on the material and conditions, but we\'ll give you a clear guide when quoting.',
  },
  {
    q: 'Do you clean all types of upholstery?',
    a: 'Most common fabrics can be cleaned. Let us know what you have and we\'ll confirm.',
  },
  {
    q: 'Do you bring your own equipment?',
    a: 'Yes, we come fully equipped for the job.',
  },
]

const related = getRelatedServices(['regular-cleaning', 'deep-cleaning', 'end-of-tenancy'])

export default function CarpetUpholsteryPage() {
  return (
    <>
      <HeroSection
        headline="Carpet & Upholstery Cleaning in Auckland"
        subtext="Refresh carpets and furniture by removing built-up dirt, stains, and odours."
        imageUrl="/images/carpet-upholstery.jpg"
        imageAlt="Carpet and upholstery cleaning in progress"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/carpet-upholstery.jpg"
                  alt="Carpet cleaning in progress"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Carpet & upholstery cleaning</p>
              <h2 className="mb-6">A fresher finish for carpets and furniture.</h2>
              <div className="body-text space-y-4">
                <p>Over time, carpets and furniture collect dirt, dust, and everyday wear that regular cleaning doesn&apos;t fully remove.</p>
                <p>A professional clean helps lift the overall look and feel of your space, leaving surfaces fresher, cleaner, and more comfortable to use.</p>
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
              <h2 className="mb-8">What&apos;s included in this service</h2>
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
                  alt="Sano cleaner treating carpet and upholstery"
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
              <h2 className="mb-6">When this service makes a difference</h2>
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
                  alt="The Sano team — Auckland carpet and upholstery specialists"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">A proper clean, not just a quick pass</h2>
              <div className="body-text space-y-4">
                <p>Carpet and upholstery cleaning takes time to do properly.</p>
                <p>We focus on working through the areas that matter, rather than rushing through the job. The goal is a noticeable improvement in both appearance and feel.</p>
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
            name: 'Carpet & Upholstery Cleaning',
            description: 'Professional carpet and upholstery cleaning in Auckland. Remove built-up dirt, stains, and odours from carpets and furniture.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Looking to refresh your space?"
        subtext="If your carpets or furniture need a proper clean, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
