// Phase H — Twilio SMS helper.
//
// Server-only — pulls auth from env vars (TWILIO_ACCOUNT_SID +
// TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER). Never exposes the auth
// token to the browser. Uses the REST API directly via fetch so we
// don't need to take on the Twilio SDK as a dependency for the one
// endpoint we hit.

export interface TwilioConfigStatus {
  configured: boolean
  /** Per-var presence so the settings UI can flag exactly what's
   *  missing without exposing values. */
  has_account_sid: boolean
  has_auth_token: boolean
  has_from_number: boolean
}

export function getTwilioConfigStatus(): TwilioConfigStatus {
  const sid    = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token  = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from   = process.env.TWILIO_FROM_NUMBER?.trim()
  return {
    configured: !!sid && !!token && !!from,
    has_account_sid: !!sid,
    has_auth_token:  !!token,
    has_from_number: !!from,
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
  const from   = process.env.TWILIO_FROM_NUMBER?.trim()

  if (!sid || !token || !from) {
    return { ok: false, error: 'Twilio not configured (missing env vars).' }
  }
  if (!to.trim())   return { ok: false, error: 'Recipient phone number is required.' }
  if (!body.trim()) return { ok: false, error: 'Message body is required.' }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`

  const form = new URLSearchParams()
  form.set('To',   to.trim())
  form.set('From', from)
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
