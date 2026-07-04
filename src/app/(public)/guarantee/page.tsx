import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { FadeIn } from '@/components/FadeIn'
import { CtaBanner } from '@/components/CtaBanner'
import { BookingStepsSection } from '../services/_components/BookingStepsSection'
import { WhyChooseSection } from '../services/_components/WhyChooseSection'

/**
 * Guarantee page — rebuilt on the house system (2026-07-05 facelift).
 * Previously a bespoke dialect: gradient text hero, inline SVGs,
 * text-gray-500, rounded-3xl cards, and a duplicate dark CTA. Now:
 * SubpageHero → guarantee statement card (the "certificate moment") →
 * dark WhyChooseSection band (the six promises) → BookingStepsSection
 * (the make-it-right steps) → CtaBanner. Copy preserved verbatim except
 * the redundant bespoke closing CTA, whose key line now lives in the
 * CtaBanner headline/subtext.
 */

export const metadata: Metadata = {
  title: 'Our Guarantee | Sano Cleaning Auckland',
  description:
    "We stand behind every clean. If something's not right, we'll come back and fix it or offer a discount on your next clean. No hassle.",
}

export default function GuaranteePage() {
  return (
    <>
      <SubpageHero
        eyebrow="Our guarantee"
        title="Clean with confidence."
        titleHighlight="confidence"
        subtitle="We stand behind our work. If something's not right, we'll make it right."
        imageSrc="/images/heroes/deep-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* The certificate moment — the guarantee itself, one calm card. */}
      <section className="relative overflow-hidden section-padding bg-white py-10 lg:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[280px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage-100/60 blur-3xl" />
        </div>
        <div className="relative container-max max-w-2xl">
          <FadeIn>
            <div className="rounded-2xl border border-sage-100 bg-white p-8 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md md:p-10">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sage-700">
                <ShieldCheck size={22} strokeWidth={1.75} className="text-white" aria-hidden="true" />
              </div>
              <h2 className="mb-4 text-sage-800">Our Satisfaction Guarantee</h2>
              <div className="body-text space-y-4">
                <p>We stand behind the quality of every clean.</p>
                <p>
                  If something&apos;s been missed or you&apos;re not happy with part of the service,
                  just let us know. We&apos;ll come back and sort it, or if that&apos;s not practical,
                  we&apos;ll offer a discount on your next clean.
                </p>
                <p>
                  No hassle. No back and forth. Just a straightforward approach to making sure
                  you&apos;re looked after.
                </p>
                <p>
                  We aim to get everything right the first time, but what matters most is how
                  it&apos;s handled if we don&apos;t.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* The six promises — dark band, same dialect as the rest of the site. */}
      <WhyChooseSection
        eyebrow="WHAT YOU CAN EXPECT"
        heading="What you can expect from us"
        headingHighlight="expect"
        subtitle="Every visit is backed by the same standard of care and the same commitment to getting it right."
        items={[
          {
            title: 'Reliable and consistent',
            body: 'We show up when we say we will and deliver a consistent standard every time.',
          },
          {
            title: 'Attention to detail',
            body: 'We focus on the small things that are often missed.',
          },
          {
            title: 'Respect for your space',
            body: 'Your home is treated with care and consideration at all times.',
          },
          {
            title: 'We stand behind our work',
            body: "If something's not right, we fix it quickly and without hassle.",
          },
          {
            title: 'Clear pricing',
            body: 'No surprises. You know exactly what to expect.',
          },
          {
            title: 'Built for the long term',
            body: "We're here to provide a service you can rely on ongoing.",
          },
        ]}
      />

      <BookingStepsSection
        heading="Make it right in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Let us know',
            body: "If something's not quite right, just get in touch and tell us what's been missed.",
          },
          {
            title: 'We sort it',
            body: "We'll arrange to come back and fix it, or offer a fair solution that works for you.",
          },
          {
            title: 'Move on with confidence',
            body: 'You can rely on us to stand behind our work every time.',
          },
        ]}
      />

      <CtaBanner
        headline="A better standard of cleaning"
        subtext="We focus on getting the basics right, every time, and standing behind the result."
      />
    </>
  )
}
