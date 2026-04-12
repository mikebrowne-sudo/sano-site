'use client'

import { cn } from '@/lib/utils'
import { Layers, Search, Zap } from 'lucide-react'
import type React from 'react'
import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'
import { FadeIn } from '@/components/FadeIn'

interface StepCardProps {
  icon: React.ReactNode
  title: string
  description: string
  benefits: string[]
}

const StepCard: React.FC<StepCardProps> = ({ icon, title, description, benefits }) => (
  <div className={cn(
    'relative rounded-2xl border border-sage-100 bg-white p-6 text-sage-800',
    'transition-all duration-300 ease-in-out hover:shadow-md hover:scale-[1.03]'
  )}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
      {icon}
    </div>
    <h3 className="mb-2 text-lg font-semibold text-sage-800">{title}</h3>
    <p className="mb-5 text-sm leading-relaxed text-sage-600">{description}</p>
    <ul className="space-y-3">
      {benefits.map((benefit) => (
        <li key={benefit} className="flex items-center gap-3">
          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-sage-100">
            <div className="h-2 w-2 rounded-full bg-sage-500" />
          </div>
          <span className="text-sm text-sage-600">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
)

const stepsData = [
  {
    icon: <Search className="h-6 w-6" />,
    title: 'Get a quote',
    description: "Send through a few details about your space and what you need. We'll come back to you quickly with a clear, no-pressure quote.",
    benefits: [
      'Fast response during business hours',
      'Clear pricing with no surprises',
      'No obligation to book',
    ],
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: 'We take care of it',
    description: 'We organise the clean, show up on time, and get straight into it. Every job is handled with care and attention to detail.',
    benefits: [
      'Reliable, vetted cleaning teams',
      'All equipment and products supplied',
      'Consistent, well-finished results',
    ],
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Walk into a better space',
    description: 'You come back to a space that feels clean, fresh, and properly finished. No chasing, no hassle.',
    benefits: [
      'A noticeable difference straight away',
      'Spaces that feel easier to be in',
      'Ongoing cleans available if needed',
    ],
  },
]

const cardVariants: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 1,
      duration: 0.7,
    },
  }),
}

export function ProcessSteps() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' })

  return (
    <section className="section-padding section-y bg-[#faf9f6]">
      <div className="container-max">
        <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="mb-4">Simple from start to finish.</h2>
          <p className="body-text">
            A straightforward process that keeps things easy, with a clean that&apos;s done properly every time.
          </p>
        </FadeIn>

        {/* Step numbers with connecting line */}
        <div className="relative mx-auto mb-6 w-full max-w-5xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-px w-[66.6667%] -translate-y-1/2 bg-sage-100"
          />
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                className="flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-white border border-sage-100 text-sm font-semibold text-sage-600 ring-4 ring-[#faf9f6]"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Cards — slide in left to right */}
        <div ref={ref} className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <motion.div
              key={step.title}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              <StepCard {...step} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
