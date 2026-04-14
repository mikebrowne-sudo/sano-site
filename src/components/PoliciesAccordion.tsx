'use client'

import { useState } from 'react'

type Policy = {
  id: string
  title: string
  content: React.ReactNode
}

const POLICIES: Policy[] = [
  {
    id: 'access',
    title: 'Access & Lockout',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          We value both your time and our cleaners&apos; time, so it&apos;s important that access
          is sorted before your booking.
        </p>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            Before your booking
          </p>
          <ul className="space-y-1.5">
            {[
              'Leave keys in an agreed and secure location, or',
              'Have someone present to let us in',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p>We&apos;ll send a reminder before your booking to help keep things on track.</p>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            If we can&apos;t access the property
          </p>
          <ul className="space-y-1.5">
            {[
              "We'll try to reach you shortly after arrival",
              "If we're unable to make contact, a lockout fee may apply",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            Delays &amp; lockouts
          </p>
          <ul className="space-y-1.5">
            {[
              'If access is delayed, a small waiting fee may apply',
              'If access is not possible at all, a lockout fee of up to 75% of the service may apply',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-gray-400 text-[12px] border-t border-sage-100 pt-3 mt-1">
          Fees help cover travel, time, and disruption to the schedule.
        </p>
      </div>
    ),
  },
  {
    id: 'cancellations',
    title: 'Cancellations & Rescheduling',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          We ask for at least{' '}
          <span className="font-semibold text-sage-700">24 hours&apos; notice</span> if you need to
          cancel or move a booking.
        </p>
        <div className="bg-sage-50 rounded-xl px-4 py-3 border border-sage-100">
          <p className="text-[13px] font-semibold text-sage-700 mb-1">Within 24 hours</p>
          <p>A cancellation fee of up to 50% of the service may apply.</p>
        </div>
        <p>
          We understand that life happens. If it&apos;s a genuine situation, we&apos;ll always try
          to be fair and find a solution that works.
        </p>
        <p>
          Repeated late changes may affect the availability of future bookings.
        </p>
      </div>
    ),
  },
  {
    id: 'payment',
    title: 'Payment Terms',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            One-off &amp; deep cleans
          </p>
          <ul className="space-y-1.5">
            {[
              'Full payment is required prior to the service, or',
              'A deposit is taken with the balance due on the day',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            Regular cleans
          </p>
          <ul className="space-y-1.5">
            {['Payment is due after invoicing, unless otherwise agreed'].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            Accepted payment methods
          </p>
          <ul className="space-y-1.5">
            {['Bank transfer', 'Credit or debit card'].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-gray-400 text-[12px] border-t border-sage-100 pt-3">
          Overdue invoices may incur a small late payment fee.
        </p>
      </div>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          We respect your privacy. We only collect the information we need to deliver our services
          and keep things running smoothly.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
              What we collect
            </p>
            <ul className="space-y-1.5">
              {[
                'Name and contact details',
                'Property address',
                'Booking and service history',
                'Payment information',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
              How we use it
            </p>
            <ul className="space-y-1.5">
              {[
                'Managing bookings and services',
                'Communicating with you',
                'Improving our service',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p>
          We do not sell or share your information with third parties, except where required to
          deliver the service or by law.
        </p>
        <p>
          You can request access to or removal of your information at any time by getting in touch.
        </p>
      </div>
    ),
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>By booking with Sano, you agree to the following terms.</p>

        <div className="space-y-3">
          {[
            {
              title: 'Access',
              body: "Please ensure safe, unobstructed access to the property. Where possible, secure pets and set aside any fragile or valuable items before we arrive.",
            },
            {
              title: 'Our Guarantee',
              body: "If something isn\u2019t right, let us know within 24 hours and we\u2019ll come back to fix it or make it right — no hassle.",
            },
            {
              title: 'Liability',
              body: "We are fully insured. Any damage attributed to our team must be reported within a reasonable timeframe. Normal wear and tear is not covered.",
            },
            {
              title: 'Right to Refuse',
              body: 'We reserve the right to decline or stop a service if conditions are unsafe, inappropriate, or outside the agreed scope of work.',
            },
          ].map(({ title, body }) => (
            <div key={title} className="rounded-xl bg-sage-50 border border-sage-100 px-4 py-3">
              <p className="font-semibold text-sage-800 text-[13px] mb-1">{title}</p>
              <p className="text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'damage',
    title: 'Damage & Issues',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          We take great care with every clean. But if something doesn&apos;t seem right after we
          visit, here&apos;s how to handle it.
        </p>

        <div>
          <p className="text-[13px] font-semibold text-sage-700 uppercase tracking-wide mb-2">
            How to report an issue
          </p>
          <ul className="space-y-1.5">
            {[
              'Get in touch as soon as possible after noticing the issue',
              'Include photos and a short description of what happened',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p>
          We&apos;ll review the issue promptly and, where appropriate, resolve it through repair,
          replacement, or our insurance process.
        </p>

        <p className="text-gray-400 text-[12px] border-t border-sage-100 pt-3">
          We&apos;re here to make it right. Please don&apos;t hesitate to reach out.
        </p>
      </div>
    ),
  },
]

export function PoliciesAccordion() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {POLICIES.map((policy) => {
        const isOpen = openIds.has(policy.id)
        return (
          <div
            key={policy.id}
            className="rounded-2xl border bg-white overflow-hidden transition-all duration-200"
            style={{
              borderColor: isOpen ? '#a8c5b0' : '#c8dcd0',
              boxShadow: isOpen
                ? '0 8px 32px rgba(52,76,61,0.12), 0 1px 4px rgba(52,76,61,0.06)'
                : '0 2px 10px rgba(52,76,61,0.06), 0 1px 3px rgba(52,76,61,0.04)',
            }}
            onMouseEnter={(e) => {
              if (!isOpen) {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 6px 24px rgba(52,76,61,0.10), 0 1px 4px rgba(52,76,61,0.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isOpen) {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 2px 10px rgba(52,76,61,0.06), 0 1px 3px rgba(52,76,61,0.04)'
              }
            }}
          >
            {/* Header button */}
            <button
              type="button"
              onClick={() => toggle(policy.id)}
              className={`w-full flex items-center justify-between px-5 py-5 md:px-6 text-left gap-4 transition-colors duration-150 ${
                isOpen ? 'bg-sage-50' : 'hover:bg-[#fafcfa]'
              }`}
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-sage-800 text-[15px] leading-snug">
                {policy.title}
              </span>
              {/* Icon: white circle with border when closed, sage filled when open */}
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isOpen
                    ? 'bg-sage-700 text-white rotate-180'
                    : 'bg-white text-sage-500'
                }`}
                style={
                  isOpen
                    ? undefined
                    : { border: '1px solid #c8dcd0' }
                }
                aria-hidden="true"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            {/* Animated content via CSS grid-rows */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 md:px-6 pb-6 pt-4 border-t border-sage-100">
                  {policy.content}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
