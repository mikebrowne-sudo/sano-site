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
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>
          We value both your time and our cleaners&apos; time, so access needs to be sorted before your booking.
        </p>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">Please arrange one of the following:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Keys left in an agreed location
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Someone present to let us in
            </li>
          </ul>
        </div>
        <p>We&apos;ll send a reminder before your booking to help keep things on track.</p>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">If we can&apos;t access the property:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              We&apos;ll try to contact you shortly after arrival
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              If we can&apos;t reach you, a lockout fee may apply
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">If access is provided after a delay:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              A small fee may apply to cover the cleaner&apos;s waiting time
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">If access isn&apos;t possible at all:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              A lockout fee of up to 75% of the service may apply, capped at a reasonable amount
            </li>
          </ul>
        </div>
        <p className="text-gray-400 text-xs pt-1">
          This helps cover travel, time, and disruption to the schedule.
        </p>
      </div>
    ),
  },
  {
    id: 'cancellations',
    title: 'Cancellations & Rescheduling',
    content: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>
          We ask for at least{' '}
          <span className="font-medium text-gray-700">24 hours&apos; notice</span> if you need to
          cancel or reschedule.
        </p>
        <p>Changes made within 24 hours may incur a fee of up to 50% of the service.</p>
        <p>
          We understand things come up. If it&apos;s a genuine situation, we&apos;ll always try to
          be fair. Ongoing late changes may affect future bookings.
        </p>
      </div>
    ),
  },
  {
    id: 'payment',
    title: 'Payment Terms',
    content: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <div>
          <p className="font-medium text-gray-700 mb-1.5">For one-off and deep cleans:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Payment is required before the service, or
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              A deposit may be taken with the balance due on the day
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">For regular cleans:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Payment is due after invoicing unless otherwise agreed
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">We accept:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Bank transfer
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Credit or debit card
            </li>
          </ul>
        </div>
        <p>Late payments may incur a small fee if left outstanding.</p>
      </div>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    content: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>
          We respect your privacy and only collect the information we need to run our services
          properly.
        </p>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">This may include:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Name and contact details
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Address
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Booking and service information
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Payment details
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">We use this to:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Manage bookings and services
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Communicate with you
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Improve our service
            </li>
          </ul>
        </div>
        <p>
          We don&apos;t sell or share your information with third parties unless required to deliver
          the service or by law.
        </p>
        <p>You can request access or removal of your information at any time.</p>
      </div>
    ),
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    content: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>By booking with Sano, you agree to the following:</p>
        <div>
          <p className="font-medium text-gray-700 mb-1">Access</p>
          <p>
            Please ensure safe, clear access to the property. Secure pets and remove fragile or
            valuable items where possible.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1">Our Guarantee</p>
          <p>
            If something isn&apos;t right, let us know within 24 hours and we&apos;ll come back to
            fix it or make it right.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1">Liability</p>
          <p>
            We are fully insured. Any damage caused by our team should be reported within a
            reasonable timeframe. This does not include normal wear and tear.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-1">Right to Refuse</p>
          <p>
            We may decline or stop services where conditions are unsafe or inappropriate.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'damage',
    title: 'Damage & Issues',
    content: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>
          We take care in every job, but if something goes wrong, we&apos;ll work through it
          properly.
        </p>
        <div>
          <p className="font-medium text-gray-700 mb-1.5">If you notice an issue:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Let us know as soon as possible
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-sage-400 shrink-0 mt-0.5 select-none" aria-hidden="true">—</span>
              Send through photos and a short explanation
            </li>
          </ul>
        </div>
        <p>
          We&apos;ll review it quickly and, where appropriate, resolve it through repair,
          replacement, or insurance.
        </p>
      </div>
    ),
  },
]

export function PoliciesAccordion() {
  const [openId, setOpenId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {POLICIES.map((policy) => {
        const isOpen = openId === policy.id
        return (
          <div
            key={policy.id}
            className={`rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
              isOpen
                ? 'border-sage-300 shadow-md'
                : 'border-sage-200 shadow-sm hover:shadow-md hover:border-sage-300'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(policy.id)}
              className="w-full flex items-center justify-between px-5 py-5 md:px-6 text-left gap-4 cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-sage-800 text-[15px] leading-snug">
                {policy.title}
              </span>
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isOpen ? 'bg-sage-700 text-white rotate-180' : 'bg-sage-100 text-sage-600'
                }`}
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

            {/* Animated expand/collapse via CSS grid-rows trick */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 md:px-6 pb-6 border-t border-sage-100 pt-4">
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
