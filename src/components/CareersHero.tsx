import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div>
            <p className="eyebrow mb-4">Careers</p>
            <h1 className="mb-6">Join Our Team</h1>
            <p className="body-text max-w-xl mb-8">
              We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
            </p>
            <Link
              href="/join-our-team/apply"
              className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
            >
              Apply Now
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Hero image */}
          <div className="relative rounded-2xl overflow-hidden shadow-sm aspect-[4/5]">
            <Image
              src="/images/careers/join-our-team-hero.jpg"
              alt="A team celebrating with their hands raised"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
