import Link from 'next/link'
import { ArrowRight, Clock3 } from 'lucide-react'

export function CareersApplyCTA() {
  return (
    <section className="section-padding pt-0 pb-12 bg-white">
      <div className="container-max">
        <div className="mx-auto max-w-3xl rounded-2xl bg-sage-50/60 border border-sage-100 shadow-sm px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 text-sm text-sage-600">
            <Clock3 className="w-4 h-4" aria-hidden="true" />
            Takes 7+ minutes
          </p>
          <Link
            href="/join-our-team/apply"
            className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors whitespace-nowrap"
          >
            Apply Now
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
