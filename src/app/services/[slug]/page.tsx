import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SERVICES, getServiceBySlug, getRelatedServices } from '@/lib/services'
import { HeroSection } from '@/components/HeroSection'
import { ServiceCard } from '@/components/ServiceCard'
import { CtaBanner } from '@/components/CtaBanner'
import { QuoteButton } from '@/components/QuoteButton'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getServiceBySlug(params.slug)
  if (!service) return {}
  return {
    title: `${service.name} in Auckland | Sano Cleaning`,
    description: service.metaDescription,
    openGraph: {
      title: `${service.name} in Auckland | Sano Cleaning`,
      description: service.metaDescription,
      images: [{ url: service.heroImage }],
    },
  }
}

export default function ServicePage({ params }: Props) {
  const service = getServiceBySlug(params.slug)
  if (!service) notFound()

  const related = getRelatedServices(service.relatedSlugs)

  return (
    <>
      <HeroSection
        headline={service.name}
        subtext={service.description}
        imageUrl={service.heroImage}
        imageAlt={service.name}
        showSecondaryButton={false}
      />

      {/* What's included */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-sage-800 mb-4">What&apos;s included</h2>
              <ul className="space-y-2.5">
                {service.includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-gray-700">
                    <span className="mt-0.5 text-sage-500 font-bold" aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-sage-50 rounded-2xl p-6 self-start">
              <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest mb-2">Get a Quote</p>
              <p className="text-sage-800 text-lg font-semibold mb-2">Tailored to your space</p>
              <p className="text-gray-500 text-sm mb-5">Every job is different. Get in touch and we&apos;ll put together a quote based on your space and requirements.</p>
              <QuoteButton label={`Get a ${service.name} Quote`} className="w-full text-center block" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-padding py-8 md:py-10 bg-sage-50">
        <div className="container-max">
          <h2 className="text-sage-800 mb-4 text-center">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 text-center">
            {[
              { n: '01', title: 'Book', body: "Fill in our quick quote form and we'll confirm your booking within hours." },
              { n: '02', title: 'We clean', body: 'Our vetted cleaner arrives fully equipped with eco-friendly products.' },
              { n: '03', title: 'You relax', body: 'Enjoy your spotless space. We guarantee your satisfaction.' },
            ].map((step) => (
              <li key={step.n}>
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-sage-100 text-sage-800 font-display text-lg mb-2.5">{step.n}</div>
                <h3 className="mb-1.5">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="section-padding py-10 md:py-14 bg-white">
          <div className="container-max">
            <h2 className="text-sage-800 mb-4">You might also need</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((s) => (
                <li key={s.slug}>
                  <ServiceCard service={s} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* JSON-LD: Service schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: service.name,
            description: service.metaDescription,
            provider: { '@type': 'LocalBusiness', name: 'Sano Cleaning' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner headline={`Ready to book a ${service.name}?`} />
    </>
  )
}
