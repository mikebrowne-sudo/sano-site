import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return stripeInstance
}

/**
 * Which Stripe account the current key talks to.
 *
 * A `sk_test_` key produces a checkout that ONLY accepts Stripe's test cards and
 * declines every real one. It is indistinguishable from a working setup until a
 * customer tries to pay and fails — which is exactly what happened here: card
 * payment sat live for months with a test key and never took a cent, because
 * nothing surfaced the mode anywhere.
 *
 * 'unconfigured' means no key at all.
 */
export type StripeMode = 'live' | 'test' | 'unconfigured'

export function getStripeMode(secretKey = process.env.STRIPE_SECRET_KEY): StripeMode {
  const key = (secretKey ?? '').trim()
  if (!key) return 'unconfigured'
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live'
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test'
  // An unrecognised prefix is NOT assumed to be live — treating a malformed key
  // as production would be the more expensive mistake.
  return 'unconfigured'
}

/** True when a real customer card can actually be charged. */
export function canTakeRealPayments(secretKey = process.env.STRIPE_SECRET_KEY): boolean {
  return getStripeMode(secretKey) === 'live'
}

/** Operator-facing explanation of why card payment is not working, or null. */
export function stripeModeWarning(secretKey = process.env.STRIPE_SECRET_KEY): string | null {
  switch (getStripeMode(secretKey)) {
    case 'live':
      return null
    case 'test':
      return 'Stripe is in TEST mode — the Pay button works, but real customer cards will be declined. Swap STRIPE_SECRET_KEY to the sk_live_ key (and STRIPE_WEBHOOK_SECRET to the live endpoint’s signing secret) to take real payments.'
    case 'unconfigured':
      return 'Stripe is not configured — the Pay button will not work. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.'
  }
}
