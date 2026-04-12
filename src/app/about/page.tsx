import type { Metadata } from 'next'
import Image from 'next/image'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'

export const metadata: Metadata = {
  title: 'About Sano Property Services | Auckland',
  description: 'Sano Property Services provides reliable residential and commercial cleaning across Auckland. Over 20 years of experience. Consistent, detail-focused, easy to deal with.',
}

const trustPoints = [
  'Fully insured and vetted',
  'Reliable, consistent service',
  'No lock-in contracts',
  'Flexible scheduling',
]

const values = [
  {
    title: 'Easy to deal with',
    body: 'Clear communication, simple booking, and a team that shows up when they say they will. No chasing, no hassle.',
  },
  {
    title: 'Tailored to you',
    body: 'Every space is different. We focus on what matters most to you, rather than applying a one-size approach.',
  },
  {
    title: 'Consistent results',
    body: 'We take pride in doing the job properly. No shortcuts, no rushed work. Just a standard you can rely on.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
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
              <h1 className="mb-6">Cleaning done properly, by people who care about the result.</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn>
              <h2 className="mb-8">What you can expect</h2>
              <Stagger staggerDelay={0.08}>
                <ul className="space-y-5">
                  {trustPoints.map((point) => (
                    <StaggerItem key={point}>
                      <li className="flex items-center gap-3 body-text font-medium">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                        {point}
                      </li>
                    </StaggerItem>
                  ))}
                </ul>
              </Stagger>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="mb-6">Who we work with</h2>
              <p className="body-text">Homes, offices, and commercial spaces across Auckland. From regular cleaning to one-off jobs, we keep things simple and consistent.</p>
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
              {values.map((value) => (
                <StaggerItem key={value.title}>
                  <li className="bg-[#faf9f6] rounded-2xl p-8 border border-sage-100 h-full">
                    <h3 className="mb-3">{value.title}</h3>
                    <p className="body-text">{value.body}</p>
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
