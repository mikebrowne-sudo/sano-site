import type { Metadata } from 'next'
import Image from 'next/image'
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  Handshake,
  Repeat,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
} from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'

export const metadata: Metadata = {
  title: 'About Sano Property Services | Auckland',
  description: 'Sano Property Services provides reliable residential and commercial cleaning across Auckland. Over 20 years of experience. Consistent, detail-focused, easy to deal with.',
}

const expectations = [
  {
    icon: ShieldCheck,
    label: 'Fully insured and vetted',
    desc: 'Background-checked cleaners and full insurance on every job.',
  },
  {
    icon: Repeat,
    label: 'Reliable, consistent service',
    desc: 'The same careful standard every visit, from people you know.',
  },
  {
    icon: Unlock,
    label: 'No lock-in contracts',
    desc: 'Stay because the work is good — never because you are tied in.',
  },
  {
    icon: CalendarClock,
    label: 'Flexible scheduling',
    desc: 'Weekly, fortnightly, or one-off. We fit around you.',
  },
]

const worksWith = ['Homes', 'Offices', 'Commercial spaces', 'Education']

const values = [
  {
    icon: Handshake,
    title: 'Easy to deal with',
    body: 'Clear communication, simple booking, and a team that shows up when they say they will. No chasing, no hassle.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Tailored to you',
    body: 'Every space is different. We focus on what matters most to you, rather than applying a one-size approach.',
  },
  {
    icon: BadgeCheck,
    title: 'Consistent results',
    body: 'We take pride in doing the job properly. No shortcuts, no rushed work. Just a standard you can rely on.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* SubpageHero — About uses the trust row (page is about Sano as
          a company, so trust signals fit) and the homepage-style dual
          CTA (primary Get a Free Quote + secondary Explore Services).
          The existing two-column "about" content section below was
          previously acting as the page's hero — it stays as a
          secondary content block beneath the new SubpageHero. Its
          inline h1 is demoted to h2 since the SubpageHero now carries
          the page's single h1. */}
      <SubpageHero
        eyebrow="ABOUT SANO"
        title="A cleaning company built on care, consistency, and trust"
        subtitle="Sano provides residential and commercial cleaning across Auckland, with reliable systems, careful people, and clear communication."
        imageSrc="/images/heroes/about-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        secondaryCta={{ label: 'Explore Services', href: '/services' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* About content (was the original hero — now a secondary block) */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] lg:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                  alt="Sano cleaner at work"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">About Sano</p>
              <h2 className="mb-6">Cleaning done properly, by people who care about the result.</h2>
              <p className="text-[0.9375rem] font-medium text-sage-500 mb-8 italic">
                Clean spaces — Healthy living
              </p>
              <div className="body-text space-y-4">
                <p>Sano was built around a simple idea. Cleaning isn&apos;t just about getting through a checklist. It&apos;s about leaving a space feeling right.</p>
                <p>With over 20 years of experience across homes, commercial spaces, and education environments, we&apos;ve learned that what matters most is consistency. Turning up when we say we will, paying attention to the details, and doing the job properly every time.</p>
                <p>Every space is different, and so is every client. We take the time to understand what&apos;s needed and tailor the clean to suit, rather than applying the same approach everywhere.</p>
                <p>Behind Sano is a trusted network of experienced cleaners who take pride in their work. People who care about the result, not just finishing the job.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Full-width image */}
      <div className="relative h-72 lg:h-[28rem] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="Clean, calm interior space"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-sage-800/20" aria-hidden="true" />
      </div>

      {/* Trust points */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-start">
            <FadeIn>
              <p className="eyebrow mb-3">Why Sano</p>
              <h2 className="mb-8">What you can expect</h2>
              <Stagger staggerDelay={0.08}>
                <ul className="space-y-3">
                  {expectations.map(({ icon: Icon, label, desc }) => (
                    <StaggerItem key={label}>
                      <li className="flex items-start gap-4 rounded-2xl bg-white/70 border border-sage-100/80 p-4 sm:p-5">
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-sage-100 text-sage-700"
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5" strokeWidth={1.75} />
                        </span>
                        <span>
                          <span className="block body-text font-semibold text-sage-800">{label}</span>
                          <span className="block text-sm text-sage-500 mt-0.5">{desc}</span>
                        </span>
                      </li>
                    </StaggerItem>
                  ))}
                </ul>
              </Stagger>
            </FadeIn>
            <FadeIn delay={0.15}>
              {/* Invisible spacer mirrors the left heading block (eyebrow +
                  h2) so on desktop the panel top lines up with the top of the
                  first expectation card. Hidden on mobile where columns stack. */}
              <div aria-hidden="true" className="invisible hidden lg:block select-none">
                <p className="eyebrow mb-3">Why Sano</p>
                <h2 className="mb-8">What you can expect</h2>
              </div>
              <div className="rounded-2xl bg-sage-800 shadow-sm p-8 lg:p-9">
                <span
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sage-300/20 text-sage-300 mb-5"
                  aria-hidden="true"
                >
                  <Building2 className="w-6 h-6" strokeWidth={1.75} />
                </span>
                <h2 className="mb-4 text-white">Who we work with</h2>
                <p className="text-[0.9375rem] leading-[1.6] text-white/80">
                  Homes, offices, and commercial spaces across Auckland. From regular cleaning to
                  one-off jobs, we keep things simple and consistent.
                </p>
                <ul className="flex flex-wrap gap-2 mt-6">
                  {worksWith.map((who) => (
                    <li
                      key={who}
                      className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-white/90"
                    >
                      {who}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <FadeIn className="mb-12">
            <h2>How we approach every job</h2>
          </FadeIn>
          <Stagger staggerDelay={0.1}>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map(({ icon: Icon, title, body }) => (
                <StaggerItem key={title}>
                  <li className="group bg-[#faf9f6] rounded-2xl p-8 border border-sage-100 h-full transition-all duration-300 hover:bg-white hover:border-sage-200 hover:shadow-lg hover:-translate-y-1">
                    <span
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sage-100 text-sage-700 mb-5 transition-colors duration-300 group-hover:bg-sage-600 group-hover:text-white"
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6" strokeWidth={1.75} />
                    </span>
                    <h3 className="mb-3">{title}</h3>
                    <p className="body-text">{body}</p>
                  </li>
                </StaggerItem>
              ))}
            </ul>
          </Stagger>
        </div>
      </section>

      <CtaBanner
        headline="Want to know more?"
        subtext="Get in touch — we're happy to chat about what you need."
      />
    </>
  )
}
