import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import { SANO_100_POINT_HOME_CLEAN } from '@/lib/checklists'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Regular House Cleaning Auckland | Sano',
  description: 'Reliable regular house cleaning in Auckland. We keep your home consistently clean, tidy, and easy to live in — weekly or fortnightly. Get a free quote.',
}

const includes = [
  'Kitchens cleaned and surfaces wiped',
  'Bathrooms cleaned and sanitised',
  'Floors vacuumed and mopped',
  'Dusting of surfaces and furniture',
  'Skirting boards, switches, and touchpoints',
  'General tidying and finishing details',
]

const schedules = [
  'Weekly cleaning',
  'Fortnightly cleaning',
  'Custom schedules available',
]

const whoItSuits = [
  'Busy households that don\'t have time to keep up with cleaning',
  'Families wanting a consistently clean home',
  'Anyone who prefers to outsource regular upkeep',
]

const steps = [
  'Get in touch for a quote',
  'We organise a time that suits you',
  'We take care of the cleaning on an ongoing basis',
]

const faqs = [
  {
    q: 'Do I need to be home during the clean?',
    a: 'No, many of our clients aren\'t home. We can arrange access in a way that works for you.',
  },
  {
    q: 'Do you bring your own equipment and products?',
    a: 'Yes, we come fully equipped with everything needed to complete the clean.',
  },
  {
    q: 'Can I customise what\'s included?',
    a: 'Yes, we can tailor the clean to suit your home and preferences.',
  },
  {
    q: 'What if I need to reschedule?',
    a: 'Just let us know in advance and we\'ll work with you to adjust your booking.',
  },
]

const related = getRelatedServices(['deep-cleaning', 'carpet-upholstery', 'window-cleaning'])

export default function RegularCleaningPage() {
  return (
    <>
      <HeroSection
        headline="Regular House Cleaning in Auckland"
        subtext="Keep your home consistently clean, tidy, and easy to live in with reliable ongoing cleaning."
        imageUrl="https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1600&q=80"
        imageAlt="Clean, well-lit living space"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80"
                  alt="Clean, naturally lit living space"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Regular cleaning</p>
              <h2 className="mb-6">Consistent cleaning, without the effort.</h2>
              <div className="body-text space-y-4">
                <p>Keeping on top of cleaning isn&apos;t always easy, especially with a busy schedule. Regular house cleaning takes that pressure off, so your home stays clean without you having to think about it.</p>
                <p>At Sano, we focus on consistent, well-finished cleans that leave your space feeling fresh, organised, and properly cared for.</p>
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
              <h2 className="mb-8">What&apos;s included in a regular clean</h2>
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
                  alt="Sano cleaner at work in an Auckland home"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Sano 100-Point Home Clean Checklist — full interactive
          drill-down of "What's included" above. Anchor target for the
          homepage Signature System CTA (/services/regular-cleaning
          #home-clean-checklist). Drops the "Sano" brand prefix from
          the visual heading to keep the section title tight on the
          page; data-file canonical name stays unchanged. */}
      <ServiceChecklist
        checklist={SANO_100_POINT_HOME_CLEAN}
        eyebrow="OUR SIGNATURE SYSTEM"
        displayHeading="The 100-Point Home Clean Checklist"
        headingHighlight="100-Point Home Clean"
        intro="See exactly what's included in our regular home cleaning. The checklist gives a clear room-by-room view of how we work, while each visit is still adjusted to suit your home."
        anchorId="home-clean-checklist"
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for your home"
      />

      {/* Frequency + Who it suits — two columns, same section */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
            <FadeIn>
              <h2 className="mb-6">Cleaning that fits your routine</h2>
              <p className="body-text mb-6">We offer flexible cleaning schedules to suit your home and lifestyle:</p>
              <ul className="space-y-3 mb-6">
                {schedules.map((item) => (
                  <li key={item} className="flex items-center gap-3 body-text font-medium">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="body-text">We&apos;ll work with you to find a setup that keeps things manageable without overdoing it.</p>
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
                  src="/images/sano-auckland-team.jpeg"
                  alt="The Sano cleaning team — Auckland locals you can trust"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Same standard, every visit</h2>
              <div className="body-text space-y-4">
                <p>Regular cleaning is most useful when it shows up the same way every time.</p>
                <p>Your home stays with a consistent team, briefed on what matters most to you. The standard is checked by us, not just left to chance week to week. You shouldn&apos;t have to re-explain priorities or wonder which visit you got the thorough clean.</p>
                <p>Over time that means less for you to manage. Your home stays where you want it, without sitting on your to-do list.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Process + FAQ — two columns */}
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
            name: 'Regular House Cleaning',
            description: 'Reliable regular house cleaning in Auckland. Weekly or fortnightly visits by vetted cleaners.',
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
