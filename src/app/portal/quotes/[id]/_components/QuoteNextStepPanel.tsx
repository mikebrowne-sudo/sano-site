// Phase B — Next Step panel.
//
// Full-width panel that replaces the sticky action bar when the
// quote has been accepted. Three clearly-separated options so the
// user doesn't have to guess what happens after "Accepted":
//
//   1. Create Invoice First — cash / one-off jobs where payment is
//      expected before the job starts. Uses the existing
//      ConvertToInvoiceButton (which triggers the invoice + job
//      creation server action), so the underlying logic is
//      unchanged.
//
//   2. Create Job — placeholder for the "create job without
//      invoice-first" path used for account clients. Disabled with
//      a "Coming soon" note until the standalone server action is
//      wired up. This keeps the UI consistent without pretending
//      the action works.
//
//   3. Create Recurring Job — placeholder for the ongoing-service
//      path used for commercial contracts. Disabled the same way.
//
// All three cards render for both residential and commercial quotes
// per the brief — no conditional hiding, so the flow reads the same
// everywhere.

import { ConvertToInvoiceButton } from './ConvertToInvoiceButton'
import { Receipt, Briefcase, Repeat } from 'lucide-react'

export interface QuoteNextStepPanelProps {
  quoteId: string
  isConvertible: boolean
}

export function QuoteNextStepPanel({ quoteId, isConvertible }: QuoteNextStepPanelProps) {
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
          action={<DisabledAction label="Create Job" note="Coming soon" />}
        />

        <NextStepCard
          icon={<Repeat size={20} />}
          title="Create Recurring Job"
          description="Set up a repeating service schedule for ongoing services."
          action={<DisabledAction label="Create Recurring Job" note="Coming soon" />}
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
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-col border border-sage-100 rounded-lg p-5 bg-sage-50/30 hover:bg-sage-50 transition-colors">
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
