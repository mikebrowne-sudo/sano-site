import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden bg-sage-800">
      {/* Background image */}
      <Image
        src="/images/careers/sano-team-hero.jpg"
        alt="The Sano team standing together"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Dark overlay for text legibility */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 w-full section-padding py-20 lg:py-28 text-center text-white">
        <p className="eyebrow text-sage-100 mb-4">Careers</p>
        <h1 className="text-white mb-6">Join Our Team</h1>
        <p className="body-text !text-sage-100 max-w-xl mx-auto mb-8">
          We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
        </p>
        <Link
          href="/join-our-team/apply"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-sage-800 hover:bg-sage-50 transition-colors"
        >
          Apply Now
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
