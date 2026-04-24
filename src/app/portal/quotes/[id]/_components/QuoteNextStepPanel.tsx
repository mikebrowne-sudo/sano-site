// Phase B / Phase C — Next Step panel.
//
// Full-width panel that replaces the sticky action bar when the
// quote has been accepted. Three clearly-separated options so the
// user doesn't have to guess what happens after "Accepted":
//
//   1. Create Invoice First — cash / one-off jobs where payment is
//      expected before the job starts. Uses the existing
//      ConvertToInvoiceButton (which triggers the invoice creation
//      server action), so the underlying logic is unchanged.
//
//   2. Create Job — account clients / commercial work where
//      invoicing happens after the work. Phase C: calls the new
//      createJobFromQuote server action via CreateJobButton, which
//      snapshots the quote scope onto a fresh job row and redirects
//      to the job page.
//
//   3. Create Recurring Job — placeholder for the ongoing-service
//      path used for commercial contracts. Still disabled with a
//      "This option will be available shortly" note until its
//      server action exists.
//
// Visual emphasis — Phase C adds a subtle primary outline to the
// recommended card based on the quote's service category:
//   residential → Invoice First
//   commercial  → Recurring Job
// All three cards still render for both categories per the brief —
// the emphasis is a hint, not a constraint.

import { ConvertToInvoiceButton } from './ConvertToInvoiceButton'
import { CreateJobButton } from './CreateJobButton'
import { Receipt, Briefcase, Repeat } from 'lucide-react'

export interface QuoteNextStepPanelProps {
  quoteId: string
  isConvertible: boolean
  isCommercial: boolean
}

export function QuoteNextStepPanel({ quoteId, isConvertible, isCommercial }: QuoteNextStepPanelProps) {
  const primary: 'invoice' | 'recurring' = isCommercial ? 'recurring' : 'invoice'

  return (
    <section
      className="bg-white border border-sage-100 rounded-xl p-6 md:p-8 mb-8"
      aria-labelledby="next-step-title"
    >
      <h2
        id="next-step-title"
        className="text-xl font-semibold text-sage-800 mb-1"
      >
        What would you like to do next?
      </h2>
      <p className="text-sm text-sage-600 mb-6">
        This quote has been accepted. Choose how to proceed with the work.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NextStepCard
          icon={<Receipt size={20} />}
          title="Create Invoice First"
          description="Use this when payment is required before the job starts."
          emphasised={primary === 'invoice'}
          action={
            isConvertible ? (
              <ConvertToInvoiceButton quoteId={quoteId} />
            ) : (
              <DisabledAction label="Create Invoice + Job" note="Not available for this quote" />
            )
          }
        />

        <NextStepCard
          icon={<Briefcase size={20} />}
          title="Create Job"
          description="Use this for ongoing or account clients where invoicing happens later."
          emphasised={false}
          action={
            isConvertible ? (
              <CreateJobButton quoteId={quoteId} />
            ) : (
              <DisabledAction label="Create Job" note="Not available for this quote" />
            )
          }
        />

        <NextStepCard
          icon={<Repeat size={20} />}
          title="Create Recurring Job"
          description="Set up a repeating service schedule for ongoing services."
          emphasised={primary === 'recurring'}
          action={<DisabledAction label="Create Recurring Job" note="This option will be available shortly" />}
        />
      </div>
    </section>
  )
}

function NextStepCard({
  icon,
  title,
  description,
  action,
  emphasised,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
  emphasised: boolean
}) {
  return (
    <div
      className={
        emphasised
          ? 'relative flex flex-col border-2 border-sage-500 rounded-lg p-5 bg-white shadow-sm'
          : 'flex flex-col border border-sage-100 rounded-lg p-5 bg-sage-50/30 hover:bg-sage-50 transition-colors'
      }
    >
      {emphasised && (
        <span className="absolute -top-2 left-4 bg-sage-500 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-2 text-sage-700 mb-2">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-sage-100 text-sage-600">
          {icon}
        </span>
        <h3 className="text-base font-semibold text-sage-800">{title}</h3>
      </div>
      <p className="text-sm text-sage-600 flex-1 mb-4">{description}</p>
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
