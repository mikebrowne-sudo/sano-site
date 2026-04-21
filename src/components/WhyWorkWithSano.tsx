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
    <section className="section-padding pt-24 lg:pt-32 pb-24 lg:pb-28 bg-[#faf9f6]">
      <div className="container-max">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2>Why Work With Us?</h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-center">
          {/* Benefit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-sage-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                  {b.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-sage-800">{b.title}</h3>
                <p className="text-sm leading-relaxed text-sage-600">{b.body}</p>
              </div>
            ))}
          </div>

          {/* Sano crew image — smaller, with subtle left overlap on desktop */}
          <div className="relative rounded-2xl overflow-hidden shadow-md aspect-[4/5] lg:aspect-[3/4] lg:-ml-6 lg:z-10">
            <Image
              src="/images/careers/join-the-sano-crew.jpeg"
              alt="Sano crew members holding a &apos;Join the Sano Crew&apos; sign"
              fill
              sizes="(min-width: 1024px) 400px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
