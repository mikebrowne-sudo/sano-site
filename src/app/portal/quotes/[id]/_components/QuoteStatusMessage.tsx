// Phase A — plain-language status sentence.
//
// Short, human sentence that explains what the quote is doing right
// now and what the user is expected to do next. Sits directly under
// the workflow bar. No technical terminology.

export interface QuoteStatusMessageProps {
  status: string | null
  itemCount: number
  isArchived: boolean
}

export function QuoteStatusMessage({ status, itemCount, isArchived }: QuoteStatusMessageProps) {
  const text = pickMessage(status, itemCount, isArchived)

  return (
    <p className="text-sm text-sage-700 bg-sage-50 border border-sage-100 rounded-md px-4 py-2.5 mb-6">
      {text}
    </p>
  )
}

function pickMessage(status: string | null, itemCount: number, isArchived: boolean): string {
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
  return 'This quote is still being prepared. Review details before sending.'
}
