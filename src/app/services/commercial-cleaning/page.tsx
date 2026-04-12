import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Commercial & Office Cleaning Auckland | Sano',
  description: 'Reliable commercial and office cleaning in Auckland. Consistent, detail-focused cleaning that keeps your workplace presentable and easy to maintain. Free quote.',
}

const includes = [
  'Workspaces, desks, and surfaces cleaned',
  'Kitchens and staff areas maintained',
  'Bathrooms cleaned and sanitised',
  'Floors vacuumed and mopped',
  'Rubbish removed and bins managed',
  'Touchpoints and shared areas cleaned',
]

const schedules = [
  'After-hours cleaning',
  'Early morning cleaning',
  'Custom schedules to suit your operations',
]

const whoItSuits = [
  'Offices and professional workspaces',
  'Small to medium businesses',
  'Shared work environments',
  'Retail or light commercial spaces',
]

const steps = [
  'Send through details about your space',
  'We provide a clear quote',
  'We set up a schedule that works for you',
]

const faqs = [
  {
    q: 'Can cleaning be done outside business hours?',
    a: 'Yes, we offer flexible scheduling including after-hours and early morning cleaning.',
  },
  {
    q: 'Do you supply your own equipment and products?',
    a: 'Yes, we bring everything needed to carry out the clean.',
  },
  {
    q: 'Can the service be tailored to our workplace?',
    a: 'Yes, we\'ll work with you to create a cleaning plan that suits your space and needs.',
  },
  {
    q: 'How often can cleaning be scheduled?',
    a: 'We offer daily, weekly, or custom schedules depending on your requirements.',
  },
]

const related = getRelatedServices(['regular-cleaning', 'window-cleaning', 'carpet-upholstery'])

export default function CommercialCleaningPage() {
  return (
    <>
      <HeroSection
        headline="Commercial & Office Cleaning in Auckland"
        subtext="Reliable cleaning that keeps your workspace clean, consistent, and easy to maintain."
        imageUrl="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=80"
        imageAlt="Clean, modern office space"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80"
                  alt="Clean, modern office environment"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Commercial cleaning</p>
              <h2 className="mb-6">A workspace that stays on top of itself.</h2>
              <div className="body-text space-y-4">
                <p>A clean workspace makes a difference to how a business runs day to day.</p>
                <p>We provide reliable commercial cleaning that keeps your space presentable, organised, and easy for staff and clients to be in. The focus is on consistency, so you&apos;re not having to follow up or check things have been done properly.</p>
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
              <h2 className="mb-8">What&apos;s included in a commercial clean</h2>
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
                  src="https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80"
                  alt="Office cleaning detail"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Flexible scheduling + Who it suits */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            <FadeIn>
              <h2 className="mb-6">Cleaning that works around your business</h2>
              <p className="body-text mb-6">We understand every workplace is different.</p>
              <ul className="space-y-4 mb-6">
                {schedules.map((item) => (
                  <li key={item} className="flex items-center gap-3 body-text font-medium">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="body-text">We&apos;ll work with you to find a setup that keeps things consistent without disrupting your day.</p>
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
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
                  alt="Clean, calm finished office space"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Consistent, reliable, and done properly</h2>
              <div className="body-text space-y-4">
                <p>In a commercial setting, consistency matters.</p>
                <p>We don&apos;t rotate through unreliable cleaners or cut corners. Our approach is steady and detail-focused, so you get the same standard every time.</p>
                <p>You won&apos;t need to chase things up or check if the job&apos;s been done.</p>
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
            name: 'Commercial & Office Cleaning',
            description: 'Reliable commercial and office cleaning in Auckland. Consistent, detail-focused cleaning for workplaces.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Looking for a reliable cleaning service?"
        subtext="If you need consistent, professional cleaning for your workplace, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
