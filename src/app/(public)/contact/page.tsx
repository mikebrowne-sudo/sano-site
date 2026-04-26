import type { Metadata } from 'next'
import { Suspense } from 'react'
import { QuoteRequestStepper } from '@/components/quote-stepper/QuoteRequestStepper'
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
              <p className="eyebrow mb-3">Free quote</p>
              <h1 className="text-sage-800 mb-4">Let&apos;s get your home sparkling.</h1>
              <p className="text-gray-600 leading-relaxed mb-8">
                Fill in the form and we&apos;ll get back to you within a few hours with a fixed quote &mdash; no hidden costs, no obligation.
              </p>
              <div className="mb-8 space-y-3">
                <a href="tel:0800726686" className="flex items-center gap-3 text-sage-800 font-semibold hover:text-sage-500 transition-colors">
                  <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  0800 726 686
                </a>
                <a href="mailto:hello@sano.nz" className="flex items-center gap-3 text-sage-800 font-semibold hover:text-sage-500 transition-colors">
                  <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  hello@sano.nz
                </a>
              </div>
              <ul className="space-y-5">
                {[
                  {
                    title: 'Fast response',
                    body: 'We reply within a few hours on business days.',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    ),
                  },
                  {
                    title: 'No obligation',
                    body: 'A quote is just a quote — no pressure to book.',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    ),
                  },
                  {
                    title: 'Fixed pricing',
                    body: 'The price we quote is the price you pay.',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4 items-start">
                    <span className="mt-0.5 text-sage-600 flex-shrink-0">{item.icon}</span>
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
                <QuoteRequestStepper />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <TrustBar />
    </>
  )
}
