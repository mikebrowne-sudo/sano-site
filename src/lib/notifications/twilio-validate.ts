// Phase H.5 — Twilio webhook signature validation.
//
// Twilio signs every webhook POST with HMAC-SHA1 using your account
// auth token. The signed string is the exact URL Twilio is hitting,
// followed by each form param's key + value concatenated in
// alphabetical order by key. The base64-encoded signature is sent in
// the `X-Twilio-Signature` header.
//
// Algorithm reference:
//   https://www.twilio.com/docs/usage/webhooks/webhooks-security

import crypto from 'crypto'

export function validateTwilioSignature(args: {
  authToken: string
  signatureHeader: string | null
  url: string
  params: Record<string, string>
}): boolean {
  if (!args.signatureHeader) return false

  const sortedKeys = Object.keys(args.params).sort()
  let data = args.url
  for (const key of sortedKeys) {
    data += key + args.params[key]
  }

  const expected = crypto
    .createHmac('sha1', args.authToken)
    .update(data, 'utf-8')
    .digest('base64')

  if (expected.length !== args.signatureHeader.length) return false

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(args.signatureHeader),
    )
  } catch {
    return false
  }
}
