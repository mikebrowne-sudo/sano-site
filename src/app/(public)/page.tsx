import type { Metadata } from 'next'
import { HomeHero } from '@/components/HomeHero'
import { ServiceCard } from '@/components/ServiceCard'
import { ProcessSteps } from '@/components/ProcessSteps'
import { CtaBanner } from '@/components/CtaBanner'
import { FadeIn, Stagger, StaggerItem } from '@/components/FadeIn'
import { SERVICES } from '@/lib/services'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Sano — Premium Cleaning Services Auckland',
  description: "Premium residential and commercial cleaning in Auckland. Professionally selected teams, 20+ years industry experience. Tailored to Auckland's finest homes and businesses.",
}

export default function HomePage() {
  return (
    <>
      <HomeHero />

      {/* Why Auckland Chooses Sano */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left">
              <div className="relative h-[22rem] md:h-[32rem] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80"
                  alt="Clean interior — Sano cleaning standard"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="eyebrow mb-5">Why Auckland Chooses Sano</p>
              <h2 className="mb-6">More than just a surface clean.</h2>
              <div className="body-text space-y-4 mb-8">
                <p>Anyone can make a space look tidy. What matters is how it feels once the job is done.</p>
                <p>At Sano, we focus on creating clean, healthy environments that are properly cared for. With over 20 years of experience across homes and commercial spaces, we&apos;ve learned that the difference comes down to consistency and attention to detail.</p>
                <p>We work methodically, take pride in what we do, and don&apos;t rush through jobs. The result is a space that not only looks clean, but feels better to be in.</p>
              </div>
              <Stagger staggerDelay={0.08}>
                <ul className="space-y-3">
                  {[
                    '20+ years of hands-on industry experience',
                    'Carefully selected and reliable cleaning teams',
                    'Residential and commercial cleaning expertise',
                    'Cleaning tailored to suit each space',
                    'Consistent, well-finished results every time',
                  ].map((point) => (
                    <StaggerItem key={point}>
                      <li className="flex items-center gap-3 text-[0.9375rem] font-medium text-sage-800">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                        {point}
                      </li>
                    </StaggerItem>
                  ))}
                </ul>
              </Stagger>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <FadeIn className="text-center mb-14">
            <h2 className="mb-4">Cleaning services that work around you.</h2>
            <p className="body-text max-w-2xl mx-auto">
              From regular home cleaning to commercial spaces, we tailor each clean to suit the space and how it&apos;s used. No unnecessary extras, just a thorough, well-finished result every time.
            </p>
          </FadeIn>
          <Stagger staggerDelay={0.07}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((service, i) => (
                <StaggerItem key={service.slug} className={i === SERVICES.length - 1 ? 'lg:col-start-2' : ''}>
                  <li className="h-full">
                    <ServiceCard service={service} />
                  </li>
                </StaggerItem>
              ))}
            </ul>
          </Stagger>
        </div>
      </section>

      <ProcessSteps />

      {/* JSON-LD: LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Sano Cleaning',
            description: 'Professional cleaning services in Auckland, New Zealand.',
            url: process.env.NEXT_PUBLIC_SITE_URL,
            areaServed: { '@type': 'City', name: 'Auckland' },
            address: { '@type': 'PostalAddress', addressLocality: 'Auckland', addressCountry: 'NZ' },
            priceRange: '$$',
          }),
        }}
      />

      <CtaBanner />
    </>
  )
}
