import type { Metadata } from 'next'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { QuoteButton } from '@/components/QuoteButton'
import { ServiceCard } from '@/components/ServiceCard'
import { getRelatedServices } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Post-Construction Cleaning Auckland | Sano',
  description: 'Post-construction cleaning in Auckland. We clear dust, debris, and residue so your space is clean, safe, and ready to use. Free quote from Sano.',
}

const includes = [
  'Removal of dust from all surfaces',
  'Cleaning of floors, including vacuuming and mopping',
  'Kitchens and bathrooms wiped and finished',
  'Internal glass and windows cleaned',
  'Skirting boards, switches, and detailed areas cleaned',
  'General debris and residue cleared',
]

const whenNeeded = [
  'After new builds are completed',
  'After renovations or alterations',
  'Before handover to clients or tenants',
  'Before moving into a newly finished space',
]

const whoItSuits = [
  'Builders and contractors',
  'Homeowners completing renovations',
  'Property developers',
  'Anyone preparing a space for handover or move-in',
]

const steps = [
  'Send through details of the project',
  'We provide a clear quote',
  'We carry out the clean ready for handover',
]

const faqs = [
  {
    q: 'Do you remove all construction dust?',
    a: 'We remove dust from surfaces and accessible areas as part of a thorough clean.',
  },
  {
    q: 'Can you work around handover deadlines?',
    a: 'Yes, we can schedule cleaning to align with your project timeline where possible.',
  },
  {
    q: 'Do you bring your own equipment?',
    a: 'Yes, we come fully equipped for the job.',
  },
  {
    q: 'Is this suitable for both residential and commercial projects?',
    a: 'Yes, we work across both types of spaces.',
  },
]

const related = getRelatedServices(['deep-cleaning', 'end-of-tenancy', 'window-cleaning'])

export default function PostConstructionPage() {
  return (
    <>
      <HeroSection
        headline="Post-Construction Cleaning in Auckland"
        subtext="We clear dust, debris, and residue so your space is clean, safe, and ready to use."
        imageUrl="/images/post-construction.jpg"
        imageAlt="Newly completed space being cleaned"
        showSecondaryButton={false}
      />

      {/* Intro */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="/images/post-construction.jpg"
                  alt="Clean, newly finished space"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">Post-construction cleaning</p>
              <h2 className="mb-6">Ready to use, not just finished.</h2>
              <div className="body-text space-y-4">
                <p>After building or renovation work, the space often looks finished but still needs a proper clean before it&apos;s ready to use.</p>
                <p>Dust, debris, and residue settle into surfaces and corners. A post-construction clean removes what&apos;s left behind and brings the space up to a clean, usable standard.</p>
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
              <h2 className="mb-8">What&apos;s included in a post-construction clean</h2>
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
                  src="/images/sano-commercial-clean-auckland.jpeg"
                  alt="Sano team clearing a post-construction site in Auckland"
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
              <h2 className="mb-6">When to book a post-construction clean</h2>
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
                  alt="The Sano team delivering post-construction cleaning in Auckland"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">A clean that finishes the job properly</h2>
              <div className="body-text space-y-4">
                <p>Post-construction cleaning is about the final result.</p>
                <p>We take a methodical approach, working through dust, residue, and finishing details so the space is ready to be used. Nothing is rushed or skipped.</p>
                <p>The result is a clean, presentable space that reflects the quality of the work that&apos;s been done.</p>
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
            name: 'Post-Construction Cleaning',
            description: 'Post-construction cleaning in Auckland. We clear dust, debris, and residue so your space is clean, safe, and ready to use.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to finish the space properly?"
        subtext="If your project needs a final clean before handover or use, we can help. Get in touch for a quick, no-pressure quote."
      />
    </>
  )
}
