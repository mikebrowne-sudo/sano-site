// Phase A — plain-language status sentence.
//
// Short, human sentence that explains what the quote is doing right
// now and what the user is expected to do next. Sits directly under
// the workflow bar. No technical terminology.

export interface QuoteStatusMessageProps {
  status: string | null
  itemCount: number
  isArchived: boolean
  /**
   * Version number of this row. A draft above v1 is a revision of something
   * the client already has, so it gets its own sentence rather than the
   * generic new-quote copy — which read as though nothing had happened after
   * a version fork.
   */
  versionNumber?: number
}

export function QuoteStatusMessage({ status, itemCount, isArchived, versionNumber }: QuoteStatusMessageProps) {
  const text = pickMessage(status, itemCount, isArchived, versionNumber ?? 1)

  return (
    <p className="text-sm text-sage-700 bg-sage-50 border border-sage-100 rounded-md px-4 py-2.5 mb-6">
      {text}
    </p>
  )
}

function pickMessage(
  status: string | null,
  itemCount: number,
  isArchived: boolean,
  versionNumber: number,
): string {
  if (isArchived) {
    return 'This quote has been archived. Restore it if you need to make further changes.'
  }
  const s = (status ?? 'draft').toLowerCase()

  if (s === 'converted') {
    return 'This quote has been converted to an invoice. The quote is now locked.'
  }
  if (s === 'accepted') {
    return 'This quote has been accepted. Choose the next step below.'
  }
  if (s === 'declined') {
    return 'This quote was declined. Review the client\u2019s feedback or prepare a new version.'
  }
  if (s === 'viewed') {
    return 'The client has viewed this proposal. Waiting for their response.'
  }
  if (s === 'sent') {
    return 'This quote has been sent. Waiting for client response.'
  }
  // draft
  if (itemCount === 0) {
    return 'This quote is still being prepared. Add line items or scope before sending.'
  }
  // A draft above v1 is a revision — the client is still holding an earlier
  // version, so "ready to send" alone understates what needs to happen.
  if (versionNumber > 1) {
    return `This is version ${versionNumber} — a revision the client hasn’t received yet. Review the changes, then send it to replace the version they currently have.`
  }
  // "Ready" — draft with scope in place.
  return 'This quote is ready to send. Give the details a final review, then send it to the client.'
}
