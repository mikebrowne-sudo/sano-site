import type { Metadata } from 'next'
import { QuoteButton } from '@/components/QuoteButton'
import { CtaBanner } from '@/components/CtaBanner'

export const metadata: Metadata = {
  title: 'Our Guarantee | Sano Cleaning Auckland',
  description:
    "We stand behind every clean. If something's not right, we'll come back and fix it or offer a discount on your next clean. No hassle.",
}

export default function GuaranteePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative section-padding py-16 md:py-20 bg-gradient-to-b from-sage-50 to-white text-center overflow-hidden">
        {/* Soft blurred glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[280px] rounded-full bg-sage-200/40 blur-3xl" />
        </div>

        <div className="relative container-max max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-white border border-sage-200 shadow-sm text-sage-700 text-xs font-semibold tracking-wide uppercase">
            <svg className="w-3.5 h-3.5 text-sage-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Our Promise
          </div>

          <h1 className="text-sage-800 mb-4">Clean with confidence</h1>
          <p className="text-sage-700 text-lg font-medium mb-3">
            We stand behind our work. If something&apos;s not right, we&apos;ll make it right.
          </p>
          <p className="body-text mb-8 max-w-xl mx-auto">
            If anything is missed, just let us know and we&apos;ll come back to fix it or offer a
            discount on your next clean. Simple as that.
          </p>
          <QuoteButton />
        </div>
      </section>

      {/* ── Core Guarantee ── */}
      <section className="section-padding py-12 md:py-16 bg-sage-50">
        <div className="container-max max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl border border-sage-200 shadow-md p-8 md:p-10">
            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sage-700 mb-6">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-sage-800 mb-4">Our Satisfaction Guarantee</h2>
            <div className="body-text space-y-4">
              <p>We stand behind the quality of every clean.</p>
              <p>
                If something&apos;s been missed or you&apos;re not happy with part of the service,
                just let us know. We&apos;ll come back and sort it, or if that&apos;s not practical,
                we&apos;ll offer a discount on your next clean.
              </p>
              <p>
                No hassle. No back and forth. Just a straightforward approach to making sure
                you&apos;re looked after.
              </p>
              <p>
                We aim to get everything right the first time, but what matters most is how
                it&apos;s handled if we don&apos;t.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <h2 className="text-sage-800 mb-3 text-center">How it works</h2>
          <p className="body-text text-center max-w-md mx-auto mb-10">
            Three simple steps — no chasing, no complications.
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                  </svg>
                ),
                title: 'Let us know',
                body: "If something's not quite right, just get in touch and tell us what's been missed.",
              },
              {
                n: '02',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'We sort it',
                body: "We'll arrange to come back and fix it, or offer a fair solution that works for you.",
              },
              {
                n: '03',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
                title: 'Move on with confidence',
                body: 'You can rely on us to stand behind our work every time.',
              },
            ].map((step) => (
              <li
                key={step.n}
                className="bg-sage-50 rounded-2xl border border-sage-200 p-7 md:p-8 text-center shadow-sm transition-all duration-200 hover:shadow-md hover:border-sage-300"
              >
                {/* Number badge with icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-700 ring-4 ring-sage-100 mb-5">
                  {step.icon}
                </div>
                {/* Step number */}
                <p className="text-[11px] font-bold tracking-widest uppercase text-sage-600 mb-1">
                  Step {step.n}
                </p>
                <h3 className="text-sage-800 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Service Promises ── */}
      <section className="section-padding py-10 md:py-14 bg-sage-50">
        <div className="container-max">
          <h2 className="text-sage-800 mb-3 text-center">What you can expect from us</h2>
          <p className="body-text text-center max-w-xl mx-auto mb-8">
            Every visit is backed by the same standard of care and the same commitment to getting it right.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                title: 'Reliable and consistent',
                body: 'We show up when we say we will and deliver a consistent standard every time.',
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Attention to detail',
                body: 'We focus on the small things that are often missed.',
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                title: 'Respect for your space',
                body: 'Your home is treated with care and consideration at all times.',
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
              },
              {
                title: 'We stand behind our work',
                body: "If something's not right, we fix it quickly and without hassle.",
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: 'Clear pricing',
                body: 'No surprises. You know exactly what to expect.',
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                title: 'Built for the long term',
                body: "We're here to provide a service you can rely on ongoing.",
                icon: (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex gap-4 p-6 rounded-2xl border border-sage-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-sage-300"
              >
                <div className="flex-shrink-0 mt-1 w-9 h-9 rounded-xl bg-sage-700 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sage-800 text-[15px] font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="section-padding py-16 md:py-20 bg-gradient-to-br from-sage-800 to-sage-600 text-center">
        <div className="container-max max-w-xl mx-auto">
          {/* Bookend badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-semibold tracking-wide uppercase">
            <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Satisfaction Guaranteed
          </div>
          <h2 className="text-white mb-4">A better standard of cleaning</h2>
          <div className="text-white/80 leading-[1.75] text-[1.0625rem] space-y-3 mb-10">
            <p>
              A lot of people have had a poor experience with cleaning at some point. Usually it
              comes down to missed details or inconsistency.
            </p>
            <p>
              We focus on getting the basics right, every time, and standing behind the result.
            </p>
          </div>
          <QuoteButton variant="white" label="Get a Free Quote" />
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
