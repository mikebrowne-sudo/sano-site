import Link from 'next/link'
import { ArrowRight, Clock3, Mail, Phone } from 'lucide-react'

export function CareersContact() {
  return (
    <section className="section-padding pt-0 pb-24 lg:pb-28 bg-white">
      <div className="container-max">
        <div className="mx-auto max-w-6xl rounded-2xl bg-sage-50 px-6 py-10 sm:px-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
            {/* Heading + body */}
            <div>
              <h2 className="mb-3">Ready to Join the Sano Crew?</h2>
              <p className="body-text">
                If you&apos;re unsure about anything or want to check if this is the right fit, feel free to get in touch.
              </p>
            </div>

            {/* Apply button + contact links */}
            <div className="flex flex-col sm:flex-row lg:flex-row gap-4 items-stretch sm:items-center lg:items-center">
              <div className="flex flex-col items-center sm:items-start">
                <Link
                  href="/join-our-team/apply"
                  className="inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 text-sm font-medium text-white hover:bg-sage-800 transition-colors whitespace-nowrap"
                >
                  Apply Now
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-sage-600">
                  <Clock3 className="w-3.5 h-3.5" aria-hidden="true" />
                  Takes 7+ minutes
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm">
                <a
                  href="tel:0800726686"
                  className="inline-flex items-center gap-2 text-sage-800 hover:text-sage-500 transition-colors"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  0800 726 686
                </a>
                <a
                  href="mailto:hello@sano.nz"
                  className="inline-flex items-center gap-2 text-sage-800 hover:text-sage-500 transition-colors"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  hello@sano.nz
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
