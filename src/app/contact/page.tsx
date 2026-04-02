import type { Metadata } from 'next'
import { Suspense } from 'react'
import { QuoteForm } from '@/components/QuoteForm'
import { TrustBar } from '@/components/TrustBar'

export const metadata: Metadata = {
  title: 'Get a Free Quote | Sano Cleaning Auckland',
  description: "Request a free, no-obligation cleaning quote from Sano. We'll get back to you within a few hours. Serving all of Auckland.",
}

export default function ContactPage() {
  return (
    <>
      <section className="section-padding py-16 bg-gradient-to-b from-white to-sage-50">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: info */}
            <div>
              <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest mb-3">Free quote</p>
              <h1 className="text-sage-800 mb-4">Let&apos;s get your home sparkling.</h1>
              <p className="text-gray-600 leading-relaxed mb-8">
                Fill in the form and we&apos;ll get back to you within a few hours with a fixed quote &mdash; no hidden costs, no obligation.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: '⚡', title: 'Fast response', body: 'We reply within a few hours on business days.' },
                  { icon: '💬', title: 'No obligation', body: 'A quote is just a quote — no pressure to book.' },
                  { icon: '🔒', title: 'Fixed pricing', body: 'The price we quote is the price you pay.' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4 items-start">
                    <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-sage-800 text-sm">{item.title}</p>
                      <p className="text-gray-500 text-sm">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right: form */}
            <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
              <h2 className="text-sage-800 mb-6 text-xl">Request a quote</h2>
              <Suspense fallback={<div className="h-64 animate-pulse bg-sage-50 rounded-xl" />}>
                <QuoteForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <TrustBar />
    </>
  )
}
