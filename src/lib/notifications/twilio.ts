// Phase H — Twilio SMS helper.
//
// Server-only — pulls auth from env vars. Never exposes the auth
// token to the browser. Uses the REST API directly via fetch so we
// don't need to take on the Twilio SDK as a dependency for the one
// endpoint we hit.
//
// Sender: TWILIO_MESSAGING_SERVICE_SID is preferred (lets Twilio
// pool numbers + handle compliance routing). TWILIO_FROM_NUMBER is
// the fallback for direct-from-a-single-number sends. Either one
// is sufficient — having both is fine and the messaging service
// wins.

export interface TwilioConfigStatus {
  /** Convenience flag: true when SID + token + at least one
   *  sender (messaging service or from number) are present. */
  configured: boolean
  /** Per-var presence so the settings UI can flag exactly what's
   *  missing without exposing values. */
  has_account_sid: boolean
  has_auth_token: boolean
  has_messaging_service_sid: boolean
  has_from_number: boolean
  /** True when at least one of the two senders is configured. */
  has_sender: boolean
}

export function getTwilioConfigStatus(): TwilioConfigStatus {
  const sid    = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token  = process.env.TWILIO_AUTH_TOKEN?.trim()
  const msgSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  const from   = process.env.TWILIO_FROM_NUMBER?.trim()
  const hasSender = !!msgSid || !!from
  return {
    configured: !!sid && !!token && hasSender,
    has_account_sid: !!sid,
    has_auth_token:  !!token,
    has_messaging_service_sid: !!msgSid,
    has_from_number: !!from,
    has_sender: hasSender,
  }
}

export function isTwilioConfigured(): boolean {
  return getTwilioConfigStatus().configured
}

export interface SendTwilioSmsInput {
  to: string
  body: string
}

export interface SendTwilioSmsResult {
  ok: boolean
  /** Twilio message SID when send succeeds. */
  message_id?: string
  /** Provider-side error string. Sanitised: doesn't include
   *  secrets. */
  error?: string
}

/**
 * Send an SMS via Twilio. Returns a structured result; never
 * throws so callers can log uniformly without try/catch.
 */
export async function sendTwilioSms(input: SendTwilioSmsInput): Promise<SendTwilioSmsResult> {
  const { to, body } = input
  const sid    = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token  = process.env.TWILIO_AUTH_TOKEN?.trim()
  const msgSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  const from   = process.env.TWILIO_FROM_NUMBER?.trim()

  if (!sid || !token) {
    return { ok: false, error: 'Twilio not configured (missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN).' }
  }
  if (!msgSid && !from) {
    return { ok: false, error: 'Twilio sender not configured (set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER).' }
  }
  if (!to.trim())   return { ok: false, error: 'Recipient phone number is required.' }
  if (!body.trim()) return { ok: false, error: 'Message body is required.' }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`

  // Sender precedence: Messaging Service wins. The two params are
  // mutually exclusive on Twilio's side — sending both is rejected.
  const form = new URLSearchParams()
  form.set('To', to.trim())
  if (msgSid) {
    form.set('MessagingServiceSid', msgSid)
  } else {
    form.set('From', from!)
  }
  form.set('Body', body)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      // Hard timeout safety net — Twilio is usually <2s but we
      // don't want stuck fetches blocking server actions.
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      // Twilio returns JSON for errors. Pull message + code only;
      // never log auth headers.
      let detail = ''
      try {
        const j = (await res.json()) as { message?: string; code?: number }
        detail = `${j.code ? `[${j.code}] ` : ''}${j.message ?? ''}`.trim()
      } catch {
        detail = `HTTP ${res.status}`
      }
      return { ok: false, error: detail || `Twilio error (HTTP ${res.status})` }
    }

    const j = (await res.json()) as { sid?: string }
    return { ok: true, message_id: j.sid }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error'
    return { ok: false, error: message }
  }
}
