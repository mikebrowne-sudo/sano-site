import type { Metadata } from 'next'
import { HeroSection } from '@/components/HeroSection'
import { QuickQuoteBar } from '@/components/QuickQuoteBar'
import { TrustBar } from '@/components/TrustBar'
import { ServiceCard } from '@/components/ServiceCard'
import { ProcessSteps } from '@/components/ProcessSteps'
import { CtaBanner } from '@/components/CtaBanner'
import { SERVICES } from '@/lib/services'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Sano Cleaning — Professional Cleaning in Auckland',
  description: 'Professional, eco-friendly cleaning services in Auckland. Regular, deep, end of tenancy, commercial, and more. Vetted cleaners, guaranteed results. Free quotes.',
}

export default function HomePage() {
  return (
    <>
      <HeroSection
        headline="A cleaner home, a clearer mind."
        subtext="Professional, eco-friendly cleaning tailored to your home and schedule. Vetted cleaners, flexible booking, guaranteed results."
        imageUrl="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80"
        imageAlt="Bright, clean modern home"
      />

      <QuickQuoteBar />

      <TrustBar />

      {/* Why Sano */}
      <section className="section-padding py-16 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden fade-up">
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                alt="Sano cleaner at work"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="fade-up" style={{ transitionDelay: '100ms' }}>
              <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest mb-3">Why Sano</p>
              <h2 className="text-sage-800 mb-4">Reliable cleaning, built on experience.</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                With over 20 years of hands-on experience across residential, commercial, and education environments, Sano was built on one thing: doing the job properly. We&apos;re easy to deal with, we show up when we say we will, and we don&apos;t leave until you&apos;re genuinely happy with the result.
              </p>
              <ul className="flex flex-wrap gap-2">
                {['Satisfaction guaranteed', 'Dedicated area manager', 'NZ owned & operated', 'No lock-in contracts', 'Insured & vetted'].map((tag) => (
                  <li key={tag} className="bg-sage-50 border border-sage-100 rounded-lg px-3 py-1.5 text-xs font-medium text-sage-800">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="section-padding py-16 bg-sage-50">
        <div className="container-max">
          <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest text-center mb-2 fade-up">What we offer</p>
          <h2 className="text-center text-sage-800 mb-10 fade-up" style={{ transitionDelay: '80ms' }}>Our Services</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <li key={service.slug} className="fade-up" style={{ transitionDelay: `${i * 80}ms` }}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
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
