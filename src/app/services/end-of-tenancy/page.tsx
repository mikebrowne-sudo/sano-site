import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'End of Tenancy Cleaning Auckland | Sano',
  description: 'End of tenancy cleaning in Auckland. A thorough clean to leave your property in the right condition before moving out. Free quote from Sano.',
}

const includes = [
  'Full kitchen clean, including surfaces, cupboards, and appliances',
  'Bathrooms cleaned and sanitised thoroughly',
  'Floors vacuumed and mopped throughout',
  'All surfaces wiped and dust removed',
  'Skirting boards, switches, and detailed touchpoints',
  'Internal windows, glass doors, and sills cleaned',
]

const whoItSuits = [
  'Tenants preparing to move out',
  'Property managers needing a reliable clean',
  'Landlords getting a property ready for new tenants',
]

const steps = [
  'Send through details about the property',
  'We provide a clear quote',
  'We carry out the clean before handover',
]

const faqs = [
  {
    q: 'Will this help me get my bond back?',
    a: 'We clean to a high standard and focus on what property managers look for, but final decisions always sit with the landlord or agency.',
  },
  {
    q: 'Do I need to be there during the clean?',
    a: 'No, we can arrange access in a way that works for you.',
  },
  {
    q: 'Do you bring your own equipment and products?',
    a: 'Yes, we come fully equipped.',
  },
  {
    q: 'How long does an end of tenancy clean take?',
    a: 'It depends on the size and condition of the property. We\'ll give you a clear timeframe when quoting.',
  },
]

const related = getRelatedServices(['deep-cleaning', 'carpet-upholstery', 'post-construction'])

export default function EndOfTenancyPage() {
  return (
    <>
      <HeroSection
        headline="End of Tenancy Cleaning in Auckland"
        subtext="A thorough clean to leave your property in the right condition before moving out."
        imageUrl="/images/end-of-tenancy.jpg"
        imageAlt="Clean, empty property ready for inspection"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/end-of-tenancy.jpg"
                  alt="Clean, empty property ready for handover"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">End of tenancy cleaning</p>
              <h2 className="mb-6">Leave the property in the right condition.</h2>
              <div className="body-text space-y-4">
                <p>Moving out comes with enough to organise. Cleaning shouldn&apos;t be the part that slows things down.</p>
                <p>Our end of tenancy cleaning service is designed to get the property ready for handover. We focus on the areas that matter most for inspections, so the space is left clean, presentable, and in the right condition.</p>
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
              <h2 className="mb-8">What&apos;s included in an end of tenancy clean</h2>
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
                  alt="Clean kitchen detail after end of tenancy clean"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Inspection focus + Who it suits */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            <FadeIn>
              <h2 className="mb-6">Focused on what matters for inspection</h2>
              <div className="body-text space-y-4">
                <p>When it comes to moving out, the standard is higher than a regular clean.</p>
                <p>We focus on the key areas landlords and property managers pay attention to, including kitchens, bathrooms, and overall presentation. The goal is to leave the space in a condition that meets expectations and avoids unnecessary issues.</p>
              </div>
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
                  alt="Clean, empty space ready for handover"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Thorough, consistent, and done properly</h2>
              <div className="body-text space-y-4">
                <p>End of tenancy cleaning isn&apos;t something you want rushed.</p>
                <p>We take a methodical approach, working through the property in detail so nothing is missed. From kitchens and bathrooms to finishing touches, everything is handled with care.</p>
                <p>The result is a space that&apos;s properly cleaned and ready for handover.</p>
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
            name: 'End of Tenancy Cleaning',
            description: 'End of tenancy cleaning in Auckland. A thorough clean to leave the property in the right condition before moving out.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Need to get the property ready?"
        subtext="If you're moving out and need a thorough, reliable clean, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
