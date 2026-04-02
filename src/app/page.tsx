import type { Metadata } from 'next'
import { HeroSection } from '@/components/HeroSection'
import { QuickQuoteBar } from '@/components/QuickQuoteBar'
import { TrustBar } from '@/components/TrustBar'
import { ServiceCard } from '@/components/ServiceCard'
import { ProcessSteps } from '@/components/ProcessSteps'
import { TestimonialGrid } from '@/components/TestimonialGrid'
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
        badge="4.9★ Trusted by Auckland homes"
        headline="A cleaner home, a clearer mind."
        subtext="Professional, eco-friendly cleaning tailored to your home and schedule. Vetted cleaners, flexible booking, guaranteed results."
        imageUrl="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80"
        imageAlt="Bright, clean modern living room"
      />

      <QuickQuoteBar />

      <TrustBar />

      {/* Why Sano */}
      <section className="section-padding py-16 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                alt="Sano cleaner at work"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest mb-3">Why Sano</p>
              <h2 className="text-sage-800 mb-4">Cleaning you can trust, every time.</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Every Sano cleaner is background-checked, trained, and fully insured. We use eco-friendly products that are safe for children and pets — and we back every clean with a satisfaction guarantee.
              </p>
              <ul className="flex flex-wrap gap-2">
                {['Satisfaction guarantee', 'Child & pet safe', 'Background checked', 'Fully insured', 'Eco-friendly'].map((tag) => (
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
          <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest text-center mb-2">What we offer</p>
          <h2 className="text-center text-sage-800 mb-10">Our Services</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ProcessSteps />

      <TestimonialGrid />

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
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '120' },
          }),
        }}
      />

      <CtaBanner />
    </>
  )
}
