'use client'

// Phase 5.5.16 — collapsed Next Step panel.
//
// Replaces the Phase D "menu of four" (Create Job / Invoice / Both /
// Recurring) with a single primary call-to-action and a "More options"
// disclosure for the rare cases. Job-first is the default — every
// other path either exists for compatibility or is appropriate only
// for specific situations.
//
// Layout:
//   - Primary card: Create Job. Always emphasised.
//   - Secondary disclosure: Create Invoice (cash-only edge case),
//     Create Recurring Job (ongoing contracts), and the legacy
//     Create Job + Invoice combo (kept reachable for muscle-memory
//     users; will be removed in a follow-up phase once analytics
//     confirm it's unused).

import { useState } from 'react'
import { ConvertToInvoiceButton } from './ConvertToInvoiceButton'
import { CreateJobButton } from './CreateJobButton'
import { CreateJobAndInvoiceButton } from './CreateJobAndInvoiceButton'
import { CreateRecurringJobButton } from './CreateRecurringJobButton'
import { Briefcase, Receipt, FilePlus, Repeat, ChevronDown, ChevronUp } from 'lucide-react'
import type { JobSetupSeed } from './JobSetupWizard'

export interface QuoteNextStepPanelProps {
  quoteId: string
  isConvertible: boolean
  isCommercial: boolean
  jobSetupSeed: JobSetupSeed
}

export function QuoteNextStepPanel({ quoteId, isConvertible, isCommercial, jobSetupSeed }: QuoteNextStepPanelProps) {
  const [showMore, setShowMore] = useState(false)

  return (
    <section
      className="bg-white border border-sage-100 rounded-xl p-6 md:p-8 mb-8"
      aria-labelledby="next-step-title"
    >
      <h2 id="next-step-title" className="text-xl font-semibold text-sage-800 mb-1">
        Next step
      </h2>
      <p className="text-sm text-sage-600 mb-6">
        Quote accepted. Set up the job to schedule the work.
      </p>

      {/* Primary CTA */}
      <div className="border-2 border-sage-500 rounded-lg p-5 bg-white shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sage-100 text-sage-600 shrink-0">
            <Briefcase size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-sage-800">Create job</h3>
            <p className="text-sm text-sage-600 mt-0.5">
              Schedule the work. Job price, allowed hours and scope carry across from
              this quote — you only pick the date, time and worker.
            </p>
          </div>
        </div>
        <div className="ml-13 pl-0 md:pl-13">
          {isConvertible ? (
            <CreateJobButton seed={jobSetupSeed} />
          ) : (
            <DisabledAction label="Create job" note="Not available for this quote" />
          )}
        </div>
      </div>

      {/* More options disclosure */}
      <div className="mt-4 border-t border-sage-100 pt-3">
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-800 transition-colors"
          aria-expanded={showMore}
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          More options ({isCommercial ? 'commercial' : 'cash sale'} / recurring)
        </button>

        {showMore && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <SecondaryCard
              icon={<Receipt size={16} />}
              title="Create invoice only"
              description="Bill the client without scheduling work — rare cash-sale shortcut."
              action={
                isConvertible
                  ? <ConvertToInvoiceButton quoteId={quoteId} />
                  : <DisabledAction label="Create invoice" note="Not available" />
              }
            />
            <SecondaryCard
              icon={<FilePlus size={16} />}
              title="Job + invoice together"
              description="Create both at once when the client pays up-front."
              action={
                isConvertible
                  ? <CreateJobAndInvoiceButton quoteId={quoteId} />
                  : <DisabledAction label="Create job + invoice" note="Not available" />
              }
            />
            <SecondaryCard
              icon={<Repeat size={16} />}
              title="Recurring contract"
              description={isCommercial
                ? 'Ongoing commercial service — contract term + reminders.'
                : 'Ongoing service for this client.'}
              action={
                isConvertible
                  ? <CreateRecurringJobButton quoteId={quoteId} />
                  : <DisabledAction label="Recurring" note="Not available" />
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}

function SecondaryCard({
  icon, title, description, action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-col border border-sage-100 rounded-lg p-4 bg-sage-50/40">
      <div className="flex items-center gap-2 text-sage-700 mb-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-sage-600 border border-sage-100">
          {icon}
        </span>
        <h4 className="text-sm font-semibold text-sage-800">{title}</h4>
      </div>
      <p className="text-xs text-sage-600 flex-1 mb-3 leading-relaxed">{description}</p>
      <div>{action}</div>
    </div>
  )
}

function DisabledAction({ label, note }: { label: string; note: string }) {
  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 font-medium px-4 py-2.5 rounded-lg text-sm cursor-not-allowed"
      >
        {label}
      </button>
      <span className="text-[11px] text-gray-500">{note}</span>
    </div>
  )
}
