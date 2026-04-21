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
    <section className="section-padding pt-20 lg:pt-28 pb-16 lg:pb-20 bg-[#faf9f6]">
      <div className="container-max">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2>Why Work With Us?</h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
          {/* Benefit cards — stack vertically so they sit comfortably beside the image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-sage-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                  {b.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-sage-800">{b.title}</h3>
                <p className="text-sm leading-relaxed text-sage-600">{b.body}</p>
              </div>
            ))}
          </div>

          {/* Sano crew image — smaller than hero, rounded, complementary */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[540px]">
            <Image
              src="/images/careers/join-the-sano-crew.jpeg"
              alt="Sano crew members holding a &apos;Join the Sano Crew&apos; sign"
              fill
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
