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
import { DownloadPdfButton } from './DownloadPdfButton'
import { QuoteCopyLinkButton } from './QuoteCopyLinkButton'
import { SendQuotePanel } from './SendQuotePanel'
import { MarkAsAcceptedButton } from './MarkAsAcceptedButton'
import { ReviseQuoteButton } from './ReviseQuoteButton'

export interface QuoteActionBarProps {
  quoteId: string
  quoteDisplayNumber: string
  status: string | null
  isArchived: boolean
  isLatestVersion: boolean
  /** Version number of this row — the fork source for Revise & resend. */
  versionNumber: number
  isCommercial: boolean
  shareUrl: string
  clientEmail: string
  greeting: string
  staffEmail: string
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
  versionNumber,
  isCommercial,
  shareUrl,
  clientEmail,
  greeting,
  staffEmail,
  primaryContactEmail,
  accountsEmail,
  clientReference,
}: QuoteActionBarProps) {
  const s = (status ?? 'draft').toLowerCase()

  // Hide in states where the Next Step panel / archive banner owns
  // the primary actions.
  //
  // `accepted` used to be hidden here alongside `converted`, on the
  // assumption that the Next Step panel supplies everything an accepted
  // quote needs. That panel only offers job/invoice conversion — it has no
  // Preview, Download or Send. So an accepted quote had NO way to view or
  // re-send its own document. Accepted now keeps a read-only action set
  // (preview / download / copy link) minus the send + accept controls,
  // which belong to the draft and sent states respectively.
  if (isArchived) return null
  if (s === 'converted') return null
  if (!isLatestVersion) return null

  const previewUrl = isCommercial
    ? `/portal/quotes/${quoteId}/proposal/preview`
    : `/portal/quotes/${quoteId}/print`
  const previewLabel = isCommercial ? 'Preview Proposal' : 'Preview Quote'

  const isDraft = s === 'draft'
  const isSent = s === 'sent' || s === 'viewed' || s === 'declined'
  const isAccepted = s === 'accepted'

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
            {!isCommercial && (
              <DownloadPdfButton href={`/api/quotes/${quoteId}/pdf`} />
            )}
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
              greeting={greeting}
              printUrl={shareUrl}
              staffEmail={staffEmail}
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
            {!isCommercial && (
              <DownloadPdfButton href={`/api/quotes/${quoteId}/pdf`} />
            )}
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
              greeting={greeting}
              printUrl={shareUrl}
              staffEmail={staffEmail}
              primaryContactEmail={primaryContactEmail}
              accountsEmail={accountsEmail}
              clientReference={clientReference}
            />
          </>
        )}

        {/* Accepted — the client has agreed to this version. Deliberately no
            plain Send (re-sending an agreed document unchanged invites
            confusion about what is current) and no Mark as Accepted (already
            done). The operator still needs to read and hand out the document
            they're about to schedule work from, and needs an obvious route to
            revising it: "Revise & resend" forks a new draft and lands on it,
            where the isDraft branch above supplies the full send controls. */}
        {isAccepted && (
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
            {!isCommercial && (
              <DownloadPdfButton href={`/api/quotes/${quoteId}/pdf`} />
            )}
            <QuoteCopyLinkButton shareUrl={shareUrl} />
            <ReviseQuoteButton
              quoteId={quoteId}
              versionNumber={versionNumber}
              status="accepted"
              isCommercial={isCommercial}
            />
          </>
        )}
      </div>
    </div>
  )
}
