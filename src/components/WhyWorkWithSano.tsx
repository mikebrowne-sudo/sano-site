import Image from 'next/image'
import { Clock3, GraduationCap, Users } from 'lucide-react'
import type React from 'react'

interface Benefit {
  icon: React.ReactNode
  title: string
  body: string
}

const BENEFITS: Benefit[] = [
  {
    icon: <Clock3 className="w-6 h-6" />,
    title: 'Flexible Hours',
    body: 'We work around your schedule to help you maintain a healthy work-life balance.',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Training & Development',
    body: 'Hands-on training and ongoing support to help you build confidence and grow.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Great Team Culture',
    body: 'Be part of a friendly, supportive team that takes pride in what we do.',
  },
]

export function WhyWorkWithSano() {
  return (
    <section className="section-padding py-20 lg:py-24 bg-white">
      <div className="container-max max-w-7xl mx-auto">
        <div className="relative">
          {/* Background accent image — sits BEHIND the cards on lg+, offset right so it peeks out */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute right-[-32px] top-1/2 -translate-y-1/2 w-[400px] aspect-[4/3] rounded-2xl overflow-hidden shadow-md z-0"
          >
            <Image
              src="/images/careers/join-the-sano-crew.jpeg"
              alt=""
              fill
              sizes="400px"
              className="object-cover"
            />
          </div>

          {/* Cream inner panel — sits in front of the image */}
          <div className="relative z-10 rounded-2xl bg-[#faf9f6] px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16 lg:pr-[220px]">
            <p className="eyebrow text-sage-500 mb-3">BENEFITS</p>
            <h2 className="font-sans font-bold mb-10">
              <span className="text-gray-900">Why </span>
              <span className="text-sage-500">Work With Us?</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border border-sage-200 bg-white px-6 py-5 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                    {b.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-sage-800">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-sage-600">{b.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile image — visible inline below the cards on smaller screens */}
          <div className="lg:hidden mt-6 rounded-2xl overflow-hidden shadow-md aspect-[4/3]">
            <Image
              src="/images/careers/join-the-sano-crew.jpeg"
              alt="Sano crew members holding a &apos;Join the Sano Crew&apos; sign"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
