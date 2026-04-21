import { FileEdit, MessageSquare, Users, ShieldCheck, Sparkles } from 'lucide-react'
import type React from 'react'

interface Step {
  icon: React.ReactNode
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: <FileEdit className="w-6 h-6" />,
    title: 'Apply Online',
    body: 'Complete our short application form.',
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Get to Know You',
    body: "Answer a few questions so we can learn more about you.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Interview',
    body: "We'll invite selected candidates for a chat.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Reference Check',
    body: "We'll check your references and background.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Welcome Aboard',
    body: "Successful? We'll welcome you to the Sano crew!",
  },
]

export function CareersProcess() {
  return (
    <section className="section-padding py-24 lg:py-28 bg-white">
      <div className="container-max">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="eyebrow text-sage-500 mb-3">OUR PROCESS</p>
          <h2>Our 5-Step Application Process</h2>
        </div>

        {/* Desktop: horizontal row with dotted connectors between icons */}
        <div className="relative mx-auto hidden max-w-6xl md:block">
          <div className="relative grid grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center relative">
                {/* Dotted connector — drawn to the right except on the last step */}
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute top-7 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] border-t-2 border-dotted border-sage-200"
                  />
                )}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-sage-50 text-sage-600">
                  {step.icon}
                </div>
                <p className="mt-4 text-sm font-semibold text-sage-800">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-sage-600 max-w-[160px]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <ol className="mx-auto max-w-md space-y-6 md:hidden">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-600">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-sage-800">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sage-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
