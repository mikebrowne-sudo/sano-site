import type { Metadata } from 'next'
import { FaqAccordion } from '@/components/FaqAccordion'
import { FAQ_CATEGORIES } from '@/lib/faq'
import { CtaBanner } from '@/components/CtaBanner'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ | Sano Cleaning Auckland',
  description: 'Answers to common questions about Sano Cleaning: pricing, booking, our cleaners, products, and more.',
}

export default function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_CATEGORIES.flatMap((cat) =>
      cat.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      }))
    ),
  }

  return (
    <>
      <section className="section-padding py-16 bg-gradient-to-b from-white to-sage-50">
        <div className="container-max">
          <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest text-center mb-2">Help</p>
          <h1 className="text-center text-sage-800 mb-4">Frequently Asked Questions</h1>
          <p className="text-center text-gray-600 max-w-lg mx-auto mb-12">
            {"Can't find what you're looking for? "}
            <Link href="/contact" className="text-sage-800 underline underline-offset-2 hover:text-sage-500">
              Get in touch
            </Link>
            {" and we'll answer within a few hours."}
          </p>
          <FaqAccordion categories={FAQ_CATEGORIES} />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <CtaBanner />
    </>
  )
}
