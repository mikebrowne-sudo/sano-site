// Phase H.5 — Inbound SMS keyword classification + canned reply bodies.
//
// Twilio Messaging Services already block outbound sends to a number
// once the carrier sees a STOP keyword — that is the regulatory
// guarantee. We additionally record the opt-out in our own DB so:
//
//   1. The portal can surface "this client opted out" without round-
//      tripping to Twilio.
//   2. `sendNotification`'s opt-out gate can short-circuit before
//      ever calling Twilio for an opted-out client (extra safety on
//      manual sends, contractor "On my way" mis-targets, etc.).
//
// Keyword sets follow Twilio's documented compliance behaviour. We
// match exact-token only (case-insensitive, trimmed) to avoid false
// positives on conversational replies like "please stop scheduling
// before 8am".

const STOP_KEYWORDS = new Set([
  'STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT',
])

const HELP_KEYWORDS = new Set([
  'HELP', 'INFO',
])

export type InboundClassification =
  | { kind: 'stop'; keyword: string }
  | { kind: 'help'; keyword: string }
  | { kind: 'other' }

export function classifyInbound(rawBody: string | null | undefined): InboundClassification {
  if (!rawBody) return { kind: 'other' }
  const trimmed = rawBody.trim().toUpperCase()
  if (STOP_KEYWORDS.has(trimmed)) {
    return { kind: 'stop', keyword: trimmed }
  }
  if (HELP_KEYWORDS.has(trimmed)) {
    return { kind: 'help', keyword: trimmed }
  }
  return { kind: 'other' }
}

// One-way operational SMS only. We don't direct customers to an SMS
// opt-out keyword because reliable inbound replies aren't supported on
// the current US long-code sender to NZ mobiles. Email is the
// authoritative opt-out path.
const HELP_REPLY_BODY =
  'Sano: For help, email hello@sano.nz or call 0800 726 686. To opt out of SMS updates, email hello@sano.nz.'

export function helpReplyBody(): string {
  return HELP_REPLY_BODY
}

/**
 * Build a TwiML response. Twilio expects `text/xml`. Pass `null` to
 * acknowledge with an empty <Response/> (no reply sent).
 */
export function twimlResponse(messageBody: string | null): string {
  if (!messageBody) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response/>'
  }
  const escaped = messageBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}
