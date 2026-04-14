import type { Metadata } from 'next'
import { ServiceCard } from '@/components/ServiceCard'
import { CtaBanner } from '@/components/CtaBanner'
import { SERVICES } from '@/lib/services'

export const metadata: Metadata = {
  title: 'Cleaning Services in Auckland | Sano Cleaning',
  description: 'Browse all Sano cleaning services in Auckland: regular, deep, end of tenancy, commercial, carpet, windows, and post-construction. Free quotes.',
}

export default function ServicesPage() {
  return (
    <>
      <section className="section-padding py-10 md:py-14 bg-gradient-to-b from-white to-sage-50">
        <div className="container-max">
          <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest text-center mb-2">What we offer</p>
          <h1 className="text-center text-sage-800 mb-3">Our Cleaning Services</h1>
          <p className="text-center text-gray-600 max-w-xl mx-auto mb-8">
            From regular home maintenance to deep one-off cleans, we have a service for every need. All delivered by vetted, insured cleaners using eco-friendly products.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner />
    </>
  )
}
