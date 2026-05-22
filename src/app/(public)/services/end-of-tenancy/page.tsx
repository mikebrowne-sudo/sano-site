import type { Metadata } from 'next'
import Image from 'next/image'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'End of Tenancy Cleaning Auckland | Sano',
  description: 'End of tenancy cleaning in Auckland. A bond-ready clean designed to maximise your chance of bond recovery. Thorough, reliable, fully insured.',
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
    a: 'Our end of tenancy clean is designed to maximise your chance of bond recovery, and we stand behind the quality of our cleaning work. Final decisions always sit with the landlord or agency, but if something has been missed, let us know and we\'ll make it right where reasonable.',
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
      {/* SubpageHero — canonical cleaning-service pattern (matches the
          Regular Cleaning and Deep Cleaning rollouts in #170 / #171).
          Primary CTA only, full trust row (DEFAULT_TRUST_ITEMS),
          homepage-exact gradient + entrance. No "Explore Services",
          no checklist link in the hero — the 125-Point Property Reset
          checklist content lives in /preview/checklists (unlinked)
          and any future end-of-tenancy checklist integration would
          land in a separate rollout. */}
      <SubpageHero
        eyebrow="END OF TENANCY CLEANING"
        title="End of tenancy cleaning for a proper property reset"
        subtitle="A detailed clean for move-outs, rental handovers, and homes that need to be brought back to a high standard."
        imageSrc="/images/heroes/end-of-tenancy-hero.jpg"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
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
                  src="/images/sano-auckland-team.jpeg"
                  alt="Sano team preparing a property for end of tenancy handover"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/cleaning-shot-2.jpeg"
                  alt="Property cleaned and prepared for end of tenancy inspection"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">A bond-ready clean you can hand over with confidence</h2>
              <div className="body-text space-y-4">
                <p>An end of tenancy clean works to a different standard than a regular visit. Property managers and landlords look for specific things: clean kitchens and bathrooms, sills and tracks, no overlooked corners. That&apos;s what we focus on.</p>
                <p>We clean the property to a bond-ready standard, designed to maximise your chance of bond recovery. Final decisions sit with the landlord or agency, but we stand behind the quality of our cleaning work and we&apos;ll come back to fix anything we&apos;ve missed where reasonable.</p>
                <p>The handover goes more smoothly when the property is in the right condition, and that&apos;s what we set out to deliver.</p>
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
            name: 'End of Tenancy Cleaning',
            description: 'End of tenancy cleaning in Auckland. A bond-ready clean designed to maximise your chance of bond recovery, with attention to what landlords and property managers expect.',
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
