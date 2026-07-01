import type { Metadata } from 'next'
import Image from 'next/image'
import { BadgeCheck, Handshake, SlidersHorizontal } from 'lucide-react'
import { WhyChooseSection } from '@/app/(public)/services/_components/WhyChooseSection'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'

export const metadata: Metadata = {
  title: 'About Sano Property Services | Auckland',
  description: 'Sano Property Services provides reliable residential and commercial cleaning across Auckland. Over 20 years of experience. Consistent, detail-focused, easy to deal with.',
}

const whyItems = [
  {
    title: 'Fully insured and vetted',
    body: 'Every cleaner is background-checked and we carry full insurance on every job.',
  },
  {
    title: 'Reliable, consistent service',
    body: 'The same careful standard every visit, from people you come to know.',
  },
  {
    title: 'No lock-in contracts',
    body: 'Stay because the work is good — never because you are tied into a contract.',
  },
  {
    title: 'Flexible scheduling',
    body: 'Weekly, fortnightly, or one-off. We fit around your routine.',
  },
  {
    title: 'Homes to commercial spaces',
    body: 'We clean homes, offices, commercial spaces, and education environments across Auckland.',
  },
  {
    title: '20+ years of experience',
    body: 'Two decades of turning up when we say we will and doing the job properly.',
  },
]

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
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-stretch">
            <FadeIn direction="left" className="h-full">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[18rem] rounded-2xl overflow-hidden ring-1 ring-sage-100 shadow-sm">
                <Image
                  src="/images/cleaning-standards.jpg"
                  alt="Sano cleaning kit and residential checklist on a kitchen benchtop"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-4">About Sano</p>
              <h2
                className="mb-6"
                style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.15rem)', lineHeight: 1.18 }}
              >
                Cleaning done properly, by people who care about the result.
              </h2>
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

      {/* Why Sano — branded dark band, same component as the service pages */}
      <WhyChooseSection
        heading="Why choose Sano"
        headingHighlight="Sano"
        subtitle="Reliable systems, careful people, and clear communication — across every kind of space in Auckland."
        items={whyItems}
      />

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
