// Phase B / C / D — Next Step panel.
//
// Full-width panel shown when the quote has been accepted. Phase D
// reshapes the three cards to reflect the flexible "choose your
// own path" billing model used by real property managers:
//
//   1. Create Job        — account clients / commercial. No invoice
//                          yet; job.payment_status = 'on_account'.
//   2. Create Invoice    — cash / one-off residential work. Invoice
//                          created; no job row. Matches the legacy
//                          convertToInvoice flow.
//   3. Create Job + Invoice — organise the work now AND send the
//                          invoice. Job links to the new invoice;
//                          job.payment_status = 'payment_pending'.
//
// All three cards render for both service categories. "Recommended"
// emphasis shifts based on category — residential defaults to
// Create Invoice (cash-first), commercial defaults to Create Job +
// Invoice (work is planned and billed together).

import { ConvertToInvoiceButton } from './ConvertToInvoiceButton'
import { CreateJobButton } from './CreateJobButton'
import { CreateJobAndInvoiceButton } from './CreateJobAndInvoiceButton'
import { Briefcase, Receipt, FilePlus } from 'lucide-react'

export interface QuoteNextStepPanelProps {
  quoteId: string
  isConvertible: boolean
  isCommercial: boolean
  /** Phase D.3 — mirror of job_settings.allow_job_before_payment.
   *  When false, the "Create Job" card is disabled for staff with
   *  a "Payment required" hint. Admins bypass the gate. */
  allowJobBeforePayment?: boolean
  isAdmin?: boolean
}

export function QuoteNextStepPanel({
  quoteId,
  isConvertible,
  isCommercial,
  allowJobBeforePayment = true,
  isAdmin = false,
}: QuoteNextStepPanelProps) {
  // Residential → "Create Invoice" recommended (typical cash job).
  // Commercial   → "Create Job + Invoice" recommended (organise the
  //                 work and send the bill together).
  // "Create Job" is never the default recommendation per the brief,
  // but stays fully available and styled the same as the others.
  const recommended: 'job' | 'invoice' | 'both' = isCommercial ? 'both' : 'invoice'
  const jobRecommended = (recommended as string) === 'job'
  const jobBlockedByPayment = !allowJobBeforePayment && !isAdmin

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
          icon={<Briefcase size={20} />}
          title="Create Job"
          description="Use for account clients or when the job needs to be scheduled immediately. No invoice is raised yet."
          emphasised={jobRecommended}
          action={
            !isConvertible ? (
              <DisabledAction label="Create Job" note="Not available for this quote" />
            ) : jobBlockedByPayment ? (
              <DisabledAction
                label="Create Job"
                note="Payment required before job creation"
              />
            ) : (
              <CreateJobButton quoteId={quoteId} />
            )
          }
        />

        <NextStepCard
          icon={<Receipt size={20} />}
          title="Create Invoice"
          description="Use when payment is required before work begins. An invoice is raised; no job is scheduled yet."
          emphasised={recommended === 'invoice'}
          action={
            isConvertible ? (
              <ConvertToInvoiceButton quoteId={quoteId} />
            ) : (
              <DisabledAction label="Create Invoice" note="Not available for this quote" />
            )
          }
        />

        <NextStepCard
          icon={<FilePlus size={20} />}
          title="Create Job + Invoice"
          description="Use when the job needs to be organised now, but payment also needs to be requested."
          emphasised={recommended === 'both'}
          action={
            isConvertible ? (
              <CreateJobAndInvoiceButton quoteId={quoteId} />
            ) : (
              <DisabledAction label="Create Job + Invoice" note="Not available for this quote" />
            )
          }
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
