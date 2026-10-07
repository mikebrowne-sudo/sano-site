/**
 * Sano campaign reply detector — Google Apps Script.
 *
 * Runs in carol@sano.nz's Google Workspace on a 5-minute timer. Finds new
 * replies to campaign emails and POSTs them to the Sano webhook, which marks the
 * lead as "responded" and stops the follow-up. See reply-auto-detection.md.
 *
 * Setup:
 *   1. Set WEBHOOK_URL and FORWARDER_SECRET below (secret must match the
 *      RESEND_FORWARDER_SECRET env var in Netlify).
 *   2. Run processReplies() once, approve the Gmail permission prompt.
 *   3. Add a time-driven trigger: processReplies, every 5 minutes.
 */

// ── Config ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://sano.nz/api/campaigns/resend-webhook'
const FORWARDER_SECRET = 'PASTE_THE_SAME_SECRET_AS_NETLIFY'

// Only look at recent mail so the search stays fast. Replies older than this are
// assumed already handled (or manually marked).
const LOOKBACK_DAYS = 14
const PROCESSED_LABEL = 'campaign-reply-processed'

// The from-address campaign email is sent as. Replies to campaigns land in this
// mailbox; we only treat inbound (not sent) messages as replies.
const CAMPAIGN_FROM = 'carol@sano.nz'

// ── Main ────────────────────────────────────────────────────────────────────
function processReplies() {
  const label = getOrCreateLabel_(PROCESSED_LABEL)

  // Threads Carol sent that have a reply, in the lookback window, not yet
  // processed. `from:me` scopes to threads Carol started (the campaign sends).
  const query =
    'from:' + CAMPAIGN_FROM +
    ' newer_than:' + LOOKBACK_DAYS + 'd' +
    ' -label:' + PROCESSED_LABEL +
    ' has:nouserlabels' // cheap pre-filter; real check is per-thread below

  // Use a broader, reliable query: threads Carol participated in with inbound replies.
  const threads = GmailApp.search(
    'from:' + CAMPAIGN_FROM + ' newer_than:' + LOOKBACK_DAYS + 'd -label:' + PROCESSED_LABEL,
    0, 50
  )

  let sent = 0
  for (const thread of threads) {
    const messages = thread.getMessages()

    // A reply exists if any message in the thread is NOT from Carol (i.e. inbound).
    const replies = messages.filter(function (m) {
      const from = (m.getFrom() || '').toLowerCase()
      return from.indexOf(CAMPAIGN_FROM) === -1
    })
    if (replies.length === 0) continue

    // Use the most recent inbound reply.
    const reply = replies[replies.length - 1]
    const payload = buildPayload_(reply)
    if (!payload) continue

    try {
      postReply_(payload)
      thread.addLabel(label)
      sent++
    } catch (err) {
      // Leave the thread unlabelled so the next run retries it.
      Logger.log('Failed to post reply for thread: ' + err)
    }
  }
  Logger.log('processReplies: posted ' + sent + ' repl' + (sent === 1 ? 'y' : 'ies'))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build the webhook JSON from a Gmail reply message. */
function buildPayload_(message) {
  const raw = message.getRawContent()
  const inReplyTo = extractHeader_(raw, 'In-Reply-To')
  const references = extractHeader_(raw, 'References')
  const from = parseEmail_(message.getFrom())
  if (!from) return null

  return {
    from: from,
    in_reply_to: inReplyTo || '',
    references: references || '',
    subject: message.getSubject() || '',
  }
}

/** POST to the webhook with the shared-secret header. Throws on non-2xx. */
function postReply_(payload) {
  const res = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-forwarder-secret': FORWARDER_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })
  const code = res.getResponseCode()
  if (code < 200 || code >= 300) {
    throw new Error('webhook returned ' + code + ': ' + res.getContentText())
  }
}

/** Pull a single header value out of a raw RFC822 message (first match). */
function extractHeader_(raw, name) {
  // Header lines can fold across multiple lines; join continuation lines.
  const re = new RegExp('^' + name + ':\\s*([\\s\\S]*?)(?=\\r?\\n[^\\s])', 'im')
  const m = raw.match(re)
  return m ? m[1].replace(/\r?\n\s+/g, ' ').trim() : ''
}

/** Extract the bare email address from a "Name <email>" string. */
function parseEmail_(fromLine) {
  if (!fromLine) return ''
  const m = fromLine.match(/<([^>]+)>/)
  return (m ? m[1] : fromLine).trim().toLowerCase()
}

/** Get a Gmail label, creating it if it doesn't exist. */
function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name)
}
