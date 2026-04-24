// Phase A — sticky action bar.
//
// Renders a fixed-bottom bar that always has the right actions for
// the current quote stage visible without scrolling. Delegates to
// the existing action components (SendQuotePanel, MarkAsAcceptedButton,
// ConvertToInvoiceButton) so their internal dialogs / server action
// wiring is untouched.
//
// States:
//   Draft  → Preview Proposal · Copy Link · Send Proposal
//   Sent / Viewed → View Proposal · Copy Link · Mark as Accepted · Send Reminder
//   Accepted / Converted / Archived → hidden (Next Step panel or lock
//                                      states take over)
//
// The "Save Quote" action from the brief lives inside EditQuoteForm
// itself (Save is a form-submit that needs form state). A "Back to
// form" link in the bar scrolls to it so the sticky bar keeps Save
// one click away without duplicating form state.

import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import { QuoteCopyLinkButton } from './QuoteCopyLinkButton'
import { SendQuotePanel } from './SendQuotePanel'
import { MarkAsAcceptedButton } from './MarkAsAcceptedButton'

export interface QuoteActionBarProps {
  quoteId: string
  quoteDisplayNumber: string
  status: string | null
  isArchived: boolean
  isLatestVersion: boolean
  isCommercial: boolean
  shareUrl: string
  clientEmail: string
  clientName: string
  primaryContactEmail: string
  accountsEmail: string
  clientReference: string
}

export function QuoteActionBar({
  quoteId,
  quoteDisplayNumber,
  status,
  isArchived,
  isLatestVersion,
  isCommercial,
  shareUrl,
  clientEmail,
  clientName,
  primaryContactEmail,
  accountsEmail,
  clientReference,
}: QuoteActionBarProps) {
  const s = (status ?? 'draft').toLowerCase()

  // Hide in states where the Next Step panel / archive banner owns
  // the primary actions.
  if (isArchived) return null
  if (s === 'accepted' || s === 'converted') return null
  if (!isLatestVersion) return null

  const previewUrl = isCommercial
    ? `/portal/quotes/${quoteId}/proposal/preview`
    : `/portal/quotes/${quoteId}/print`
  const previewLabel = isCommercial ? 'Preview Proposal' : 'Preview Quote'

  const isDraft = s === 'draft'
  const isSent = s === 'sent' || s === 'viewed' || s === 'declined'

  return (
    <div
      className="sticky bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-sage-100 shadow-[0_-2px_6px_rgba(0,0,0,0.04)] -mx-4 md:-mx-10 px-4 md:px-10 py-3 mt-10"
      role="region"
      aria-label="Quote actions"
    >
      <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center gap-2 md:gap-3 justify-end">
        {isDraft && (
          <>
            <Link
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
            >
              <FileText size={16} />
              {previewLabel}
            </Link>
            <QuoteCopyLinkButton shareUrl={shareUrl} />
            <a
              href="#edit-quote-form"
              className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-800 px-3 py-2 text-sm"
            >
              Save Quote →
            </a>
            <SendQuotePanel
              quoteId={quoteId}
              quoteNumber={quoteDisplayNumber}
              clientEmail={clientEmail}
              clientName={clientName}
              printUrl={shareUrl}
              primaryContactEmail={primaryContactEmail}
              accountsEmail={accountsEmail}
              clientReference={clientReference}
            />
          </>
        )}

        {isSent && (
          <>
            <Link
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
            >
              <ExternalLink size={16} />
              View Proposal
            </Link>
            <QuoteCopyLinkButton shareUrl={shareUrl} />
            <MarkAsAcceptedButton quoteId={quoteId} />
            {/* For the Sent state this is effectively a "Send reminder" —
                same mailer flow, same dialog, so SendQuotePanel is reused
                directly. Its internal button reads "Send Quote" but the
                surrounding workflow bar + status message make the reminder
                intent obvious. */}
            <SendQuotePanel
              quoteId={quoteId}
              quoteNumber={quoteDisplayNumber}
              clientEmail={clientEmail}
              clientName={clientName}
              printUrl={shareUrl}
              primaryContactEmail={primaryContactEmail}
              accountsEmail={accountsEmail}
              clientReference={clientReference}
            />
          </>
        )}
      </div>
    </div>
  )
}
